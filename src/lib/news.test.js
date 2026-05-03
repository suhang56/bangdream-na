import { describe, it, expect } from 'vitest'
import { sortNewsByDate, filterNews } from './news.js'

const items = [
  { id: 'a', date: '2026-04-30', title: 'Spring meetup', body: 'A', category: 'announcement' },
  { id: 'b', date: '2026-03-01', title: 'Roselia tour', body: 'Concert info', category: 'event' },
  { id: 'c', date: '2026-05-15', title: 'New cover band', body: 'Welcome', category: 'community' },
  { id: 'd', date: 'bad', title: 'Broken', body: 'X', category: 'release' },
]

describe('sortNewsByDate', () => {
  it('sorts desc (newest first) by default', () => {
    const out = sortNewsByDate(items)
    expect(out[0].id).toBe('c')
    expect(out[1].id).toBe('a')
    expect(out[2].id).toBe('b')
  })

  it('sorts asc when dir=asc', () => {
    const out = sortNewsByDate(items, 'asc')
    expect(out[0].id).toBe('b')
  })

  it('malformed dates sort to end', () => {
    const out = sortNewsByDate(items)
    expect(out.at(-1).id).toBe('d')
  })

  it('non-array input → []', () => {
    expect(sortNewsByDate(null)).toEqual([])
  })
})

describe('filterNews', () => {
  it('returns all when state empty', () => {
    expect(filterNews(items, {})).toHaveLength(4)
  })

  it('filters by category Set', () => {
    const out = filterNews(items, { categories: new Set(['event']) })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('b')
  })

  it('filters by from date', () => {
    const out = filterNews(items, { from: '2026-04-01' })
    // a 04-30, c 05-15 included; b 03-01 excluded; d bad excluded
    expect(out.map((n) => n.id).sort()).toEqual(['a', 'c'])
  })

  it('filters by to date inclusive (edge)', () => {
    const out = filterNews(items, { to: '2026-04-30' })
    expect(out.map((n) => n.id).sort()).toEqual(['a', 'b'])
  })

  it('keyword case-insensitive substring on title/body', () => {
    expect(filterNews(items, { keyword: 'roselia' })).toHaveLength(1)
    expect(filterNews(items, { keyword: 'concert' })).toHaveLength(1)
  })

  it('non-array input → []', () => {
    expect(filterNews(null, {})).toEqual([])
  })

  it('empty keyword does not filter (edge)', () => {
    expect(filterNews(items, { keyword: '' })).toHaveLength(4)
  })

  it('combined filters AND together', () => {
    const out = filterNews(items, {
      categories: new Set(['announcement', 'community']),
      from: '2026-05-01',
    })
    expect(out.map((n) => n.id)).toEqual(['c'])
  })
})
