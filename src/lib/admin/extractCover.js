/**
 * R5.5 — auto-detect a hero image URL from the FIRST `![alt](url)` markdown
 * image syntax in a body string. Pure function. Returns the URL string or
 * null when no image is found / body is malformed.
 *
 * Behaviour:
 *  - Scans only markdown image syntax `![alt](url)`. Returns the URL of the
 *    first match.
 *  - Allows whitespace around the URL inside parens (per CommonMark).
 *  - Strips an optional `"title"` token after URL (`![](url "title")`).
 *  - SKIPS images inside fenced code blocks (```...```), since those are
 *    examples not real assets.
 *  - Does NOT extract HTML `<img>` tags — they're rare in our content and
 *    parsing them adds risk for negligible gain. Admin can always set the
 *    field manually if needed.
 *  - URL must look web-fetchable: starts with `http://`, `https://`, `/`,
 *    or matches `cdn.bangdream.org` shorthand. Empty `()` returns null.
 */

const FENCE_PATTERN = /```[\s\S]*?```/g
const IMAGE_PATTERN = /!\[[^\]]*\]\(\s*([^\s)"'<>]+)(?:\s+"[^"]*")?\s*\)/

/** True when the URL looks safe to use as a hero image source. */
function isUsableUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return false
  if (url.startsWith('http://')) return true
  if (url.startsWith('https://')) return true
  if (url.startsWith('/')) return true
  return false
}

/**
 * Strip fenced code blocks so we don't pick up `![demo](file.png)` from
 * documentation examples.
 */
export function stripFencedCode(body) {
  if (typeof body !== 'string') return ''
  return body.replace(FENCE_PATTERN, '')
}

/**
 * Extract the first markdown image URL from `body`. Returns the URL string
 * (suitable for hero_image_url) or null when no usable image exists.
 *
 * @param {string|null|undefined} body
 * @returns {string|null}
 */
export function extractCover(body) {
  if (typeof body !== 'string' || body.length === 0) return null
  const stripped = stripFencedCode(body)
  const match = IMAGE_PATTERN.exec(stripped)
  if (!match) return null
  const url = match[1]
  return isUsableUrl(url) ? url : null
}
