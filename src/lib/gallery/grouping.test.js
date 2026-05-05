import { describe, expect, it } from 'vitest'
import { buildGroups, extractGroupOptions, __internals } from './grouping.js'

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
    expect(buildGroups([])).toEqual([])
    expect(buildGroups(null)).toEqual([])
    expect(buildGroups(undefined)).toEqual([])
  })

  it('groups items into a single event bucket', () => {
    const items = [
      mk({ id: 1, eventId: 7, eventSlug: 'meet', eventTitleZh: '聚会', takenAt: 1000 }),
      mk({ id: 2, eventId: 7, eventSlug: 'meet', eventTitleZh: '聚会', takenAt: 2000 }),
    ]
    const groups = buildGroups(items)
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
    const groups = buildGroups(items)
    expect(groups.map((g) => g.id)).toEqual(['event-new', 'album-album', 'event-old'])
  })

  it('items with NULL takenAt sorted last via createdAt fallback', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: null, createdAt: 100 }),
      mk({ id: 2, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 5000, createdAt: 200 }),
      mk({ id: 3, eventId: 1, eventSlug: 'e', eventTitleZh: 'E', takenAt: 1000, createdAt: 300 }),
    ]
    const groups = buildGroups(items)
    expect(groups[0].items.map((i) => i.id)).toEqual([3, 2, 1])
  })

  it('selectedGroupId narrows to a single matching group', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
      mk({ id: 2, album: '相册', takenAt: 2000 }),
    ]
    expect(buildGroups(items, 'event-a').map((g) => g.id)).toEqual(['event-a'])
    expect(buildGroups(items, 'album-album').map((g) => g.id)).toEqual(['album-album'])
  })

  it('selectedGroupId not matching any group → empty array', () => {
    const items = [mk({ id: 1, album: '甲', takenAt: 1 })]
    expect(buildGroups(items, 'event-doesnt-exist')).toEqual([])
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
    const groups = buildGroups(items)
    expect(groups[0].id).toBe('event-west-coast-meet-2024')
  })

  it('normalizes album labels for hash-anchor id', () => {
    expect(__internals.normalizeAlbumKey('Free Album')).toBe('free-album')
    expect(__internals.normalizeAlbumKey('日常 随手')).toBe('album')
    expect(__internals.normalizeAlbumKey('___')).toBe('album')
  })

  it('dateRange shows single date when min==max, range when different', () => {
    const items = [
      mk({ id: 1, album: 'a', takenAt: 1700000000 }),
      mk({ id: 2, album: 'a', takenAt: 1700086400 }),
    ]
    const groups = buildGroups(items)
    expect(groups[0].dateRange).toMatch(/~/)
    const single = buildGroups([mk({ id: 1, album: 'a', takenAt: 1700000000 })])
    expect(single[0].dateRange).not.toMatch(/~/)
  })
})

describe('extractGroupOptions', () => {
  it('returns [] on empty input', () => {
    expect(extractGroupOptions([])).toEqual([])
    expect(extractGroupOptions(null)).toEqual([])
  })

  it('returns one option per group with id, label, count, kind', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 1000 }),
      mk({ id: 2, eventId: 1, eventSlug: 'a', eventTitleZh: '甲', takenAt: 2000 }),
      mk({ id: 3, album: '随手', takenAt: 500 }),
    ]
    const opts = extractGroupOptions(items)
    expect(opts).toHaveLength(2)
    const eventOpt = opts.find((o) => o.id === 'event-a')
    expect(eventOpt).toEqual({ id: 'event-a', label: '甲', count: 2, kind: 'event' })
    const albumOpt = opts.find((o) => o.id === 'album-album')
    expect(albumOpt).toEqual({ id: 'album-album', label: '随手', count: 1, kind: 'album' })
  })

  it('options are sorted by newest takenAt DESC', () => {
    const items = [
      mk({ id: 1, eventId: 1, eventSlug: 'old', eventTitleZh: '旧', takenAt: 1000 }),
      mk({ id: 2, eventId: 2, eventSlug: 'new', eventTitleZh: '新', takenAt: 5000 }),
      mk({ id: 3, album: 'mid', takenAt: 3000 }),
    ]
    const ids = extractGroupOptions(items).map((o) => o.id)
    expect(ids).toEqual(['event-new', 'album-mid', 'event-old'])
  })

  it('duplicate album labels collapse to one option (count summed)', () => {
    const items = [
      mk({ id: 1, album: 'My Album', takenAt: 1 }),
      mk({ id: 2, album: 'My Album', takenAt: 2 }),
      mk({ id: 3, album: 'My Album', takenAt: 3 }),
    ]
    const opts = extractGroupOptions(items)
    expect(opts).toHaveLength(1)
    expect(opts[0].count).toBe(3)
  })
})
