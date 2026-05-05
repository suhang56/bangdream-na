import { describe, expect, it } from 'vitest'
import { buildGroups, __internals } from './grouping.js'

const mk = (overrides) => ({
  id: 1,
  imageUrl: 'https://cdn/x.jpg',
  caption: '',
  takenAt: null,
  eventId: null,
  eventSlug: null,
  eventTitleZh: null,
  album: null,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('buildGroups', () => {
  it('returns [] on empty input', () => {
    expect(buildGroups([], 'all')).toEqual([])
    expect(buildGroups(null, 'all')).toEqual([])
    expect(buildGroups(undefined, 'all')).toEqual([])
  })

  it('groups items into a single event bucket', () => {
    const items = [
      mk({ id: 1, eventId: 7, eventSlug: 'meet', eventTitleZh: '聚会', takenAt: 1000 }),
      mk({ id: 2, eventId: 7, eventSlug: 'meet', eventTitleZh: '聚会', takenAt: 2000 }),
    ]
    const groups = buildGroups(items, 'all')
    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('event-meet')
    expect(groups[0].kind).toBe('event')
    expect(groups[0].label).toBe('聚会')
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 2])
  })

  it('handles multi-event + album groups, sorts groups by newest takenAt desc', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'old', eventTitleZh: '旧活动', takenAt: 1000 }),
      mk({ id: 2, eventId: 2, eventSlug: 'new', eventTitleZh: '新活动', takenAt: 5000 }),
      mk({ id: 3, album: '随手拍', takenAt: 3000 }),
    ]
    const groups = buildGroups(items, 'all')
    expect(groups.map((g) => g.id)).toEqual(['event-new', 'album-album', 'event-old'])
  })

  it('items with NULL takenAt sorted last via createdAt fallback', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: null, createdAt: 100 }),
      mk({ id: 2, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 5000, createdAt: 200 }),
      mk({ id: 3, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 1000, createdAt: 300 }),
    ]
    const groups = buildGroups(items, 'all')
    expect(groups[0].items.map((i) => i.id)).toEqual([3, 2, 1])
  })

  it("filter='event' excludes album-only groups", () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 1000 }),
      mk({ id: 2, album: '相册', takenAt: 2000 }),
    ]
    const groups = buildGroups(items, 'event')
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('event')
  })

  it("filter='album' excludes event-linked groups", () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 1000 }),
      mk({ id: 2, album: '相册', takenAt: 2000 }),
    ]
    const groups = buildGroups(items, 'album')
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('album')
  })

  it('hash-anchor id matches the slug for event groups', () => {
    const items = [
      mk({
        id: 1,
        eventId: 7,
        eventSlug: 'west-coast-meet-2024',
        eventTitleZh: '聚会',
        takenAt: 1000,
      }),
    ]
    const groups = buildGroups(items, 'all')
    expect(groups[0].id).toBe('event-west-coast-meet-2024')
  })

  it('normalizes album labels for hash-anchor id (whitespace → dash)', () => {
    expect(__internals.normalizeAlbumKey('Free Album')).toBe('free-album')
    expect(__internals.normalizeAlbumKey('日常 随手')).toBe('album')
    expect(__internals.normalizeAlbumKey('___')).toBe('album')
  })

  it('coerces an unknown filter to "all"', () => {
    const items = [mk({ id: 1, album: 'a', takenAt: 1 })]
    expect(buildGroups(items, 'bogus').length).toBe(1)
  })

  it('dateRange shows single date when min==max, range when different', () => {
    const items = [
      mk({ id: 1, album: 'a', takenAt: 1700000000 }),
      mk({ id: 2, album: 'a', takenAt: 1700086400 }),
    ]
    const groups = buildGroups(items, 'all')
    expect(groups[0].dateRange).toMatch(/~/)
    const single = buildGroups([mk({ id: 1, album: 'a', takenAt: 1700000000 })], 'all')
    expect(single[0].dateRange).not.toMatch(/~/)
  })
})
