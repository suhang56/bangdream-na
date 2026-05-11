import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db/client";
import { emailAggregations } from "../db/schema";
import {
  DEFAULT_AGGREGATION_WINDOW_MS,
  enqueueGallerySubmissionDigest,
  flushDueAggregations,
} from "./email-aggregator";
import * as emailModule from "./email";

function entry(id: number, overrides: Partial<{
  nickname: string;
  caption: string | null;
  event_slug: string | null;
}> = {}) {
  return {
    submission_id: id,
    nickname: overrides.nickname ?? `user${id}`,
    caption: overrides.caption === undefined ? `caption ${id}` : overrides.caption,
    event_slug: overrides.event_slug === undefined ? null : overrides.event_slug,
    thumbnail_url: `https://cdn.example.org/submissions/${id}.jpg`,
    submitted_iso: "2026-05-10T12:00:00Z",
  };
}

beforeEach(async () => {
  await getDb(env).delete(emailAggregations).run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("enqueueGallerySubmissionDigest", () => {
  it("creates a new pending row when none exists for the trigger", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("pending");
    expect(rows[0].trigger).toBe("gallery-submission-notify");
    expect(rows[0].scheduledAt).toBe(
      Math.floor((now + DEFAULT_AGGREGATION_WINDOW_MS) / 1000),
    );
    const parsed = JSON.parse(rows[0].payload) as {
      entries: { submission_id: number }[];
      pending_total: number;
    };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].submission_id).toBe(1);
    expect(parsed.pending_total).toBe(1);
  });

  it("merges into existing pending row when one already exists", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    await enqueueGallerySubmissionDigest(env, entry(2), 2, undefined, now + 1000);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows).toHaveLength(1);
    const parsed = JSON.parse(rows[0].payload) as {
      entries: { submission_id: number }[];
      pending_total: number;
    };
    expect(parsed.entries.map((e) => e.submission_id).sort()).toEqual([1, 2]);
    expect(parsed.pending_total).toBe(2);
  });

  it("preserves the earlier scheduled_at on merge (does not reset window)", async () => {
    const now1 = 1_715_000_000_000;
    const now2 = now1 + 5 * 60 * 1000; // 5 min later
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now1);
    const firstSched = Math.floor((now1 + DEFAULT_AGGREGATION_WINDOW_MS) / 1000);
    await enqueueGallerySubmissionDigest(env, entry(2), 2, undefined, now2);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows[0].scheduledAt).toBe(firstSched);
  });

  it("deduplicates by submission_id on re-enqueue of same submission", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1, { nickname: "alice" }), 1, undefined, now);
    await enqueueGallerySubmissionDigest(env, entry(1, { nickname: "alice-edited" }), 1, undefined, now + 100);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows).toHaveLength(1);
    const parsed = JSON.parse(rows[0].payload) as {
      entries: { submission_id: number; nickname: string }[];
    };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].nickname).toBe("alice-edited");
  });

  it("collapses 5 concurrent enqueues into a single row (sequential simulation)", async () => {
    const now = 1_715_000_000_000;
    for (let i = 1; i <= 5; i += 1) {
      await enqueueGallerySubmissionDigest(env, entry(i), i, undefined, now + i);
    }
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows).toHaveLength(1);
    const parsed = JSON.parse(rows[0].payload) as {
      entries: { submission_id: number }[];
    };
    expect(parsed.entries).toHaveLength(5);
  });

  it("creates a new row after the previous one transitions out of pending", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    const firstRow = (await getDb(env).select().from(emailAggregations).get())!;
    // Simulate cron having sent it.
    await getDb(env)
      .update(emailAggregations)
      .set({ status: "sent" })
      .where(eq(emailAggregations.id, firstRow.id))
      .run();
    await enqueueGallerySubmissionDigest(env, entry(2), 1, undefined, now + 60_000);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows).toHaveLength(2);
    const pending = rows.find((r) => r.status === "pending")!;
    const parsed = JSON.parse(pending.payload) as {
      entries: { submission_id: number }[];
    };
    expect(parsed.entries.map((e) => e.submission_id)).toEqual([2]);
  });
});

