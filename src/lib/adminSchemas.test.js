import { describe, it, expect } from 'vitest'
import {
  adminSchemas,
  getSchema,
  listSchemaKeys,
  slugify,
  validateItem,
  validateUnique,
  autoIdForItem,
} from './adminSchemas.js'

describe('adminSchemas registry shape', () => {
  it('Edge 1: every schema has key matching export name', () => {
    for (const [exportKey, schema] of Object.entries(adminSchemas)) {
      expect(schema.key).toBe(exportKey)
    }
  })

  it('Edge 2: every schema file path starts with src/data/', () => {
    for (const schema of Object.values(adminSchemas)) {
      expect(schema.file).toMatch(/^src\/data\//)
    }
  })

  it('Edge 3: every schema shape is array or object', () => {
    for (const schema of Object.values(adminSchemas)) {
      expect(['array', 'object']).toContain(schema.shape)
    }
  })

  it('Edge 4: every array-shape schema has listKey field present in fields', () => {
    for (const schema of Object.values(adminSchemas)) {
      if (schema.shape !== 'array') continue
      expect(schema.listKey).toBeTruthy()
      const fieldKeys = schema.fields.map((f) => f.key)
      expect(fieldKeys).toContain(schema.listKey)
    }
  })

  it('Edge 5: no readOnly+required field without autoSlug (would be UI deadlock)', () => {
    for (const schema of Object.values(adminSchemas)) {
      for (const f of schema.fields) {
        if (f.readOnly && f.required && !f.autoSlug) {
          // Permitted only when the value is locked but always populated by data (e.g. communityName)
          // For these, the field already has a value in src/data/site.json so it's NOT a deadlock.
          expect(['communityName', 'communityNameZh', 'communityNameJp', 'platform']).toContain(f.key)
        }
      }
    }
  })

  it('Edge 6: every asset uploadDir starts with public/ and ends with /', () => {
    for (const schema of Object.values(adminSchemas)) {
      for (const f of schema.fields) {
        if (f.type !== 'asset') continue
        expect(f.uploadDir).toMatch(/^public\//)
        expect(f.uploadDir).toMatch(/\/$/)
      }
    }
  })

  it('Edge 7: every select field has non-empty options array', () => {
    for (const schema of Object.values(adminSchemas)) {
      for (const f of schema.fields) {
        if (f.type !== 'select') continue
        expect(Array.isArray(f.options)).toBe(true)
        expect(f.options.length).toBeGreaterThan(0)
      }
    }
  })

  it('listSchemaKeys returns all 7', () => {
    expect(listSchemaKeys().sort()).toEqual(
      ['about', 'events', 'members', 'news', 'posts', 'site', 'social'].sort(),
    )
  })

  it('getSchema returns schema by key, undefined for unknown', () => {
    expect(getSchema('events').title).toBe('Events')
    expect(getSchema('does-not-exist')).toBeUndefined()
  })
})

describe('slugify', () => {
  it('Edge 14: standard ASCII title', () => {
    expect(slugify('Roselia LA Live 2025!')).toBe('roselia-la-live-2025')
  })

  it('Edge 15: CJK preserved + ASCII lowered + whitespace collapsed', () => {
    expect(slugify('  中文 title  ')).toBe('中文-title')
  })

  it('Edge 16: empty input returns empty', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
  })

  it('strips punctuation but keeps dashes', () => {
    expect(slugify('Roselia: LA / Live!')).toBe('roselia-la-live')
  })

  it('collapses repeated dashes', () => {
    expect(slugify('a -- b -- c')).toBe('a-b-c')
  })
})

describe('validateItem(events)', () => {
  const valid = {
    id: 'roselia-la-live-2025',
    title: 'Roselia LA Live 2025',
    date: '2025-09-15T19:00:00-07:00',
    type: 'concert',
    location: { city: 'LA', venue: 'YouTube Theater' },
    description: 'A live show',
    ticketUrl: 'https://example.com',
  }

  it('Edge 8: complete item returns []', () => {
    expect(validateItem('events', valid)).toEqual([])
  })

  it('Edge 9: missing title returns title-required error', () => {
    const errs = validateItem('events', { ...valid, title: '' })
    expect(errs).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'title', message: expect.stringMatching(/required/i) }),
    ]))
  })

  it('Edge 10: invalid url returns ticketUrl error', () => {
    const errs = validateItem('events', { ...valid, ticketUrl: 'not-a-url' })
    expect(errs.some((e) => e.fieldKey === 'ticketUrl')).toBe(true)
  })

  it('Edge 11: invalid date returns date error', () => {
    const errs = validateItem('events', { ...valid, date: 'not-a-date' })
    expect(errs.some((e) => e.fieldKey === 'date' && /valid date/i.test(e.message))).toBe(true)
  })

  it('Edge 12: type=unknown returns enum violation', () => {
    const errs = validateItem('events', { ...valid, type: 'something-else' })
    expect(errs.some((e) => e.fieldKey === 'type' && /one of/i.test(e.message))).toBe(true)
  })

  it('autoSlug+readOnly id is allowed empty if title is set', () => {
    const errs = validateItem('events', { ...valid, id: '' })
    expect(errs.find((e) => e.fieldKey === 'id')).toBeUndefined()
  })

  it('rejects non-array links when complex', () => {
    const errs = validateItem('events', { ...valid, links: 'not-array' })
    expect(errs.some((e) => e.fieldKey === 'links')).toBe(true)
  })

  it('rejects non-object location when complex', () => {
    const errs = validateItem('events', { ...valid, location: 'string-not-object' })
    expect(errs.some((e) => e.fieldKey === 'location')).toBe(true)
  })
})

