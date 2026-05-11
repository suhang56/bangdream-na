import { Hono, type Context } from "hono";
import { and, count, eq, sql } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { getDb } from "../db/client";
import { events, gallerySubmissions } from "../db/schema";
import {
  ExifStripError,
  sniffMagicByte,
  stripExifAndExtractDimensions,
  type SupportedMime,
} from "../lib/exif-strip";
import {
  gallerySubmitRateLimit,
  hashIpForSubmission,
  hashUserAgent,
} from "../lib/rate-limit";
import { enqueueGallerySubmissionDigest } from "../lib/email-aggregator";
import { extensionForContentType } from "../utils/slug";
import { gallerySubmissionSchemas } from "../utils/validate";

const MAX_SUBMIT_BYTES = 8 * 1024 * 1024;
const MIN_DIMENSION_PX = 200;
const MAX_ASPECT_RATIO = 6;

const ALLOWED_MIMES: ReadonlySet<SupportedMime> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface AppVariablesWithRate extends AppVariables {
  ipHashForSubmission?: string;
}

type AppType = { Bindings: Env; Variables: AppVariablesWithRate };
type AppContext = Context<AppType>;

type SubmitErrorStatus = 400 | 401 | 413 | 415 | 429 | 500;

function publicError(
  c: AppContext,
  status: SubmitErrorStatus,
  error: string,
  detail?: unknown,
): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  const body: Record<string, unknown> = { error };
  if (detail !== undefined) body.detail = detail;
  return c.json(body, status);
}

