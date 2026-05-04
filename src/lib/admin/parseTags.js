/**
 * R5.5 — extract `#hashtag` patterns from markdown body and merge with the
 * explicit tags input. Pure function. Returns a deduped, lowercased array.
 *
 * Tag rules:
 *  - A tag starts with `#` and is followed by 1+ Unicode letter/number chars.
 *  - The `#` must be at start-of-string OR preceded by whitespace, so we don't
 *    pick up `id="#foo"`-style attribute values inside HTML or markdown links
 *    like `[link](#section)`.
 *  - Multiline-aware: `#tag` after a newline counts.
 *  - Length capped at 40 chars (worker schema enforces 1..40).
 *  - Hyphens and underscores within a tag are preserved (`#cover-band`).
 *  - Lowercased; CJK characters keep their original case (no-op).
 *  - Explicit tags (from form field) come first; hash-extracted tags appended;
 *    duplicates removed (case-insensitive). Order is stable (first-seen wins).
 */

const TAG_PATTERN = /(?:^|[\s])#([\p{L}\p{N}][\p{L}\p{N}_-]{0,39})/gu

/** Normalize a single tag string: trim, lowercase, drop empties. */
function normalizeOne(tag) {
  if (typeof tag !== 'string') return null
  const trimmed = tag.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > 40) return null
  return trimmed.toLowerCase()
}

/**
 * Parse explicit tag input (string CSV, array, null/undefined) into a
 * normalized array.
 */
export function parseExplicitTags(input) {
  if (input == null) return []
  if (Array.isArray(input)) {
    return input.map(normalizeOne).filter((x) => x !== null)
  }
  if (typeof input !== 'string') return []
  return input
    .split(',')
    .map(normalizeOne)
    .filter((x) => x !== null)
}

/**
 * Extract `#hashtag` matches from a markdown body. Returns lowercased,
 * deduped array. Empty string / null / undefined yields [].
 */
export function extractHashTags(body) {
  if (typeof body !== 'string' || body.length === 0) return []
  const found = []
  const seen = new Set()
  // reset lastIndex defensively (regex is module-level)
  TAG_PATTERN.lastIndex = 0
  let match
  while ((match = TAG_PATTERN.exec(body)) !== null) {
    const norm = normalizeOne(match[1])
    if (norm === null) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    found.push(norm)
  }
  return found
}

/**
 * Merge explicit form-field tags with hash-extracted body tags.
 * Returns deduped, lowercased array; explicit tags come first.
 */
export function mergeTags(explicit, body) {
  const result = []
  const seen = new Set()
  for (const t of parseExplicitTags(explicit)) {
    if (seen.has(t)) continue
    seen.add(t)
    result.push(t)
  }
  for (const t of extractHashTags(body)) {
    if (seen.has(t)) continue
    seen.add(t)
    result.push(t)
  }
  return result
}

/**
 * High-level entry. Accepts the form draft shape; returns merged tags.
 *
 * @param {{ tagsInput?: string|string[], body?: string }} input
 */
export function parseTags(input) {
  if (!input || typeof input !== 'object') return []
  return mergeTags(input.tagsInput, input.body)
}