describe("flushDueAggregations", () => {
  it("skips rows whose scheduled_at is in the future", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    // Now is BEFORE scheduled_at.
    const result = await flushDueAggregations(env, Math.floor(now / 1000));
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("marks rows superseded when ADMIN_NOTIFICATION_EMAIL is missing", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    const dueSec = Math.floor((now + DEFAULT_AGGREGATION_WINDOW_MS + 1000) / 1000);
    const envNoAdmin = { ...env, ADMIN_NOTIFICATION_EMAIL: undefined } as typeof env;
    const result = await flushDueAggregations(envNoAdmin, dueSec);
    expect(result.skipped).toBe(1);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows[0].status).toBe("superseded");
  });

  it("sends digest and marks sent when due and email succeeds", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1, { event_slug: "afterglow-tour" }), 1, undefined, now);
    const dueSec = Math.floor((now + DEFAULT_AGGREGATION_WINDOW_MS + 1000) / 1000);
    const sendSpy = vi
      .spyOn(emailModule, "sendEmail")
      .mockResolvedValue({ messageId: "m1", resendRequestId: "r1", durationMs: 50 });
    const envWithAdmin = {
      ...env,
      ADMIN_NOTIFICATION_EMAIL: "ops@bangdream.org",
    } as typeof env;
    const result = await flushDueAggregations(envWithAdmin, dueSec);
    expect(result.sent).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const sentCall = sendSpy.mock.calls[0][1];
    expect(sentCall.to).toBe("ops@bangdream.org");
    expect(sentCall.subject).toContain("新照片待审核");
    expect(sentCall.html).toContain("afterglow-tour");
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows[0].status).toBe("sent");
  });

  it("marks failed when sendEmail throws EmailSendError", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 1, undefined, now);
    const dueSec = Math.floor((now + DEFAULT_AGGREGATION_WINDOW_MS + 1000) / 1000);
    vi.spyOn(emailModule, "sendEmail").mockRejectedValue(
      new emailModule.EmailSendError("RESEND_5XX", { status: 502 }),
    );
    const envWithAdmin = {
      ...env,
      ADMIN_NOTIFICATION_EMAIL: "ops@bangdream.org",
    } as typeof env;
    const result = await flushDueAggregations(envWithAdmin, dueSec);
    expect(result.failed).toBe(1);
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows[0].status).toBe("failed");
    expect(rows[0].error).toBe("RESEND_5XX");
  });

  it("renders batch digest when entries >1", async () => {
    const now = 1_715_000_000_000;
    await enqueueGallerySubmissionDigest(env, entry(1), 5, undefined, now);
    await enqueueGallerySubmissionDigest(env, entry(2), 5, undefined, now + 100);
    await enqueueGallerySubmissionDigest(env, entry(3), 5, undefined, now + 200);
    await enqueueGallerySubmissionDigest(env, entry(4), 5, undefined, now + 300);
    await enqueueGallerySubmissionDigest(env, entry(5), 5, undefined, now + 400);
    const dueSec = Math.floor((now + DEFAULT_AGGREGATION_WINDOW_MS + 1000) / 1000);
    const sendSpy = vi
      .spyOn(emailModule, "sendEmail")
      .mockResolvedValue({ messageId: "m1", resendRequestId: "r1", durationMs: 50 });
    const envWithAdmin = {
      ...env,
      ADMIN_NOTIFICATION_EMAIL: "ops@bangdream.org",
    } as typeof env;
    await flushDueAggregations(envWithAdmin, dueSec);
    const call = sendSpy.mock.calls[0][1];
    expect(call.subject).toMatch(/5 张照片待审核/);
    expect(call.html).toContain("还有 2 张");
  });
});