export function buildGallerySubmitRoutes() {
  const router = new Hono<AppType>();

  router.post("/", gallerySubmitRateLimit, async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return publicError(c, 400, "invalid_multipart");
    }

    const fileEntry = form.get("file");
    const nicknameRaw = form.get("nickname");
    const captionRaw = form.get("caption");
    const eventIdRaw = form.get("event_id");
    const eventLabelRaw = form.get("event_label");
    const takenOnRaw = form.get("taken_on");
    const termsRaw = form.get("terms");

    if (!fileEntry || typeof fileEntry === "string") {
      return publicError(c, 400, "missing_file");
    }
    const file = fileEntry as File;
    const clientCt = (file.type || "").toLowerCase();

    if (!ALLOWED_MIMES.has(clientCt as SupportedMime)) {
      return publicError(c, 415, "unsupported_media_type", {
        allowed: Array.from(ALLOWED_MIMES),
        received: clientCt || null,
      });
    }
    if (file.size <= 0) {
      return publicError(c, 400, "empty_file");
    }
    if (file.size > MAX_SUBMIT_BYTES) {
      return publicError(c, 413, "payload_too_large", {
        maxBytes: MAX_SUBMIT_BYTES,
      });
    }

    if (typeof termsRaw !== "string" || termsRaw !== "true") {
      return publicError(c, 400, "bad_request", { detail: "terms_required" });
    }

    const nicknameParsed = gallerySubmissionSchemas.nickname.safeParse(
      typeof nicknameRaw === "string" ? nicknameRaw : "",
    );
    if (!nicknameParsed.success) {
      return publicError(c, 400, "bad_request", {
        field: "nickname",
        issues: nicknameParsed.error.flatten(),
      });
    }
    const nickname = nicknameParsed.data;

    let caption: string | null = null;
    if (typeof captionRaw === "string" && captionRaw.length > 0) {
      const capParsed = gallerySubmissionSchemas.caption.safeParse(captionRaw);
      if (!capParsed.success) {
        return publicError(c, 400, "bad_request", {
          field: "caption",
          issues: capParsed.error.flatten(),
        });
      }
      caption = capParsed.data ?? null;
    }

    // XOR mutex between event_id and event_label -- exactly one required now
    // that the activity field is mandatory. HC4: server side enforces alongside
    // client; defense in depth.
    const hasEventId =
      typeof eventIdRaw === "string" && eventIdRaw.length > 0;
    const hasEventLabel =
      typeof eventLabelRaw === "string" && eventLabelRaw.length > 0;

    if (hasEventId && hasEventLabel) {
      return publicError(c, 400, "bad_request", {
        field: "activity",
        detail: "mutex",
      });
    }
    if (!hasEventId && !hasEventLabel) {
      return publicError(c, 400, "bad_request", { field: "activity" });
    }

    let eventId: number | null = null;
    let eventLabel: string | null = null;

    if (hasEventId) {
      const parsed = Number(eventIdRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return publicError(c, 400, "bad_request", { field: "event_id" });
      }
      const db = getDb(c.env);
      const eventRow = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, parsed))
        .get();
      if (!eventRow) {
        return publicError(c, 400, "event_not_found", { event_id: parsed });
      }
      eventId = parsed;
    } else {
      const parsed = gallerySubmissionSchemas.eventLabel.safeParse(eventLabelRaw);
      if (!parsed.success) {
        return publicError(c, 400, "bad_request", {
          field: "event_label",
          issues: parsed.error.flatten(),
        });
      }
      eventLabel = parsed.data;
    }

    let takenOn: string | null = null;
    if (typeof takenOnRaw === "string" && takenOnRaw.length > 0) {
      const parsed = gallerySubmissionSchemas.takenOn.safeParse(takenOnRaw);
      if (!parsed.success) {
        return publicError(c, 400, "bad_request", {
          field: "taken_on",
          issues: parsed.error.flatten(),
        });
      }
      takenOn = parsed.data;
    }

    let rawBody: ArrayBuffer;
    try {
      rawBody = await file.arrayBuffer();
    } catch (err) {
      console.error("gallery.submit.file_read_failed", err);
      return publicError(c, 500, "submission_failed");
    }

    const sniffed = sniffMagicByte(rawBody);
    if (!sniffed || sniffed !== clientCt) {
      return publicError(c, 415, "unsupported_media_type", {
        magic_byte_mismatch: true,
        declared: clientCt,
        sniffed: sniffed ?? null,
      });
    }

    let stripped;
    try {
      stripped = await stripExifAndExtractDimensions(rawBody, clientCt);
    } catch (err) {
      if (err instanceof ExifStripError) {
        return publicError(c, 415, "unsupported_media_type", {
          exif_strip_error: err.code,
        });
      }
      console.error("gallery.submit.exif_strip_unknown", err);
      return publicError(c, 500, "submission_failed");
    }

    const { width, height } = stripped;
    if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
      return publicError(c, 400, "image_dimensions_invalid", {
        min: MIN_DIMENSION_PX,
        width,
        height,
      });
    }
    const aspect = width / height;
    if (aspect > MAX_ASPECT_RATIO || aspect < 1 / MAX_ASPECT_RATIO) {
      return publicError(c, 400, "image_dimensions_invalid", {
        aspect_max: MAX_ASPECT_RATIO,
        width,
        height,
      });
    }

    const ext = extensionForContentType(stripped.contentType)!;
    const uuid = crypto.randomUUID();
    const r2Key = `submissions/${uuid}.${ext}`;
    const strippedBytes = stripped.body.byteLength;

    try {
      await c.env.IMAGES.put(r2Key, stripped.body, {
        httpMetadata: {
          contentType: stripped.contentType,
          cacheControl: "private, no-store",
        },
      });
    } catch (err) {
      console.error("gallery.submit.r2_put_failed", err);
      return publicError(c, 500, "submission_failed");
    }

    const ipHash =
      c.get("ipHashForSubmission") ?? (await hashIpForSubmission(c.req.raw));
    const uaHash = await hashUserAgent(c.req.raw);
    const submittedAt = Math.floor(Date.now() / 1000);

    let insertedId: number;
    try {
      const db = getDb(c.env);
      const inserted = await db
        .insert(gallerySubmissions)
        .values({
          r2Key,
          nickname,
          caption,
          eventId,
          eventLabel,
          takenOn,
          status: "pending",
          submittedAt,
          ipHash,
          uaHash,
          width,
          height,
          sizeBytes: strippedBytes,
          contentType: stripped.contentType,
        })
        .returning({ id: gallerySubmissions.id })
        .get();
      insertedId = inserted.id;
    } catch (err) {
      console.error("gallery.submit.d1_insert_failed", err);
      try {
        await c.env.IMAGES.delete(r2Key);
      } catch (delErr) {
        console.error("gallery.submit.r2_compensate_failed", delErr);
      }
      return publicError(c, 500, "submission_failed");
    }

    console.log("gallery.submit", {
      op: "gallery.submit",
      submission_id: insertedId,
      width,
      height,
      size_bytes: strippedBytes,
      content_type: stripped.contentType,
      ip_hash: ipHash,
    });

    // Fire-and-forget enqueue. Failures must not block the submitter's response.
    const enqueuePromise = (async () => {
      try {
        const db = getDb(c.env);
        const eventSlugRow = eventId
          ? await db
              .select({ slug: events.slug })
              .from(events)
              .where(eq(events.id, eventId))
              .get()
          : null;
        const pendingTotalRow = await db
          .select({ n: count() })
          .from(gallerySubmissions)
          .where(eq(gallerySubmissions.status, "pending"))
          .get();
        const pendingTotal = pendingTotalRow?.n ?? 1;
        await enqueueGallerySubmissionDigest(
          c.env,
          {
            submission_id: insertedId,
            nickname,
            caption,
            // For label-only submissions, fall back to the free-form label so
            // the digest reader knows what event the photo is from.
            event_slug: eventSlugRow?.slug ?? eventLabel ?? null,
            thumbnail_url: `${c.env.CDN_ORIGIN}/${r2Key}`,
            submitted_iso: new Date(submittedAt * 1000).toISOString(),
          },
          pendingTotal,
        );
      } catch (err) {
        console.error("gallery.submit.enqueue_failed", err);
      }
    })();
    // In production (Workers fetch handler), executionCtx is present and
    // waitUntil keeps the response fast. In test/scheduler context the
    // getter throws; we fall back to awaiting so the row still lands in D1.
    let queued = false;
    try {
      const ctx = c.executionCtx;
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(enqueuePromise);
        queued = true;
      }
    } catch {
      queued = false;
    }
    if (!queued) {
      await enqueuePromise;
    }

    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.json(
      {
        id: insertedId,
        submitted_at: submittedAt,
        status: "pending" as const,
      },
      201,
    );
  });

  return router;
}

// Exposed for tests / static analysis. Not part of the route surface.
export const __testing = {
  MAX_SUBMIT_BYTES,
  MIN_DIMENSION_PX,
  MAX_ASPECT_RATIO,
  ALLOWED_MIMES,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sqlNoop: sql,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  andNoop: and,
};
