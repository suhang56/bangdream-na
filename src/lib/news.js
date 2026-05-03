/**
 * @typedef {Object} NewsEntry
 * @property {string} id
 * @property {string} date - ISO date or datetime
 * @property {string} title
 * @property {string} body
 * @property {'announcement'|'event'|'community'|'release'} category
 * @property {string} [image]
 */

function parseDate(s) {
  if (typeof s !== 'string' || s.length === 0) return null
  const ts = Date.parse(s)
  if (Number.isNaN(ts)) return null
  return new Date(ts)
}

/**
 * Sort by date desc (newest first). Malformed dates sort to end.
 * Returns a new array.
 */
export function sortNewsByDate(news, dir = 'desc') {
  if (!Array.isArray(news)) return []
  const sign = dir === 'asc' ? 1 : -1
  return [...news].sort((a, b) => {
    const da = parseDate(a?.date)
    const db = parseDate(b?.date)
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return sign * (da.getTime() - db.getTime())
  })
}

/**
 * Filter news entries.
 * @param {NewsEntry[]} news
 * @param {{ categories?: Set<string>, from?: string, to?: string, keyword?: string }} state
 */
export function filterNews(news, state) {
  if (!Array.isArray(news)) return []
  const { categories, from, to, keyword } = state || {}
  const fromTs = parseDate(from)?.getTime() ?? null
  const toTs = parseDate(to)?.getTime() ?? null
  const kw = typeof keyword === 'string' ? keyword.trim().toLowerCase() : ''
  const hasCats = categories instanceof Set && categories.size > 0
  return news.filter((n) => {
    if (hasCats && !categories.has(n?.category)) return false
    const d = parseDate(n?.date)
    if (fromTs !== null) {
      if (d === null || d.getTime() < fromTs) return false
    }
    if (toTs !== null) {
      // inclusive end-of-day: add 24h
      if (d === null || d.getTime() > toTs + 86_400_000 - 1) return false
    }
    if (kw.length > 0) {
      const hay = (
        (n?.title || '') +
        ' ' +
        (n?.body || '')
      ).toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}
