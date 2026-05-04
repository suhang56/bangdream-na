/**
 * Slug generator for admin form fields. Mirrors worker/src/utils/slug.ts so
 * client-side preview matches what the server will store.
 */

const FALLBACK_SLUG = 'untitled'
const MAX_SLUG_LEN = 80

export function generateSlug(input) {
  if (input == null) return FALLBACK_SLUG
  const lowered = String(input).toLowerCase()
  const replaced = lowered.replace(/[^\p{L}\p{N}]+/gu, '-')
  const collapsed = replaced.replace(/-+/g, '-')
  const trimmed = collapsed.replace(/^-+/, '').replace(/-+$/, '')
  if (!trimmed) return FALLBACK_SLUG
  if (trimmed.length <= MAX_SLUG_LEN) return trimmed
  const truncated = trimmed.slice(0, MAX_SLUG_LEN).replace(/-+$/, '')
  return truncated || FALLBACK_SLUG
}
