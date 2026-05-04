import { Hono, type Context } from "hono";
import type { AppVariables, Env } from "../custom-env";
import { requireAdmin } from "../auth/middleware";
import {
  extensionForContentType,
  generateSlug,
  slugFromFilename,
} from "../utils/slug";
import { uploadFormParts } from "../utils/validate";
import { respondAdmin } from "../utils/respond";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

function adminError(
  c: AppContext,
  status: number,
  error: string,
  detail?: unknown,
): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  const body: Record<string, unknown> = { error };
  if (detail !== undefined) body.detail = detail;
  return c.json(body, status as 400);
}

export function buildUploadRoutes() {
  const router = new Hono<AppType>();

  router.post("/", requireAdmin, async (c) => {
    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return adminError(c, 400, "invalid_multipart");
    }

    const kindRaw = form.get("kind");
    const slugRaw = form.get("slug");
    const fileEntry = form.get("file");

    const partsParsed = uploadFormParts.safeParse({
      kind: typeof kindRaw === "string" ? kindRaw : undefined,
      slug: typeof slugRaw === "string" && slugRaw.length > 0 ? slugRaw : undefined,
    });
    if (!partsParsed.success) {
      return adminError(c, 400, "bad_request", partsParsed.error.flatten());
    }

    if (!fileEntry || typeof fileEntry === "string") {
      return adminError(c, 400, "missing_file");
    }

    const file = fileEntry as File;
    const contentType = (file.type || "").toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return adminError(c, 415, "unsupported_media_type", {
        allowed: Array.from(ALLOWED_CONTENT_TYPES),
        received: contentType || null,
      });
    }
    if (file.size <= 0) {
      return adminError(c, 400, "empty_file");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return adminError(c, 413, "payload_too_large", { maxBytes: MAX_UPLOAD_BYTES });
    }

    // ext is guaranteed by ALLOWED_CONTENT_TYPES check above
    const ext = extensionForContentType(contentType)!;

    const slug = partsParsed.data.slug
      ? generateSlug(partsParsed.data.slug)
      : slugFromFilename(file.name);
    const ts = Date.now();
    const key = `${partsParsed.data.kind}/${slug}-${ts}.${ext}`;

    let body: ArrayBuffer;
    try {
      body = await file.arrayBuffer();
    } catch (err) {
      console.error("file_read_failed", err);
      return adminError(c, 500, "upload_failed");
    }

    try {
      await c.env.IMAGES.put(key, body, {
        httpMetadata: {
          contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    } catch (err) {
      console.error("r2_put_failed", err);
      return adminError(c, 500, "upload_failed");
    }

    const url = `${c.env.CDN_ORIGIN}/${key}`;
    return respondAdmin(
      c,
      {
        url,
        key,
        size: file.size,
        contentType,
      },
      201,
    );
  });

  return router;
}
