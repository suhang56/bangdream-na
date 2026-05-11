import { Hono, type Context } from "hono";
import { and, count, desc, eq, gte, lt, or } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { requireAdmin } from "../auth/middleware";
import { getDb } from "../db/client";
import { events, galleryItems, gallerySubmissions } from "../db/schema";
import { respondAdmin } from "../utils/respond";
import {
  gallerySubmissionApprove,
  gallerySubmissionIdParam,
  gallerySubmissionListQuery,
  gallerySubmissionReject,
} from "../utils/validate";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

type AdminErrorStatus = 400 | 401 | 403 | 404 | 409 | 500;

function adminError(
  c: AppContext,
  status: AdminErrorStatus,
  error: string,
  detail?: unknown,
): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  const body: Record<string, unknown> = { error };
  if (detail !== undefined) body.detail = detail;
  return c.json(body, status);
}

function decodeCursor(raw: string | undefined): { submittedAt: number; id: number } | null {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length !== 2) return null;
  const submittedAt = Number(parts[0]);
  const id = Number(parts[1]);
  if (!Number.isInteger(submittedAt) || !Number.isInteger(id)) return null;
  if (submittedAt < 0 || id <= 0) return null;
  return { submittedAt, id };
}

interface JoinedSubmissionRow {
  id: number;
  r2_key: string;
  nickname: string;
  caption: string | null;
  event_id: number | null;
  event_slug: string | null;
  event_title_zh: string | null;
  event_label: string | null;
  taken_on: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: number;
  ip_hash: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  content_type: string;
  reviewed_at: number | null;
  rejection_reason: string | null;
  gallery_item_id: number | null;
}

type EventField =
  | { id: number; slug: string | null; title_zh: string | null }
  | { label: string; verified: false }
  | null;

function toItem(row: JoinedSubmissionRow, cdnOrigin: string) {
  let eventField: EventField;
  if (row.event_id != null) {
    eventField = {
      id: row.event_id,
      slug: row.event_slug ?? null,
      title_zh: row.event_title_zh ?? null,
    };
  } else if (row.event_label != null) {
    eventField = { label: row.event_label, verified: false };
  } else {
    eventField = null;
  }
  return {
    id: row.id,
    thumbnail_url: `${cdnOrigin}/${row.r2_key}`,
    r2_key: row.r2_key,
    nickname: row.nickname,
    caption: row.caption,
    event: eventField,
    taken_on: row.taken_on,
    status: row.status,
    submitted_at: row.submitted_at,
    ip_hash: row.ip_hash,
    width: row.width,
    height: row.height,
    size_bytes: row.size_bytes,
    content_type: row.content_type,
    reviewed_at: row.reviewed_at,
    rejection_reason: row.rejection_reason,
    gallery_item_id: row.gallery_item_id,
  };
}

