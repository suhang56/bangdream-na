/**
 * @typedef {Object} EventLink
 * @property {string} label
 * @property {string} url
 *
 * @typedef {Object} EventEntry
 * @property {string} id
 * @property {string} title
 * @property {string} date - ISO 8601 with timezone
 * @property {string} location
 * @property {'concert'|'fanmeet'|'con'} type
 * @property {string} description
 * @property {EventLink[]} [links]
 * @property {string} [image]
 */

/**
 * Parses an event date string. Returns null for malformed input
 * (empty string, non-string, unparseable date).
 *
 * @param {unknown} dateStr
 * @returns {Date|null}
 */
export function parseEventDate(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length === 0) return null
  const ts = Date.parse(dateStr)
  if (Number.isNaN(ts)) return null
  return new Date(ts)
}

/**
 * Splits events into upcoming + past relative to `now`.
 * Pure: input array NOT mutated. Each output array is a new array.
 * Events with malformed `date` are dropped (not silently bucketed).
 *
 * @param {EventEntry[]} events
 * @param {Date} [now]
 * @returns {{ upcoming: EventEntry[], past: EventEntry[] }}
 */
export function groupEventsByTime(events, now = new Date()) {
  if (!Array.isArray(events)) return { upcoming: [], past: [] }
  const nowTs = now.getTime()
  const upcoming = []
  const past = []
  for (const e of events) {
    const d = parseEventDate(e?.date)
    if (d === null) continue
    if (d.getTime() >= nowTs) upcoming.push(e)
    else past.push(e)
  }
  return { upcoming, past }
}

/**
 * Returns a new filtered array. Empty Set === "show all".
 *
 * @param {EventEntry[]} events
 * @param {{ types: Set<string> }} filterState
 * @returns {EventEntry[]}
 */
export function filterEvents(events, filterState) {
  if (!Array.isArray(events)) return []
  const types = filterState?.types
  if (!(types instanceof Set) || types.size === 0) {
    return [...events]
  }
  return events.filter((e) => types.has(e?.type))
}

/**
 * Returns a new sorted array. Does not mutate input.
 * 'asc' = chronological (earliest first).
 * Malformed-date entries sort to the end regardless of dir.
 *
 * @param {EventEntry[]} events
 * @param {'asc'|'desc'} [dir]
 * @returns {EventEntry[]}
 */
export function sortEventsByDate(events, dir = 'asc') {
  if (!Array.isArray(events)) return []
  const sign = dir === 'desc' ? -1 : 1
  return [...events].sort((a, b) => {
    const da = parseEventDate(a?.date)
    const db = parseEventDate(b?.date)
    if (da === null && db === null) return 0
    if (da === null) return 1
    if (db === null) return -1
    return sign * (da.getTime() - db.getTime())
  })
}
