import { describe, it, expect } from 'vitest'
import {
  parsePostDate,
  filterValidPosts,
  sortPostsByDate,
  limitPosts,
  pickFeaturedPosts,
} from './posts.js'

const valid = (overrides = {}) => ({
  id: 'p1',
  image: '/posts/p1.jpg',
  datePosted: '2025-04-30',
  ...overrides,
})

describe('parsePostDate', () => {
  it('parses valid ISO date-only', () => {
    const d = parsePostDate('2025-04-30')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.valueOf())).toBe(false)
  })

  it('parses valid ISO timestamp with timezone', () => {
    const d = parsePostDate('2025-04-30T19:00:00-07:00')
    expect(d).toBeInstanceOf(Date)
  })

  it('returns null for empty string', () => {
    expect(parsePostDate('')).toBeNull()
  })

  it('returns null for whitespace-only string (edge)', () => {
    expect(parsePostDate('   ')).toBeNull()
  })

  it('returns null for non-string input (edge)', () => {
    expect(parsePostDate(null)).toBeNull()
    expect(parsePostDate(undefined)).toBeNull()
    expect(parsePostDate(0)).toBeNull()
    expect(parsePostDate(42)).toBeNull()
    expect(parsePostDate({})).toBeNull()
    expect(parsePostDate([])).toBeNull()
  })

  it('returns null for unparseable string', () => {
    expect(parsePostDate('not-a-date')).toBeNull()
    expect(parsePostDate('yesterday')).toBeNull()
  })

  it('returns null for invalid calendar date (edge)', () => {
    expect(parsePostDate('2025-13-40')).toBeNull()
  })
})

