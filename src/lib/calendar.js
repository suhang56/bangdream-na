/**
 * calendar — pure month-grid generation. No React, no DOM.
 */

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function isoYmd(year, month, day) {
  return year + '-' + pad(month + 1) + '-' + pad(day)
}

function asInt(n, fallback = 0) {
  if (typeof n !== 'number' || Number.isNaN(n)) return fallback
  return Math.trunc(n)
}

/**
 * Build a 6-row × 7-col month grid (42 cells) starting from the Sunday
 * on or before the 1st of the month.
 *
 * @param {number} year
 * @param {number} month - 0..11
 * @returns {Array<{date: Date, isOffMonth: boolean, ymd: string}>}
 */
export function buildMonthGrid(year, month) {
  const y = asInt(year, new Date().getFullYear())
  const m = asInt(month, 0)
  const first = new Date(Date.UTC(y, m, 1))
  const dayOfWeek = first.getUTCDay() // 0..6 (Sunday=0)
  const start = new Date(Date.UTC(y, m, 1 - dayOfWeek))
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86_400_000)
    const cellY = d.getUTCFullYear()
    const cellM = d.getUTCMonth()
    const cellD = d.getUTCDate()
    cells.push({
      date: d,
      isOffMonth: cellM !== m,
      ymd: isoYmd(cellY, cellM, cellD),
    })
  }
  return cells
}

/**
 * @param {{year: number, month: number}} input
 */
export function nextMonth(year, month) {
  const y = asInt(year, new Date().getFullYear())
  const m = asInt(month, 0)
  if (m === 11) return { year: y + 1, month: 0 }
  return { year: y, month: m + 1 }
}

export function prevMonth(year, month) {
  const y = asInt(year, new Date().getFullYear())
  const m = asInt(month, 0)
  if (m === 0) return { year: y - 1, month: 11 }
  return { year: y, month: m - 1 }
}

/**
 * Returns events whose date (or [date,endDate] range) covers the given ymd.
 *
 * @param {Array} events
 * @param {string} ymd - "YYYY-MM-DD"
 */
export function eventsForDay(events, ymd) {
  if (!Array.isArray(events) || typeof ymd !== 'string') return []
  return events.filter((e) => {
    if (!e || typeof e.date !== 'string') return false
    const startMs = Date.parse(e.date)
    if (Number.isNaN(startMs)) return false
    const startDay = isoOfMs(startMs)
    if (typeof e.endDate === 'string' && e.endDate.length > 0) {
      const endMs = Date.parse(e.endDate)
      if (Number.isNaN(endMs)) return startDay === ymd
      const endDay = isoOfMs(endMs)
      return ymd >= startDay && ymd <= endDay
    }
    return startDay === ymd
  })
}

function isoOfMs(ms) {
  const d = new Date(ms)
  return isoYmd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}
