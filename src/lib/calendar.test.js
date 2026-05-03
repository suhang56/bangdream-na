import { describe, it, expect } from 'vitest'
import { buildMonthGrid, nextMonth, prevMonth, eventsForDay } from './calendar.js'

describe('buildMonthGrid', () => {
  it('returns 42 cells', () => {
    expect(buildMonthGrid(2026, 3)).toHaveLength(42)
  })

  it('marks off-month cells', () => {
    // April 2026: April 1 is Wednesday → 3 leading off-month cells (Sun-Tue Mar)
    const cells = buildMonthGrid(2026, 3)
    expect(cells[0].isOffMonth).toBe(true)
    expect(cells[3].isOffMonth).toBe(false)
    expect(cells[3].ymd).toBe('2026-04-01')
  })

  it('handles leap year Feb 2024 (29 days)', () => {
    const cells = buildMonthGrid(2024, 1)
    const inMonth = cells.filter((c) => !c.isOffMonth)
    expect(inMonth).toHaveLength(29)
  })

  it('handles non-leap Feb 2025 (28 days)', () => {
    const cells = buildMonthGrid(2025, 1)
    const inMonth = cells.filter((c) => !c.isOffMonth)
    expect(inMonth).toHaveLength(28)
  })

  it('handles year boundary (Dec 2026 → Jan 2027 trailing)', () => {
    const cells = buildMonthGrid(2026, 11)
    const last = cells[cells.length - 1]
    expect(last.isOffMonth).toBe(true)
    expect(last.ymd.startsWith('2027')).toBe(true)
  })

  it('first cell is a Sunday (UTC)', () => {
    const cells = buildMonthGrid(2026, 5)
    expect(cells[0].date.getUTCDay()).toBe(0)
  })

  it('invalid year/month → defaults gracefully (edge)', () => {
    expect(() => buildMonthGrid('xx', 'yy')).not.toThrow()
  })
})

describe('nextMonth / prevMonth', () => {
  it('advances within year', () => {
    expect(nextMonth(2026, 3)).toEqual({ year: 2026, month: 4 })
  })

  it('wraps Dec → Jan next year', () => {
    expect(nextMonth(2026, 11)).toEqual({ year: 2027, month: 0 })
  })

  it('wraps Jan → Dec prev year', () => {
    expect(prevMonth(2026, 0)).toEqual({ year: 2025, month: 11 })
  })

  it('decrements within year', () => {
    expect(prevMonth(2026, 5)).toEqual({ year: 2026, month: 4 })
  })
})

describe('eventsForDay', () => {
  const events = [
    { id: 'a', date: '2026-04-15T19:00:00Z' },
    { id: 'b', date: '2026-04-15T22:00:00Z' },
    { id: 'c', date: '2026-04-20', endDate: '2026-04-22' },
    { id: 'd', date: 'bad' },
  ]

  it('filters by exact day', () => {
    const out = eventsForDay(events, '2026-04-15')
    expect(out.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('multi-day event covers each day in range', () => {
    expect(eventsForDay(events, '2026-04-20').map((e) => e.id)).toEqual(['c'])
    expect(eventsForDay(events, '2026-04-21').map((e) => e.id)).toEqual(['c'])
    expect(eventsForDay(events, '2026-04-22').map((e) => e.id)).toEqual(['c'])
    expect(eventsForDay(events, '2026-04-23')).toEqual([])
  })

  it('malformed date dropped (edge)', () => {
    const out = eventsForDay(events, '2026-04-15')
    expect(out.find((e) => e.id === 'd')).toBeUndefined()
  })

  it('non-array input → []', () => {
    expect(eventsForDay(null, '2026-04-15')).toEqual([])
  })

  it('non-string ymd → []', () => {
    expect(eventsForDay(events, 42)).toEqual([])
  })

  it('empty events → []', () => {
    expect(eventsForDay([], '2026-04-15')).toEqual([])
  })
})
