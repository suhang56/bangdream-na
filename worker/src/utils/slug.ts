const MAX_SLUG_LEN = 80;
const FALLBACK_SLUG = "untitled";

export function generateSlug(input: string | null | undefined): string {
  if (input == null) return FALLBACK_SLUG;
  const lowered = String(input).toLowerCase();
  const replaced = lowered.replace(/[^\p{L}\p{N}]+/gu, "-");
  const collapsed = replaced.replace(/-+/g, "-");
  const trimmed = collapsed.replace(/^-+/, "").replace(/-+$/, "");
  if (!trimmed) return FALLBACK_SLUG;
  if (trimmed.length <= MAX_SLUG_LEN) return trimmed;
  const truncated = trimmed.slice(0, MAX_SLUG_LEN).replace(/-+$/, "");
  return truncated || FALLBACK_SLUG;
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForContentType(contentType: string): string | null {
  return EXT_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? null;
}

export function slugFromFilename(filename: string | null | undefined): string {
  if (!filename) return FALLBACK_SLUG;
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return generateSlug(base);
}
