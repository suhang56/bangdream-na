import { describe, it, expect } from 'vitest'
import {
  parseEventDate,
  groupEventsByTime,
  filterEvents,
  sortEventsByDate,
} from './events.js'

const NOW = new Date('2026-06-01T12:00:00Z')

const upcomingConcert = {
  id: 'roselia-la',
  title: 'Roselia LA',
  date: '2026-07-15T19:00:00-07:00',
  location: 'The Wiltern, Los Angeles, CA',
  type: 'concert',
  description: 'Tour finale.',
}
const upcomingFanmeet = {
  id: 'mygo-fanmeet',
  title: 'MyGO Fan Meet',
  date: '2026-08-01T14:00:00-07:00',
  location: 'San Francisco, CA',
  type: 'fanmeet',
  description: 'Meet & greet.',
}
const pastCon = {
  id: 'ax-2025',
  title: 'Anime Expo 2025',
  date: '2025-07-04T10:00:00-07:00',
  location: 'Los Angeles, CA',
  type: 'con',
  description: 'Past con.',
}
const pastConcert = {
  id: 'pp-2024',
  title: "Poppin'Party 2024",
  date: '2024-12-31T20:00:00-08:00',
  location: 'New York, NY',
  type: 'concert',
  description: 'Past show.',
}
const malformed = {
  id: 'bad',
  title: 'Bad Date',
  date: 'not-a-date',
  location: 'Nowhere',
  type: 'concert',
  description: 'Will be dropped.',
}

describe('parseEventDate', () => {
  it('parses a full ISO 8601 with offset', () => {
    const d = parseEventDate('2026-07-15T19:00:00-07:00')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.getTime())).toBe(false)
  })

  it('returns null for empty string (edge)', () => {
    expect(parseEventDate('')).toBeNull()
  })

  it('returns null for malformed string (edge)', () => {
    expect(parseEventDate('not-a-date')).toBeNull()
  })

  it('returns null for null / undefined / number / object (edge)', () => {
    expect(parseEventDate(null)).toBeNull()
    expect(parseEventDate(undefined)).toBeNull()
    expect(parseEventDate(123)).toBeNull()
    expect(parseEventDate({})).toBeNull()
  })

  it('parses date-only string (lenient — browser-local interpretation)', () => {
    const d = parseEventDate('2026-07-04')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.getTime())).toBe(false)
  })
})

describe('groupEventsByTime', () => {
  it('returns empty buckets for empty input (edge)', () => {
    expect(groupEventsByTime([], NOW)).toEqual({ upcoming: [], past: [] })
  })

  it('returns empty buckets for non-array input (edge)', () => {
    expect(groupEventsByTime(null, NOW)).toEqual({ upcoming: [], past: [] })
    expect(groupEventsByTime(undefined, NOW)).toEqual({ upcoming: [], past: [] })
  })

  it('all upcoming → past empty', () => {
    const out = groupEventsByTime([upcomingConcert, upcomingFanmeet], NOW)
    expect(out.upcoming).toHaveLength(2)
    expect(out.past).toHaveLength(0)
  })

  it('all past → upcoming empty', () => {
    const out = groupEventsByTime([pastCon, pastConcert], NOW)
    expect(out.past).toHaveLength(2)
    expect(out.upcoming).toHaveLength(0)
  })

  it('mixed → buckets correctly', () => {
    const out = groupEventsByTime(
      [upcomingConcert, pastCon, upcomingFanmeet, pastConcert],
      NOW,
    )
    expect(out.upcoming.map((e) => e.id)).toEqual(['roselia-la', 'mygo-fanmeet'])
    expect(out.past.map((e) => e.id)).toEqual(['ax-2025', 'pp-2024'])
  })

  it('drops events with malformed dates (edge)', () => {
    const out = groupEventsByTime([upcomingConcert, malformed, pastCon], NOW)
    expect(out.upcoming).toHaveLength(1)
    expect(out.past).toHaveLength(1)
    expect(out.upcoming.find((e) => e.id === 'bad')).toBeUndefined()
    expect(out.past.find((e) => e.id === 'bad')).toBeUndefined()
  })

  it('event exactly equal to now is upcoming (boundary)', () => {
    const exact = { ...upcomingConcert, date: NOW.toISOString() }
    const out = groupEventsByTime([exact], NOW)
    expect(out.upcoming).toHaveLength(1)
    expect(out.past).toHaveLength(0)
  })

  it('does not mutate input array', () => {
    const arr = [upcomingConcert, pastCon]
    const before = [...arr]
    groupEventsByTime(arr, NOW)
    expect(arr).toEqual(before)
    expect(arr[0]).toBe(before[0])
  })

  it('uses default now (no second arg) without throwing', () => {
    expect(() => groupEventsByTime([upcomingConcert])).not.toThrow()
  })
})