export function buildAdminGallerySubmissionsRoutes() {
  const router = new Hono<AppType>();

  router.use("*", requireAdmin);

  // GET /api/admin/gallery/submissions?status=pending&cursor=&limit=
  router.get("/", async (c) => {
    const parsed = gallerySubmissionListQuery.safeParse({
      status: c.req.query("status"),
      cursor: c.req.query("cursor"),
      limit: c.req.query("limit"),
    });
    if (!parsed.success) {
      return adminError(c, 400, "bad_request", parsed.error.flatten());
    }
    const { status, cursor, limit } = parsed.data;
    const decoded = decodeCursor(cursor);
    const db = getDb(c.env);

    const filters = [eq(gallerySubmissions.status, status)];
    if (decoded) {
      // Keyset: (submitted_at, id) < (cursorTs, cursorId), strictly less so
      // we don't duplicate the cursor row.
      filters.push(
        or(
          lt(gallerySubmissions.submittedAt, decoded.submittedAt),
          and(
            eq(gallerySubmissions.submittedAt, decoded.submittedAt),
            lt(gallerySubmissions.id, decoded.id),
          ),
        )!,
      );
    }

    const rows = (await db
      .select({
        id: gallerySubmissions.id,
        r2_key: gallerySubmissions.r2Key,
        nickname: gallerySubmissions.nickname,
        caption: gallerySubmissions.caption,
        event_id: gallerySubmissions.eventId,
        event_slug: events.slug,
        event_title_zh: events.titleZh,
        event_label: gallerySubmissions.eventLabel,
        taken_on: gallerySubmissions.takenOn,
        status: gallerySubmissions.status,
        submitted_at: gallerySubmissions.submittedAt,
        ip_hash: gallerySubmissions.ipHash,
        width: gallerySubmissions.width,
        height: gallerySubmissions.height,
        size_bytes: gallerySubmissions.sizeBytes,
        content_type: gallerySubmissions.contentType,
        reviewed_at: gallerySubmissions.reviewedAt,
        rejection_reason: gallerySubmissions.rejectionReason,
        gallery_item_id: gallerySubmissions.galleryItemId,
      })
      .from(gallerySubmissions)
      .leftJoin(events, eq(gallerySubmissions.eventId, events.id))
      .where(and(...filters))
      .orderBy(desc(gallerySubmissions.submittedAt), desc(gallerySubmissions.id))
      .limit(limit)
      .all()) as JoinedSubmissionRow[];

    const items = rows.map((r) => toItem(r, c.env.CDN_ORIGIN));
    const last = rows.length === limit ? rows[rows.length - 1] : null;
    const next_cursor = last ? `${last.submitted_at}:${last.id}` : null;

    return respondAdmin(c, { items, next_cursor });
  });

  // GET /api/admin/gallery/submissions/stats
  router.get("/stats", async (c) => {
    const db = getDb(c.env);
    const dayCutoff = Math.floor(Date.now() / 1000) - 86400;
    const pending = await db
      .select({ n: count() })
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.status, "pending"))
      .get();
    const approved24h = await db
      .select({ n: count() })
      .from(gallerySubmissions)
      .where(
        and(
          eq(gallerySubmissions.status, "approved"),
          gte(gallerySubmissions.submittedAt, dayCutoff),
        ),
      )
      .get();
    const rejected24h = await db
      .select({ n: count() })
      .from(gallerySubmissions)
      .where(
        and(
          eq(gallerySubmissions.status, "rejected"),
          gte(gallerySubmissions.submittedAt, dayCutoff),
        ),
      )
      .get();
    c.header("Cache-Control", "private, max-age=30");
    c.header("Vary", "Origin");
    return c.json(
      {
        pending: pending?.n ?? 0,
        approved_24h: approved24h?.n ?? 0,
        rejected_24h: rejected24h?.n ?? 0,
      },
      200,
    );
  });

  // POST /api/admin/gallery/submissions/:id/approve
  router.post("/:id/approve", async (c) => {
    const idParsed = gallerySubmissionIdParam.safeParse({
      id: c.req.param("id"),
    });
    if (!idParsed.success) return adminError(c, 400, "bad_request");
    const submissionId = idParsed.data.id;

    let body: { sort_order?: number } = {};
    try {
      const raw = await c.req.json().catch(() => ({}));
      const parsed = gallerySubmissionApprove.safeParse(raw);
      if (parsed.success) body = parsed.data;
    } catch {
      // empty body ok
    }

    const db = getDb(c.env);
    const row = await db
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, submissionId))
      .get();
    if (!row) return adminError(c, 404, "not_found");
    if (row.status !== "pending") {
      return adminError(c, 409, "already_reviewed", { status: row.status });
    }

    const oldKey = row.r2Key;
    // Strip the `submissions/` prefix, keep the uuid+ext.
    const tail = oldKey.startsWith("submissions/")
      ? oldKey.slice("submissions/".length)
      : oldKey;
    const newKey = `gallery/${tail}`;

    let pendingBody: ArrayBuffer;
    try {
      const getRes = await c.env.IMAGES.get(oldKey);
      if (!getRes) {
        return adminError(c, 500, "r2_read_failed", { reason: "object_missing" });
      }
      pendingBody = await getRes.arrayBuffer();
    } catch (err) {
      console.error("gallery.approve.r2_read_failed", err);
      return adminError(c, 500, "r2_read_failed");
    }

    try {
      await c.env.IMAGES.put(newKey, pendingBody, {
        httpMetadata: {
          contentType: row.contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    } catch (err) {
      console.error("gallery.approve.r2_write_failed", err);
      return adminError(c, 500, "r2_write_failed");
    }

    let galleryItemId: number;
    try {
      const user = c.get("user")!;
      const now = Math.floor(Date.now() / 1000);
      const inserted = await db
        .insert(galleryItems)
        .values({
          imageUrl: `${c.env.CDN_ORIGIN}/${newKey}`,
          caption: row.caption,
          takenAt: row.submittedAt,
          eventId: row.eventId,
          // Without event_id, derive an album bucket so the CHECK constraint
          // (event_id IS NOT NULL OR album IS NOT NULL) is satisfied.
          album: row.eventId ? null : "submissions",
          // 0009: back-pointer so future surfaces can JOIN to fetch the
          // free-form event_label (kept on gallery_submissions, not copied).
          submissionId: submissionId,
          sortOrder: body.sort_order ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: galleryItems.id })
        .get();
      galleryItemId = inserted.id;
      // TODO(R10+): admin manual bind UI -- modal lists events, picks one,
      //   UPDATE gallery_submissions SET event_id=?, event_label=NULL WHERE id=?;
      //   then UPDATE gallery_items SET event_id=?, album=NULL WHERE submission_id=?.
      //   This PR ships the schema seam (submission_id FK + event_label column);
      //   the editor UI follows in a separate slice.
      await db
        .update(gallerySubmissions)
        .set({
          status: "approved",
          r2Key: newKey,
          reviewedBy: user.id,
          reviewedAt: now,
          galleryItemId,
        })
        .where(eq(gallerySubmissions.id, submissionId))
        .run();
    } catch (err) {
      console.error("gallery.approve.d1_failed", err);
      // Roll back new R2 key so we don't leak storage on D1 failure.
      try {
        await c.env.IMAGES.delete(newKey);
      } catch (delErr) {
        console.error("gallery.approve.r2_rollback_failed", delErr);
      }
      return adminError(c, 500, "submission_failed");
    }

    try {
      await c.env.IMAGES.delete(oldKey);
    } catch (err) {
      console.warn("gallery.approve.r2_old_delete_failed", err);
    }

    console.log("gallery.approve", {
      op: "gallery.approve",
      submission_id: submissionId,
      gallery_item_id: galleryItemId,
      reviewer_id: c.get("user")!.id,
    });

    return respondAdmin(c, {
      submission_id: submissionId,
      gallery_item_id: galleryItemId,
      new_r2_key: newKey,
    });
  });

  // POST /api/admin/gallery/submissions/:id/reject
  router.post("/:id/reject", async (c) => {
    const idParsed = gallerySubmissionIdParam.safeParse({
      id: c.req.param("id"),
    });
    if (!idParsed.success) return adminError(c, 400, "bad_request");
    const submissionId = idParsed.data.id;

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return adminError(c, 400, "bad_request", { reason: "invalid_json" });
    }
    const parsed = gallerySubmissionReject.safeParse(raw);
    if (!parsed.success) {
      return adminError(c, 400, "bad_request", parsed.error.flatten());
    }
    const reason = parsed.data.reason.trim();
    if (reason.length === 0) {
      return adminError(c, 400, "bad_request", { reason: "empty_after_trim" });
    }

    const db = getDb(c.env);
    const row = await db
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, submissionId))
      .get();
    if (!row) return adminError(c, 404, "not_found");
    if (row.status !== "pending") {
      return adminError(c, 409, "already_reviewed", { status: row.status });
    }

    try {
      await c.env.IMAGES.delete(row.r2Key);
    } catch (err) {
      console.warn("gallery.reject.r2_delete_failed", err);
    }

    const user = c.get("user")!;
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(gallerySubmissions)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedBy: user.id,
        reviewedAt: now,
      })
      .where(eq(gallerySubmissions.id, submissionId))
      .run();

    console.log("gallery.reject", {
      op: "gallery.reject",
      submission_id: submissionId,
      reviewer_id: user.id,
    });

    return respondAdmin(c, {
      submission_id: submissionId,
      status: "rejected" as const,
    });
  });

  return router;
}

