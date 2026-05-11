// Email digest aggregator. Each "trigger" maps to a queue of pending digests in
// the `email_aggregations` D1 table. enqueueAggregation collapses concurrent
// events into a single row; the cron handler (every 15min) flushes rows whose
// scheduled_at <= now by rendering the digest and calling sendEmail.
//
// Concurrent enqueue safety: only one pending row per trigger ever exists, so
// merging is a single UPDATE against that row (no race window between SELECT
// and UPDATE that could create duplicate pending rows for the same trigger).
// Window: 30 min from FIRST submission in the batch — subsequent submissions
// fall into the same window.

import { and, asc, eq, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { emailAggregations } from "../db/schema";
import type { Env } from "../custom-env";
import { renderGallerySubmissionDigest } from "./email-triggers/gallery-submission-notify";
import { EmailSendError, sendEmail } from "./email";

export const DEFAULT_AGGREGATION_WINDOW_MS = 30 * 60 * 1000;
const FLUSH_BATCH_SIZE = 50;

export interface GallerySubmissionEntry {
  submission_id: number;
  nickname: string;
  caption: string | null;
  event_slug: string | null;
  thumbnail_url: string;
  submitted_iso: string;
}

export interface GallerySubmissionDigestPayload {
  trigger: "gallery-submission-notify";
  entries: GallerySubmissionEntry[];
  pending_total: number;
}

// Generic payload validated to GallerySubmissionDigestPayload-shape for now.
// Future triggers add their own discriminator.
function safeParseGalleryPayload(
  json: string,
): GallerySubmissionDigestPayload | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.trigger !== "gallery-submission-notify") return null;
    if (!Array.isArray(obj.entries)) return null;
    if (typeof obj.pending_total !== "number") return null;
    const entries: GallerySubmissionEntry[] = [];
    for (const raw of obj.entries) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      if (typeof e.submission_id !== "number") continue;
      if (typeof e.nickname !== "string") continue;
      if (typeof e.thumbnail_url !== "string") continue;
      if (typeof e.submitted_iso !== "string") continue;
      entries.push({
        submission_id: e.submission_id,
        nickname: e.nickname,
        caption: typeof e.caption === "string" ? e.caption : null,
        event_slug: typeof e.event_slug === "string" ? e.event_slug : null,
        thumbnail_url: e.thumbnail_url,
        submitted_iso: e.submitted_iso,
      });
    }
    return {
      trigger: "gallery-submission-notify",
      entries,
      pending_total: obj.pending_total,
    };
  } catch {
    return null;
  }
}

/**
 * Enqueue a gallery-submission digest entry. If a pending row already exists
 * for this trigger, the entry is appended (de-duplicated by submission_id) and
 * scheduled_at is the MIN of existing and (now + 30min) so the original window
 * is preserved.
 */
export async function enqueueGallerySubmissionDigest(
  env: Env,
  entry: GallerySubmissionEntry,
  pendingTotal: number,
  windowMs: number = DEFAULT_AGGREGATION_WINDOW_MS,
  nowMs: number = Date.now(),
): Promise<void> {
  const db = getDb(env);
  const trigger = "gallery-submission-notify";
  const nowSec = Math.floor(nowMs / 1000);
  const dueSec = Math.floor((nowMs + windowMs) / 1000);

  const existing = await db
    .select()
    .from(emailAggregations)
    .where(
      and(
        eq(emailAggregations.trigger, trigger),
        eq(emailAggregations.status, "pending"),
      ),
    )
    .orderBy(asc(emailAggregations.scheduledAt))
    .limit(1)
    .get();

  if (existing) {
    const parsed = safeParseGalleryPayload(existing.payload);
    const prevEntries = parsed?.entries ?? [];
    const merged: GallerySubmissionEntry[] = [
      ...prevEntries.filter((e) => e.submission_id !== entry.submission_id),
      entry,
    ];
    const nextPayload: GallerySubmissionDigestPayload = {
      trigger: "gallery-submission-notify",
      entries: merged,
      pending_total: pendingTotal,
    };
    const nextScheduled = Math.min(existing.scheduledAt, dueSec);
    await db
      .update(emailAggregations)
      .set({
        payload: JSON.stringify(nextPayload),
        scheduledAt: nextScheduled,
      })
      .where(eq(emailAggregations.id, existing.id))
      .run();
    return;
  }

  const payload: GallerySubmissionDigestPayload = {
    trigger: "gallery-submission-notify",
    entries: [entry],
    pending_total: pendingTotal,
  };
  await db
    .insert(emailAggregations)
    .values({
      trigger,
      scheduledAt: dueSec,
      payload: JSON.stringify(payload),
      status: "pending",
      createdAt: nowSec,
    })
    .run();
}

/**
 * Flush all aggregation rows whose scheduled_at <= now. Each is rendered to
 * a digest email and sent via Resend. Successes mark status='sent'; failures
 * mark status='failed' — the cron retries on the next tick (status='pending'
 * is the queue gate, so failed rows are NOT retried until manually re-queued).
 *
 * Returns counts useful for cron telemetry.
 */
export async function flushDueAggregations(
  env: Env,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<{ sent: number; failed: number; skipped: number }> {
  const db = getDb(env);
  const rows = await db
    .select()
    .from(emailAggregations)
    .where(
      and(
        eq(emailAggregations.status, "pending"),
        lte(emailAggregations.scheduledAt, nowSec),
      ),
    )
    .orderBy(asc(emailAggregations.scheduledAt))
    .limit(FLUSH_BATCH_SIZE)
    .all();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.trigger !== "gallery-submission-notify") {
      skipped += 1;
      continue;
    }
    const payload = safeParseGalleryPayload(row.payload);
    if (!payload || payload.entries.length === 0) {
      await db
        .update(emailAggregations)
        .set({
          status: "failed",
          sentAt: nowSec,
          error: "empty_or_invalid_payload",
        })
        .where(eq(emailAggregations.id, row.id))
        .run();
      failed += 1;
      continue;
    }

    const recipient = env.ADMIN_NOTIFICATION_EMAIL;
    if (!recipient || !env.RESEND_API_KEY) {
      console.warn("email_aggregator", {
        op: "flush",
        skip_reason: "missing_recipient_or_api_key",
        row_id: row.id,
        trigger: row.trigger,
      });
      // Mark superseded — operator should set env then re-enqueue manually.
      await db
        .update(emailAggregations)
        .set({
          status: "superseded",
          sentAt: nowSec,
          error: "missing_recipient_or_api_key",
        })
        .where(eq(emailAggregations.id, row.id))
        .run();
      skipped += 1;
      continue;
    }

    const digest = renderGallerySubmissionDigest(payload);
    try {
      await sendEmail(env, {
        to: recipient,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
        actor: "cron.gallery-aggregator",
        tags: [{ name: "trigger", value: "gallery-submission-notify" }],
      });
      await db
        .update(emailAggregations)
        .set({ status: "sent", sentAt: nowSec, error: null })
        .where(eq(emailAggregations.id, row.id))
        .run();
      sent += 1;
    } catch (err) {
      const code =
        err instanceof EmailSendError
          ? err.code
          : err instanceof Error
            ? err.message
            : "unknown";
      await db
        .update(emailAggregations)
        .set({ status: "failed", sentAt: nowSec, error: code })
        .where(eq(emailAggregations.id, row.id))
        .run();
      failed += 1;
      console.error("email_aggregator", {
        op: "flush_send_failed",
        row_id: row.id,
        trigger: row.trigger,
        error: code,
      });
    }
  }

  return { sent, failed, skipped };
}
