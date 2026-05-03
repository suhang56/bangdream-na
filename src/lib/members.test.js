import { describe, it, expect } from 'vitest'
import { filterMembers, sortMembersByName } from './members.js'

const BASE_MEMBERS = [
  {
    id: 'a1',
    name: 'Alice Anderson',
    role: 'organizer',
    oshiBand: 'roselia',
    oshiCharacter: 'Yukina Minato',
    city: 'San Francisco, CA',
    bio: 'Roselia stan, NA organizer.',
  },
  {
    id: 'b1',
    name: 'Bob Brown',
    role: 'member',
    oshiBand: 'mygo',
    city: 'Los Angeles, CA',
    bio: 'MyGO supporter.',
  },
  {
    id: 'c1',
    name: '戸山香澄',
    role: 'member',
    oshiBand: 'popipa',
    oshiCharacter: 'Kasumi Toyama',
    city: 'New York, NY',
    bio: 'Star player fan.',
  },
  {
    id: 'd1',
    name: 'Carol Carter',
    role: 'alumnus',
    bio: 'Past organizer.',
  },
]

describe('filterMembers', () => {
  it('returns empty array for empty input with no filters', () => {
    expect(filterMembers([], {})).toEqual([])
  })

  it('returns identity (deep-equal, new array) when no filters provided', () => {
    const result = filterMembers(BASE_MEMBERS, {})
    expect(result).toEqual(BASE_MEMBERS)
    expect(result).not.toBe(BASE_MEMBERS)
  })

  it('returns identity when filters is fully omitted', () => {
    expect(filterMembers(BASE_MEMBERS)).toEqual(BASE_MEMBERS)
  })

  it("filters by bands case-insensitively (lowercase chip vs lowercase data)", () => {
    const result = filterMembers(BASE_MEMBERS, { bands: ['roselia'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('filters by bands case-insensitively (capitalized chip vs lowercase data)', () => {
    const result = filterMembers(BASE_MEMBERS, { bands: ['Roselia'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('treats empty bands array as no band filter (identity)', () => {
    expect(filterMembers(BASE_MEMBERS, { bands: [] })).toEqual(BASE_MEMBERS)
  })

  it('excludes members with no oshiBand when bands filter is active', () => {
    const result = filterMembers(BASE_MEMBERS, { bands: ['roselia'] })
    expect(result.find((m) => m.id === 'd1')).toBeUndefined()
  })

  it('filters by role exactly', () => {
    const result = filterMembers(BASE_MEMBERS, { role: 'organizer' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('treats role=null as no role filter', () => {
    expect(filterMembers(BASE_MEMBERS, { role: null })).toEqual(BASE_MEMBERS)
  })

  it('treats role="" (empty string) as no role filter', () => {
    expect(filterMembers(BASE_MEMBERS, { role: '' })).toEqual(BASE_MEMBERS)
  })

  it('filters by search case-insensitively against bio', () => {
    const result = filterMembers(BASE_MEMBERS, { search: 'roselia' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('trims whitespace in search query', () => {
    const result = filterMembers(BASE_MEMBERS, { search: '  ROSELIA  ' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('matches CJK substring in name', () => {
    const result = filterMembers(BASE_MEMBERS, { search: '香澄' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
  })

  it('matches search against city and oshiCharacter', () => {
    const ny = filterMembers(BASE_MEMBERS, { search: 'New York' })
    expect(ny.map((m) => m.id)).toEqual(['c1'])
    const yukina = filterMembers(BASE_MEMBERS, { search: 'Yukina' })
    expect(yukina.map((m) => m.id)).toEqual(['a1'])
  })

  it('matches search against coverBand field', () => {
    const members = [
      { id: 'x', name: 'X', role: 'member', coverBand: 'After Sunset' },
      { id: 'y', name: 'Y', role: 'member' },
    ]
    expect(filterMembers(members, { search: 'sunset' })).toHaveLength(1)
  })

  it('combines bands + role + search with intersection', () => {
    const result = filterMembers(BASE_MEMBERS, {
      bands: ['roselia'],
      role: 'organizer',
      search: 'Yukina',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })

  it('returns empty array when filters do not overlap', () => {
    const result = filterMembers(BASE_MEMBERS, {
      bands: ['roselia'],
      role: 'member',
    })
    expect(result).toEqual([])
  })

  it('does not mutate input array (immutability)', () => {
    const snapshot = JSON.stringify(BASE_MEMBERS)
    filterMembers(BASE_MEMBERS, { bands: ['roselia'], role: 'organizer', search: 'kasumi' })
    expect(JSON.stringify(BASE_MEMBERS)).toBe(snapshot)
  })

  it('handles members with missing optional fields without throwing', () => {
    const sparse = [{ id: 'm', name: 'M', role: 'member' }]
    expect(() => filterMembers(sparse, { search: 'x' })).not.toThrow()
    expect(filterMembers(sparse, { search: 'x' })).toEqual([])
  })
})

describe('sortMembersByName', () => {
  it('returns empty array for empty input', () => {
    expect(sortMembersByName([])).toEqual([])
  })

  it('returns identity for single member', () => {
    const single = [{ id: 'a', name: 'Alice', role: 'member' }]
    expect(sortMembersByName(single)).toEqual(single)
  })

  it('sorts case-insensitively', () => {
    const input = [
      { id: '1', name: 'bob', role: 'member' },
      { id: '2', name: 'Alice', role: 'member' },
    ]
    const result = sortMembersByName(input)
    expect(result.map((m) => m.name)).toEqual(['Alice', 'bob'])
  })

  it('handles accents (does not throw, returns full array)', () => {
    const input = [
      { id: '1', name: 'éclair', role: 'member' },
      { id: '2', name: 'apple', role: 'member' },
      { id: '3', name: 'banana', role: 'member' },
    ]
    const result = sortMembersByName(input)
    expect(result).toHaveLength(3)
  })

  it('handles CJK names alongside ASCII without throwing', () => {
    const input = [
      { id: '1', name: '戸山香澄', role: 'member' },
      { id: '2', name: 'Alice', role: 'member' },
    ]
    expect(() => sortMembersByName(input)).not.toThrow()
    expect(sortMembersByName(input)).toHaveLength(2)
  })

  it('sorts CJK names by pinyin first letter (西瓜→x, 北京→b, 啊→a)', () => {
    const input = [
      { id: '1', name: '西瓜', role: 'member' },
      { id: '2', name: '北京', role: 'member' },
      { id: '3', name: '啊明', role: 'member' },
    ]
    const result = sortMembersByName(input)
    expect(result.map((m) => m.name)).toEqual(['啊明', '北京', '西瓜'])
  })

  it('sorts CJK by pinyin and Latin alphabetically; each script-group internally correct', () => {
    const input = [
      { id: '1', name: 'Zoe', role: 'member' },
      { id: '2', name: '北京', role: 'member' },
      { id: '3', name: 'Alice', role: 'member' },
      { id: '4', name: '西瓜', role: 'member' },
    ]
    const result = sortMembersByName(input).map((m) => m.name)
    const aliceIdx = result.indexOf('Alice')
    const beijingIdx = result.indexOf('北京')
    const xiguaIdx = result.indexOf('西瓜')
    const zoeIdx = result.indexOf('Zoe')
    expect(aliceIdx).toBeLessThan(zoeIdx)
    expect(beijingIdx).toBeLessThan(xiguaIdx)
  })

  it('sorts numbers naturally (member-2 before member-10)', () => {
    const input = [
      { id: '1', name: 'member-10', role: 'member' },
      { id: '2', name: 'member-2', role: 'member' },
    ]
    const result = sortMembersByName(input).map((m) => m.name)
    expect(result).toEqual(['member-2', 'member-10'])
  })

  it('does not mutate input array (immutability)', () => {
    const input = [
      { id: '1', name: 'bob', role: 'member' },
      { id: '2', name: 'Alice', role: 'member' },
    ]
    const order = input.map((m) => m.id).join(',')
    sortMembersByName(input)
    expect(input.map((m) => m.id).join(',')).toBe(order)
  })

  it('handles missing/null name field without throwing', () => {
    const input = [
      { id: '1', role: 'member' },
      { id: '2', name: null, role: 'member' },
      { id: '3', name: 'Alice', role: 'member' },
    ]
    expect(() => sortMembersByName(input)).not.toThrow()
    expect(sortMembersByName(input)).toHaveLength(3)
  })
})