describe('filterValidPosts', () => {
  it('returns valid posts as sanitized objects', () => {
    const out = filterValidPosts([valid()])
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('p1')
  })

  it('returns [] for null', () => {
    expect(filterValidPosts(null)).toEqual([])
  })

  it('returns [] for undefined', () => {
    expect(filterValidPosts(undefined)).toEqual([])
  })

  it('returns [] for non-array (edge)', () => {
    expect(filterValidPosts({})).toEqual([])
    expect(filterValidPosts('foo')).toEqual([])
    expect(filterValidPosts(42)).toEqual([])
  })

  it('drops post missing id', () => {
    const out = filterValidPosts([valid({ id: undefined })])
    expect(out.length).toBe(0)
  })

  it('drops post with empty / whitespace id (edge)', () => {
    expect(filterValidPosts([valid({ id: '' })]).length).toBe(0)
    expect(filterValidPosts([valid({ id: '   ' })]).length).toBe(0)
  })

  it('drops post with non-string id (edge)', () => {
    expect(filterValidPosts([valid({ id: 42 })]).length).toBe(0)
    expect(filterValidPosts([valid({ id: null })]).length).toBe(0)
  })

  it('drops post missing image', () => {
    expect(filterValidPosts([valid({ image: undefined })]).length).toBe(0)
  })

  it('drops post with non-string image (edge)', () => {
    expect(filterValidPosts([valid({ image: null })]).length).toBe(0)
    expect(filterValidPosts([valid({ image: 42 })]).length).toBe(0)
  })

  it('drops post with empty image (edge)', () => {
    expect(filterValidPosts([valid({ image: '' })]).length).toBe(0)
    expect(filterValidPosts([valid({ image: '   ' })]).length).toBe(0)
  })

  it('drops post missing datePosted', () => {
    expect(filterValidPosts([valid({ datePosted: undefined })]).length).toBe(0)
  })

  it('drops post with malformed datePosted (edge)', () => {
    expect(filterValidPosts([valid({ datePosted: 'yesterday' })]).length).toBe(0)
  })

  it('keeps post when title undefined; no title set on output', () => {
    const out = filterValidPosts([valid({ title: undefined })])
    expect(out.length).toBe(1)
    expect(out[0].title).toBeUndefined()
  })

  it('drops empty / whitespace title (treated as no title)', () => {
    const out = filterValidPosts([valid({ title: '' })])
    expect(out[0].title).toBeUndefined()
    const out2 = filterValidPosts([valid({ title: '   ' })])
    expect(out2[0].title).toBeUndefined()
  })

  it('keeps non-empty title verbatim', () => {
    const out = filterValidPosts([valid({ title: 'Spring Meet' })])
    expect(out[0].title).toBe('Spring Meet')
  })

  it('drops http url (non-https) but keeps post', () => {
    const out = filterValidPosts([valid({ url: 'http://example.com' })])
    expect(out.length).toBe(1)
    expect(out[0].url).toBeUndefined()
  })

  it('keeps https url verbatim', () => {
    const out = filterValidPosts([valid({ url: 'https://example.com' })])
    expect(out[0].url).toBe('https://example.com')
  })

  it('drops non-string url silently (edge)', () => {
    const out = filterValidPosts([valid({ url: 42 })])
    expect(out[0].url).toBeUndefined()
  })

  it('dedupes by id, first occurrence wins', () => {
    const out = filterValidPosts([
      valid({ id: 'a', image: '/1.jpg' }),
      valid({ id: 'a', image: '/2.jpg' }),
    ])
    expect(out.length).toBe(1)
    expect(out[0].image).toBe('/1.jpg')
  })

  it('preserves order for valid mix (edge)', () => {
    const out = filterValidPosts([
      valid({ id: 'a' }),
      valid({ id: 'b', datePosted: 'bogus' }),
      valid({ id: 'c' }),
    ])
    expect(out.map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('drops null / non-object array entries (edge)', () => {
    expect(filterValidPosts([null, undefined, 'string', 42, []])).toEqual([])
  })

  it('does not mutate input array', () => {
    const input = [valid()]
    const ref = input
    filterValidPosts(input)
    expect(input).toBe(ref)
    expect(input.length).toBe(1)
  })
})

describe('sortPostsByDate', () => {
  it('sorts newest-first by default (desc)', () => {
    const out = sortPostsByDate([
      { id: 'a', datePosted: '2025-01-01' },
      { id: 'b', datePosted: '2025-06-01' },
      { id: 'c', datePosted: '2025-03-01' },
    ])
    expect(out.map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('sorts oldest-first when direction=asc', () => {
    const out = sortPostsByDate(
      [
        { id: 'a', datePosted: '2025-01-01' },
        { id: 'b', datePosted: '2025-06-01' },
        { id: 'c', datePosted: '2025-03-01' },
      ],
      'asc',
    )
    expect(out.map((p) => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('returns [] for non-array (edge)', () => {
    expect(sortPostsByDate(null)).toEqual([])
    expect(sortPostsByDate(undefined)).toEqual([])
    expect(sortPostsByDate('foo')).toEqual([])
  })

  it('returns new empty array for empty input (immutability — different reference)', () => {
    const input = []
    const out = sortPostsByDate(input)
    expect(out).toEqual([])
    expect(out).not.toBe(input)
  })

  it('handles single-entry array', () => {
    const out = sortPostsByDate([{ id: 'a', datePosted: '2025-01-01' }])
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('a')
  })

  it('preserves stable order for equal dates', () => {
    const out = sortPostsByDate([
      { id: 'a', datePosted: '2025-01-01' },
      { id: 'b', datePosted: '2025-01-01' },
      { id: 'c', datePosted: '2025-01-01' },
    ])
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('malformed dates sort to end in desc', () => {
    const out = sortPostsByDate([
      { id: 'a', datePosted: 'bogus' },
      { id: 'b', datePosted: '2025-06-01' },
      { id: 'c', datePosted: '2025-03-01' },
    ])
    expect(out.map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('malformed dates sort to end in asc too (edge)', () => {
    const out = sortPostsByDate(
      [
        { id: 'a', datePosted: 'bogus' },
        { id: 'b', datePosted: '2025-06-01' },
        { id: 'c', datePosted: '2025-03-01' },
      ],
      'asc',
    )
    expect(out.map((p) => p.id)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate input array', () => {
    const input = [
      { id: 'a', datePosted: '2025-01-01' },
      { id: 'b', datePosted: '2025-06-01' },
    ]
    const ref = input
    const before = input.map((p) => p.id)
    sortPostsByDate(input)
    expect(input).toBe(ref)
    expect(input.map((p) => p.id)).toEqual(before)
  })
})

describe('limitPosts', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({
    id: 'p' + i,
    datePosted: '2025-01-' + String(i + 1).padStart(2, '0'),
  }))

  it('returns first N items when max < length', () => {
    expect(limitPosts(ten, 3).length).toBe(3)
    expect(limitPosts(ten, 3)[0].id).toBe('p0')
  })

  it('returns full array when max > length', () => {
    expect(limitPosts(ten, 100).length).toBe(10)
  })

  it('returns full array when max equals length (edge)', () => {
    expect(limitPosts(ten, 10).length).toBe(10)
  })

  it('returns [] when max = 0', () => {
    expect(limitPosts(ten, 0)).toEqual([])
  })

  it('returns [] when max negative (edge)', () => {
    expect(limitPosts(ten, -1)).toEqual([])
    expect(limitPosts(ten, -100)).toEqual([])
  })

  it('returns full array (sliced copy) when max non-numeric (edge)', () => {
    const out = limitPosts(ten, NaN)
    expect(out.length).toBe(10)
    const out2 = limitPosts(ten, undefined)
    expect(out2.length).toBe(10)
    const out3 = limitPosts(ten, 'foo')
    expect(out3.length).toBe(10)
  })

  it('returns [] for non-array input (edge)', () => {
    expect(limitPosts(null, 3)).toEqual([])
    expect(limitPosts(undefined, 3)).toEqual([])
    expect(limitPosts({}, 3)).toEqual([])
  })

  it('does not mutate input', () => {
    const input = ten.slice()
    const ref = input
    limitPosts(input, 3)
    expect(input).toBe(ref)
    expect(input.length).toBe(10)
  })

  it('returns a new array (not the same reference)', () => {
    const input = ten.slice()
    expect(limitPosts(input, 100)).not.toBe(input)
  })
})

describe('pickFeaturedPosts', () => {
  it('returns [] for empty array', () => {
    expect(pickFeaturedPosts([])).toEqual([])
  })

  it('returns single valid post', () => {
    const out = pickFeaturedPosts([
      { id: 'a', image: '/a.jpg', datePosted: '2025-01-01' },
    ])
    expect(out.length).toBe(1)
  })

  it('caps at default max=6', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: 'p' + i,
      image: '/p.jpg',
      datePosted: '2025-01-' + String(i + 1).padStart(2, '0'),
    }))
    expect(pickFeaturedPosts(ten).length).toBe(6)
  })

  it('respects custom max', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: 'p' + i,
      image: '/p.jpg',
      datePosted: '2025-01-' + String(i + 1).padStart(2, '0'),
    }))
    expect(pickFeaturedPosts(ten, 3).length).toBe(3)
  })

  it('returns [] when all entries malformed', () => {
    const out = pickFeaturedPosts([
      { id: 'a', image: '/a.jpg', datePosted: 'nope' },
      { image: '/b.jpg', datePosted: '2025-01-01' },
      null,
    ])
    expect(out).toEqual([])
  })

  it('mixed valid + invalid → keeps valid newest-first', () => {
    const out = pickFeaturedPosts([
      { id: 'a', image: '/a.jpg', datePosted: '2025-01-01' },
      { id: 'bad', image: '', datePosted: '2025-06-01' },
      { id: 'c', image: '/c.jpg', datePosted: '2025-06-01' },
      null,
    ])
    expect(out.map((p) => p.id)).toEqual(['c', 'a'])
  })

  it('drops entries missing image', () => {
    const out = pickFeaturedPosts([
      { id: 'a', datePosted: '2025-01-01' },
      { id: 'b', image: '/b.jpg', datePosted: '2025-01-02' },
    ])
    expect(out.length).toBe(1)
    expect(out[0].id).toBe('b')
  })

  it('max=0 → []', () => {
    expect(
      pickFeaturedPosts(
        [{ id: 'a', image: '/a.jpg', datePosted: '2025-01-01' }],
        0,
      ),
    ).toEqual([])
  })

  it('max=undefined uses default 6', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: 'p' + i,
      image: '/p.jpg',
      datePosted: '2025-01-' + String(i + 1).padStart(2, '0'),
    }))
    expect(pickFeaturedPosts(ten, undefined).length).toBe(6)
  })

  it('does not mutate input', () => {
    const input = [
      { id: 'a', image: '/a.jpg', datePosted: '2025-01-01' },
      { id: 'b', image: '/b.jpg', datePosted: '2025-06-01' },
    ]
    const ref = input
    const before = input.map((p) => p.id)
    pickFeaturedPosts(input, 5)
    expect(input).toBe(ref)
    expect(input.map((p) => p.id)).toEqual(before)
  })

  it('accepts now parameter without affecting output (reserved)', () => {
    const out = pickFeaturedPosts(
      [{ id: 'a', image: '/a.jpg', datePosted: '2025-01-01' }],
      6,
      new Date('2030-01-01'),
    )
    expect(out.length).toBe(1)
  })

  it('returns [] when input is non-array (edge)', () => {
    expect(pickFeaturedPosts(null)).toEqual([])
    expect(pickFeaturedPosts(undefined)).toEqual([])
    expect(pickFeaturedPosts('foo')).toEqual([])
  })
})