describe('filterEvents', () => {
  const all = [upcomingConcert, upcomingFanmeet, pastCon, pastConcert]

  it('empty Set → returns full set as new array', () => {
    const out = filterEvents(all, { types: new Set() })
    expect(out).toEqual(all)
    expect(out).not.toBe(all)
  })

  it('missing filterState → returns full set', () => {
    expect(filterEvents(all, undefined)).toEqual(all)
    expect(filterEvents(all, {})).toEqual(all)
  })

  it('filters by single type', () => {
    const out = filterEvents(all, { types: new Set(['concert']) })
    expect(out.map((e) => e.id)).toEqual(['roselia-la', 'pp-2024'])
  })

  it('filters by multiple types (OR)', () => {
    const out = filterEvents(all, { types: new Set(['fanmeet', 'con']) })
    expect(out.map((e) => e.id)).toEqual(['mygo-fanmeet', 'ax-2025'])
  })

  it('zero matches → empty array (edge)', () => {
    const out = filterEvents(all, { types: new Set(['nonexistent']) })
    expect(out).toEqual([])
  })

  it('handles non-array input (edge)', () => {
    expect(filterEvents(null, { types: new Set() })).toEqual([])
    expect(filterEvents(undefined, { types: new Set() })).toEqual([])
  })

  it('does not mutate input array or its objects', () => {
    const arr = [...all]
    const beforeFirst = { ...arr[0] }
    filterEvents(arr, { types: new Set(['concert']) })
    expect(arr).toEqual(all)
    expect(arr[0]).toEqual(beforeFirst)
  })
})

describe('sortEventsByDate', () => {
  const mixed = [pastConcert, upcomingFanmeet, pastCon, upcomingConcert]

  it('default asc — earliest first', () => {
    const out = sortEventsByDate(mixed)
    expect(out.map((e) => e.id)).toEqual([
      'pp-2024',
      'ax-2025',
      'roselia-la',
      'mygo-fanmeet',
    ])
  })

  it('desc — latest first', () => {
    const out = sortEventsByDate(mixed, 'desc')
    expect(out.map((e) => e.id)).toEqual([
      'mygo-fanmeet',
      'roselia-la',
      'ax-2025',
      'pp-2024',
    ])
  })

  it('empty array → empty array (edge)', () => {
    expect(sortEventsByDate([])).toEqual([])
  })

  it('single event → returns same single-element array (edge)', () => {
    const out = sortEventsByDate([upcomingConcert])
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(upcomingConcert)
  })

  it('malformed-date entries sort to the END regardless of dir (edge)', () => {
    const list = [malformed, upcomingConcert, pastCon]
    const asc = sortEventsByDate(list, 'asc')
    expect(asc[asc.length - 1].id).toBe('bad')
    const desc = sortEventsByDate(list, 'desc')
    expect(desc[desc.length - 1].id).toBe('bad')
  })

  it('two malformed-date entries → both end up last (edge)', () => {
    const m2 = { ...malformed, id: 'bad-2' }
    const out = sortEventsByDate([malformed, upcomingConcert, m2], 'asc')
    expect(out.slice(-2).map((e) => e.id).sort()).toEqual(['bad', 'bad-2'])
  })

  it('non-array input → empty (edge)', () => {
    expect(sortEventsByDate(null)).toEqual([])
    expect(sortEventsByDate(undefined)).toEqual([])
  })

  it('does not mutate input array (immutability)', () => {
    const arr = [...mixed]
    const before = [...arr]
    sortEventsByDate(arr, 'desc')
    expect(arr).toEqual(before)
    expect(arr[0]).toBe(before[0])
  })
})
