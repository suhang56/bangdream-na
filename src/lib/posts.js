/**
 * @typedef {Object} PostEntry
 * @property {string} id
 * @property {string} image
 * @property {string} [title]
 * @property {string} [url]
 * @property {string} datePosted - ISO 8601
 */

/**
 * Parse a post's datePosted string. Mirrors lib/events.js parseEventDate.
 * Returns null for malformed input.
 *
 * @param {unknown} iso
 * @returns {Date|null}
 */
export function parsePostDate(iso) {
  if (typeof iso !== 'string') return null
  const trimmed = iso.trim()
  if (trimmed.length === 0) return null
  const ts = Date.parse(trimmed)
  if (Number.isNaN(ts)) return null
  return new Date(ts)
}

function isHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim())
}

/**
 * Validates a single post entry. Returns a *new* sanitized object when valid,
 * or null when the entry must be dropped.
 *
 * Validation rules:
 *  - object, non-null
 *  - non-empty string id (trimmed)
 *  - non-empty string image (trimmed)
 *  - parseable datePosted
 *  - title kept only when non-empty trimmed string; else dropped
 *  - url kept only when https://; else dropped
 *
 * @param {unknown} p
 * @returns {PostEntry|null}
 */
function sanitizePost(p) {
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return null
  const id = typeof p.id === 'string' ? p.id.trim() : ''
  if (id.length === 0) return null
  const image = typeof p.image === 'string' ? p.image.trim() : ''
  if (image.length === 0) return null
  const date = parsePostDate(p.datePosted)
  if (date === null) return null
  const out = { id, image, datePosted: p.datePosted }
  if (typeof p.title === 'string' && p.title.trim().length > 0) {
    out.title = p.title
  }
  if (isHttpsUrl(p.url)) {
    out.url = p.url
  }
  return out
}

/**
 * Drops invalid post entries; deduplicates by id (first wins).
 * Returns a new array; input not mutated.
 *
 * @param {unknown} posts
 * @returns {PostEntry[]}
 */
export function filterValidPosts(posts) {
  if (!Array.isArray(posts)) return []
  const seen = new Set()
  const out = []
  for (const p of posts) {
    const sanitized = sanitizePost(p)
    if (sanitized === null) continue
    if (seen.has(sanitized.id)) continue
    seen.add(sanitized.id)
    out.push(sanitized)
  }
  return out
}

/**
 * Returns a NEW sorted array. Does not mutate input.
 * 'desc' (default) = newest first. 'asc' = oldest first.
 * Malformed-date entries sort to the end regardless of direction.
 *
 * @param {PostEntry[]} posts
 * @param {'asc'|'desc'} [direction='desc']
 * @returns {PostEntry[]}
 */
export function sortPostsByDate(posts, direction = 'desc') {
  if (!Array.isArray(posts)) return []
  const dir = direction === 'asc' ? 1 : -1
  return posts
    .map((p, i) => {
      const d = parsePostDate(p?.datePosted)
      return {
        post: p,
        ts: d === null ? Number.NEGATIVE_INFINITY : d.valueOf(),
        i,
      }
    })
    .sort((a, b) => {
      if (a.ts === Number.NEGATIVE_INFINITY && b.ts === Number.NEGATIVE_INFINITY) {
        return a.i - b.i
      }
      if (a.ts === Number.NEGATIVE_INFINITY) return 1
      if (b.ts === Number.NEGATIVE_INFINITY) return -1
      if (a.ts === b.ts) return a.i - b.i
      return (a.ts - b.ts) * dir
    })
    .map((entry) => entry.post)
}

/**
 * Returns first `max` posts. max <= 0 → []. Non-numeric max → full array.
 * Always returns a new array.
 *
 * @param {PostEntry[]} posts
 * @param {number} max
 * @returns {PostEntry[]}
 */
export function limitPosts(posts, max) {
  if (!Array.isArray(posts)) return []
  if (typeof max !== 'number' || Number.isNaN(max)) return posts.slice()
  if (max <= 0) return []
  return posts.slice(0, Math.trunc(max))
}

/**
 * Convenience: filter + sort newest-first + limit. Mirrors `events.js` style.
 * `now` parameter is reserved for future "expire after N days" filtering;
 * currently unused but kept for signature stability.
 *
 * @param {unknown} posts
 * @param {number} [max=6]
 * @param {Date} [now=new Date()]
 * @returns {PostEntry[]}
 */
export function pickFeaturedPosts(posts, max = 6, now = new Date()) {
  void now
  const valid = filterValidPosts(posts)
  const sorted = sortPostsByDate(valid, 'desc')
  return limitPosts(sorted, max)
}
