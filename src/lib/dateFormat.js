/**
 * dateFormat — site-wide YYYY.MM.DD formatter (bang-dream.com convention).
 *
 * Reads UTC fields from parsed Date so output is timezone-stable across CI.
 * All functions return "" / null on unparseable input — never throw.
 */

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function parseUtcParts(iso) {
  if (typeof iso !== 'string') return null
  const trimmed = iso.trim()
  if (trimmed.length === 0) return null
  const ts = Date.parse(trimmed)
  if (Number.isNaN(ts)) return null
  const d = new Date(ts)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    hasTime: /[T ]\d{1,2}:\d{2}/.test(trimmed),
  }
}

/**
 * @param {unknown} iso
 * @returns {string} "YYYY.MM.DD" or "" on bad input
 */
export function formatDate(iso) {
  const p = parseUtcParts(iso)
  if (p === null) return ''
  return p.y + '.' + pad2(p.m) + '.' + pad2(p.day)
}

/**
 * Formats date with optional time component (h:mm AM/PM in viewer locale).
 * Falls through to formatDate when input has no time.
 * @param {unknown} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  const p = parseUtcParts(iso)
  if (p === null) return ''
  const datePart = p.y + '.' + pad2(p.m) + '.' + pad2(p.day)
  if (!p.hasTime) return datePart
  try {
    const d = new Date(iso)
    const time = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
    return datePart + ' ' + time
  } catch {
    return datePart
  }
}

/**
 * Multi-day range. Collapses same-day to a single date string.
 * @param {unknown} startIso
 * @param {unknown} [endIso]
 * @returns {string}
 */
export function formatDateRange(startIso, endIso) {
  const start = formatDate(startIso)
  if (start === '') return ''
  if (endIso === null || endIso === undefined || endIso === '') return start
  const end = formatDate(endIso)
  if (end === '' || end === start) return start
  return start + ' – ' + end
}