describe('validateItem(site)', () => {
  it('Edge 13: complete site object returns []', () => {
    const errs = validateItem('site', {
      discordInvite: 'https://discord.gg/abc',
      communityName: 'X',
      communityNameZh: 'X',
      communityNameJp: 'X',
    })
    expect(errs).toEqual([])
  })

  it('missing discordInvite returns required error', () => {
    const errs = validateItem('site', {
      discordInvite: '',
      communityName: 'X',
      communityNameZh: 'X',
      communityNameJp: 'X',
    })
    expect(errs.some((e) => e.fieldKey === 'discordInvite')).toBe(true)
  })
})

describe('validateItem unknown schema', () => {
  it('returns __schema__ error', () => {
    const errs = validateItem('does-not-exist', {})
    expect(errs[0].fieldKey).toBe('__schema__')
  })
})

describe('validateUnique', () => {
  it('returns no error on unique ids', () => {
    expect(validateUnique('events', [{ id: 'a' }, { id: 'b' }])).toEqual([])
  })

  it('returns error on duplicate ids', () => {
    const errs = validateUnique('events', [{ id: 'a' }, { id: 'a' }])
    expect(errs[0].message).toMatch(/duplicate id/i)
  })

  it('skips object-shape schemas', () => {
    expect(validateUnique('site', [])).toEqual([])
  })
})

describe('autoIdForItem', () => {
  it('returns existing id if already set', () => {
    expect(autoIdForItem('events', { id: 'pre-set', title: 'X' })).toBe('pre-set')
  })

  it('slugifies autoSlugFrom field when id missing', () => {
    expect(autoIdForItem('events', { id: '', title: 'Hello World' })).toBe('hello-world')
  })

  it('falls back to schemaKey-Date when both missing', () => {
    const id = autoIdForItem('events', { id: '', title: '' })
    expect(id).toMatch(/^events-[a-z0-9]+$/)
  })
})

describe('boolean field validation', () => {
  it('treats false as a valid value (not empty)', () => {
    const errs = validateItem('social', { platform: 'discord', label: 'D', enabled: false })
    expect(errs.find((e) => e.fieldKey === 'enabled')).toBeUndefined()
  })

  it('rejects non-boolean value on boolean field', () => {
    const errs = validateItem('social', { platform: 'discord', label: 'D', enabled: 'maybe' })
    expect(errs.some((e) => e.fieldKey === 'enabled' && /true or false/i.test(e.message))).toBe(true)
  })
})

describe('asset field validation', () => {
  it('required asset empty string returns error', () => {
    // posts.image is required
    const errs = validateItem('posts', { id: 'p1', image: '', datePosted: '2025-01-01' })
    expect(errs.some((e) => e.fieldKey === 'image')).toBe(true)
  })

  it('non-string truthy value on required asset still flags required-empty', () => {
    const errs = validateItem('posts', { id: 'p1', image: 123, datePosted: '2025-01-01' })
    expect(errs.some((e) => e.fieldKey === 'image')).toBe(true)
  })

  it('non-required asset empty is fine', () => {
    const errs = validateItem('events', { id: 'e1', title: 'X', date: '2025-09-15T19:00', type: 'concert', image: '' })
    expect(errs.find((e) => e.fieldKey === 'image')).toBeUndefined()
  })
})

describe('all schemas pass shape sanity', () => {
  it('every schema has fields array', () => {
    for (const schema of Object.values(adminSchemas)) {
      expect(schema.fields.length).toBeGreaterThan(0)
    }
  })
})

describe('sortFn invocation per schema (coverage)', () => {
  it('events sortFn sorts by date desc', () => {
    const items = [{ date: '2025-01-01' }, { date: '2026-01-01' }]
    const sorted = adminSchemas.events.sortFn(items)
    expect(sorted[0].date).toBe('2026-01-01')
  })

  it('events sortFn handles missing date', () => {
    const items = [{}, { date: '2025-01-01' }]
    const sorted = adminSchemas.events.sortFn(items)
    expect(sorted.length).toBe(2)
  })

  it('members sortFn sorts by name asc', () => {
    const items = [{ name: 'Bob' }, { name: 'Alice' }]
    const sorted = adminSchemas.members.sortFn(items)
    expect(sorted[0].name).toBe('Alice')
  })

  it('members sortFn handles missing name', () => {
    const items = [{}, { name: 'Alice' }]
    const sorted = adminSchemas.members.sortFn(items)
    expect(sorted.length).toBe(2)
  })

  it('news sortFn sorts by date desc', () => {
    const items = [{ date: '2025-01-01' }, { date: '2026-01-01' }]
    expect(adminSchemas.news.sortFn(items)[0].date).toBe('2026-01-01')
  })

  it('news sortFn handles missing date', () => {
    expect(adminSchemas.news.sortFn([{}, {}]).length).toBe(2)
  })

  it('posts sortFn sorts by datePosted desc', () => {
    const items = [{ datePosted: '2025-01-01' }, { datePosted: '2026-01-01' }]
    expect(adminSchemas.posts.sortFn(items)[0].datePosted).toBe('2026-01-01')
  })

  it('posts sortFn handles missing datePosted', () => {
    expect(adminSchemas.posts.sortFn([{}, {}]).length).toBe(2)
  })
})
