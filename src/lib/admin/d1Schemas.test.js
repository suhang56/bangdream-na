import { describe, it, expect } from 'vitest'
import {
  d1Schemas,
  getD1Schema,
  listD1SchemaKeys,
  parseCsv,
  validateForm,
  __helpers,
} from './d1Schemas.js'

describe('d1Schemas registry', () => {
  it('listD1SchemaKeys includes the 7 D1-backed keys (R7 added 3)', () => {
    expect(listD1SchemaKeys().sort()).toEqual([
      'aboutSections',
      'categories',
      'events',
      'featuredPosts',
      'members',
      'news',
      'socialLinks',
    ])
  })

  it('getD1Schema returns schema by key, undefined for unknown', () => {
    expect(getD1Schema('news')).toBe(d1Schemas.news)
    expect(getD1Schema('events')).toBe(d1Schemas.events)
    expect(getD1Schema('featuredPosts')).toBe(d1Schemas.featuredPosts)
    expect(getD1Schema('socialLinks')).toBe(d1Schemas.socialLinks)
    expect(getD1Schema('aboutSections')).toBe(d1Schemas.aboutSections)
    expect(getD1Schema('unknown')).toBeUndefined()
  })

  it('every schema exposes mapRowToForm + mapFormToCreate + mapFormToUpdate + emptyForm', () => {
    for (const key of listD1SchemaKeys()) {
      const s = getD1Schema(key)
      expect(typeof s.mapRowToForm).toBe('function')
      expect(typeof s.mapFormToCreate).toBe('function')
      expect(typeof s.mapFormToUpdate).toBe('function')
      expect(typeof s.emptyForm).toBe('function')
    }
  })
})

describe('helpers', () => {
  it('parseCsv handles array input', () => {
    expect(parseCsv(['a', 'b'])).toEqual(['a', 'b'])
  })
  it('parseCsv handles comma-separated string', () => {
    expect(parseCsv('a, b , c')).toEqual(['a', 'b', 'c'])
  })
  it('parseCsv returns [] for null/empty', () => {
    expect(parseCsv(null)).toEqual([])
    expect(parseCsv('')).toEqual([])
    expect(parseCsv(undefined)).toEqual([])
  })

  it('toUnixSeconds parses ISO + numeric + null', () => {
    expect(__helpers.toUnixSeconds('1970-01-01T00:00:00Z')).toBe(0)
    expect(__helpers.toUnixSeconds(1700000000)).toBe(1700000000)
    expect(__helpers.toUnixSeconds(null)).toBeNull()
    expect(__helpers.toUnixSeconds('')).toBeNull()
    expect(__helpers.toUnixSeconds('not a date')).toBeNull()
  })

  it('fromUnixSeconds handles null + valid', () => {
    expect(__helpers.fromUnixSeconds(null)).toBe('')
    expect(__helpers.fromUnixSeconds(0)).toMatch(/1970/)
  })

  it('emptyToNull converts empty to null', () => {
    expect(__helpers.emptyToNull('')).toBeNull()
    expect(__helpers.emptyToNull('   ')).toBeNull()
    expect(__helpers.emptyToNull('x')).toBe('x')
    expect(__helpers.emptyToNull(null)).toBeNull()
  })
})

describe('news schema', () => {
  const schema = d1Schemas.news

  it('mapRowToForm maps DB row → form', () => {
    const row = {
      id: 7,
      slug: 'a',
      title_zh: '中文',
      title_en: 'EN',
      body_md: 'body',
      category: 'announcement',
      hero_image_url: 'https://cdn.bangdream.org/news/x.png',
      tags: ['x', 'y'],
      published_at: 1700000000,
      draft: 1,
    }
    const form = schema.mapRowToForm(row)
    expect(form.id).toBe(7)
    expect(form.tags_csv).toBe('x, y')
    expect(form.draft).toBe(true)
    expect(form.draft_display).toBe('是')
  })

  it('mapRowToForm handles missing optional fields', () => {
    const form = schema.mapRowToForm({})
    expect(form.title_zh).toBe('')
    expect(form.tags_csv).toBe('')
    expect(form.draft).toBe(false)
  })

  it('mapFormToCreate auto-generates slug if blank', () => {
    const body = schema.mapFormToCreate({
      slug: '',
      title_zh: 'Hello World',
      body_md: 'b',
      category: 'announcement',
      tags_csv: 'tag1, tag2',
      published_at: '1970-01-01T00:00:00Z',
    })
    expect(body.slug).toMatch(/hello/)
    expect(body.tags).toEqual(['tag1', 'tag2'])
    expect(body.published_at).toBe(0)
  })

  it('mapFormToCreate respects explicit slug', () => {
    const body = schema.mapFormToCreate({
      slug: 'custom-slug',
      title_zh: 'x',
      body_md: 'b',
      category: 'announcement',
      tags_csv: '',
      published_at: '1970-01-01T00:00:00Z',
    })
    expect(body.slug).toBe('custom-slug')
  })

  it('mapFormToUpdate equals mapFormToCreate', () => {
    const form = {
      slug: 's',
      title_zh: 'x',
      body_md: 'b',
      category: 'announcement',
      tags_csv: '',
      published_at: '1970-01-01T00:00:00Z',
    }
    expect(schema.mapFormToUpdate(form)).toEqual(schema.mapFormToCreate(form))
  })

  it('emptyForm has expected default fields', () => {
    const e = schema.emptyForm()
    expect(e.title_zh).toBe('')
    expect(e.draft).toBe(false)
    expect(e.category).toBe('announcement')
  })
})

describe('events schema', () => {
  const schema = d1Schemas.events

  it('mapRowToForm + mapFormToCreate roundtrip', () => {
    const row = {
      id: 1,
      slug: 'live',
      title_zh: '现场',
      title_en: 'Live',
      description_md: 'desc',
      hero_image_url: null,
      start_at: 1700000000,
      end_at: 1700003600,
      venue: 'Hall',
      city: 'LA',
      scope: 'upcoming',
      ticket_url: null,
      band_theme: null,
    }
    const form = schema.mapRowToForm(row)
    const back = schema.mapFormToCreate(form)
    expect(back.start_at).toBe(1700000000)
    expect(back.scope).toBe('upcoming')
  })

  it('mapFormToCreate auto-slugs from title_zh', () => {
    const body = schema.mapFormToCreate({
      slug: '',
      title_zh: '夏日演唱会',
      start_at: '1970-01-01T00:00:00Z',
      end_at: '',
      city: '',
      scope: '',
    })
    expect(body.slug.length).toBeGreaterThan(0)
    expect(body.scope).toBeNull()
  })

  it('emptyForm scope defaults to upcoming', () => {
    expect(schema.emptyForm().scope).toBe('upcoming')
  })
})

describe('members schema', () => {
  const schema = d1Schemas.members

  it('mapRowToForm renders expedition_member display flag', () => {
    expect(schema.mapRowToForm({ expedition_member: 1 }).expedition_member_display).toBe('是')
    expect(schema.mapRowToForm({ expedition_member: 0 }).expedition_member_display).toBe('否')
    expect(schema.mapRowToForm({}).expedition_member_display).toBe('否')
  })

  it('mapFormToCreate normalizes to required+optional fields', () => {
    const body = schema.mapFormToCreate({
      display_name: 'X',
      city: '',
      oshi_character: 'C',
      oshi_band: '',
      avatar_url: '',
      expedition_member: true,
    })
    expect(body.display_name).toBe('X')
    expect(body.city).toBeNull()
    expect(body.expedition_member).toBe(true)
  })

  // ── R5.5 role field ─────────────────────────────────────────────────────
  it('mapRowToForm preserves valid role + renders zh display label', () => {
    expect(schema.mapRowToForm({ role: 'organizer' }).role).toBe('organizer')
    expect(schema.mapRowToForm({ role: 'organizer' }).role_display).toBe('组织者')
    expect(schema.mapRowToForm({ role: 'cover-band-lead' }).role_display).toBe('翻唱乐队主理')
    expect(schema.mapRowToForm({ role: 'alumnus' }).role_display).toBe('校友')
    expect(schema.mapRowToForm({ role: 'member' }).role_display).toBe('成员')
  })

  it('mapRowToForm falls back to "member" for unknown role', () => {
    expect(schema.mapRowToForm({ role: 'supreme-leader' }).role).toBe('member')
    expect(schema.mapRowToForm({}).role).toBe('member')
    expect(schema.mapRowToForm({ role: null }).role).toBe('member')
  })

  it('mapFormToCreate sends role through when valid, falls back to member otherwise', () => {
    const valid = schema.mapFormToCreate({ display_name: 'X', role: 'organizer' })
    expect(valid.role).toBe('organizer')
    const bogus = schema.mapFormToCreate({ display_name: 'X', role: 'supreme-leader' })
    expect(bogus.role).toBe('member')
    const missing = schema.mapFormToCreate({ display_name: 'X' })
    expect(missing.role).toBe('member')
  })

  it('emptyForm initializes role to member', () => {
    expect(schema.emptyForm().role).toBe('member')
  })

  it('listColumns includes role_display column', () => {
    expect(schema.listColumns.some((c) => c.key === 'role_display')).toBe(true)
  })

  it('fields include a required role select with 4 options', () => {
    const roleField = schema.fields.find((f) => f.key === 'role')
    expect(roleField).toBeDefined()
    expect(roleField.type).toBe('select')
    expect(roleField.required).toBe(true)
    expect(roleField.options).toEqual([
      'organizer',
      'member',
      'alumnus',
      'cover-band-lead',
    ])
  })
})

describe('categories schema', () => {
  const schema = d1Schemas.categories

  it('mapRowToForm + mapFormToCreate roundtrip', () => {
    const row = {
      id: 1,
      slug: 'foo',
      display_zh: '中文',
      display_en: 'EN',
      accent_color: 'brand-rose',
      sort_order: 3,
      active: 1,
    }
    const form = schema.mapRowToForm(row)
    const back = schema.mapFormToCreate(form)
    expect(back.slug).toBe('foo')
    expect(back.sort_order).toBe(3)
    expect(back.active).toBe(true)
  })

  it('mapFormToCreate handles string sort_order', () => {
    const body = schema.mapFormToCreate({
      slug: 's',
      display_zh: 'x',
      display_en: '',
      accent_color: '',
      sort_order: '7',
      active: false,
    })
    expect(body.sort_order).toBe(7)
    expect(body.active).toBe(false)
  })

  it('emptyForm defaults active=true', () => {
    expect(schema.emptyForm().active).toBe(true)
  })
})

describe('featuredPosts schema (R7)', () => {
  const schema = d1Schemas.featuredPosts

  it('mapRowToForm handles missing optional fields', () => {
    const f = schema.mapRowToForm({})
    expect(f.title_zh).toBe('')
    expect(f.image_url).toBe('')
    expect(f.published_at).toBe('')
    expect(f.active).toBe(false)
  })

  it('mapRowToForm round-trips active=1, sort_order, image_url', () => {
    const f = schema.mapRowToForm({
      id: 5,
      slug: 'hero-2026',
      title_zh: '十周年',
      image_url: 'https://cdn.bangdream.org/posts/x.jpg',
      sort_order: 3,
      active: 1,
      published_at: 1700000000,
    })
    expect(f.active).toBe(true)
    expect(f.active_display).toBe('是')
    expect(f.sort_order).toBe(3)
    expect(f.image_url).toBe('https://cdn.bangdream.org/posts/x.jpg')
  })

  it('mapFormToCreate auto-generates slug when blank', () => {
    const body = schema.mapFormToCreate({
      slug: '',
      title_zh: 'Hello World',
      sort_order: 0,
      active: true,
    })
    expect(typeof body.slug).toBe('string')
    expect(body.slug.length).toBeGreaterThan(0)
  })

  it('mapFormToCreate strips empty strings to null', () => {
    const body = schema.mapFormToCreate({
      slug: 'x',
      title_zh: '',
      title_en: '',
      body_md: '',
      image_url: '',
      link_url: '',
      published_at: '',
      sort_order: 0,
      active: true,
    })
    expect(body.title_zh).toBeNull()
    expect(body.image_url).toBeNull()
    expect(body.link_url).toBeNull()
    expect(body.published_at).toBeNull()
  })

  it('emptyForm has expected defaults', () => {
    const e = schema.emptyForm()
    expect(e.active).toBe(true)
    expect(e.sort_order).toBe(0)
  })
})

describe('socialLinks schema (R7)', () => {
  const schema = d1Schemas.socialLinks

  it('mapRowToForm handles missing fields', () => {
    expect(schema.mapRowToForm({}).platform).toBe('')
    expect(schema.mapRowToForm({}).active).toBe(false)
  })

  it('mapFormToCreate keeps required platform/url, strips optional empties', () => {
    const body = schema.mapFormToCreate({
      platform: 'discord',
      label_zh: 'Discord',
      label_en: '',
      url: 'https://discord.gg/abc',
      icon: '',
      sort_order: 1,
      active: true,
    })
    expect(body.platform).toBe('discord')
    expect(body.url).toBe('https://discord.gg/abc')
    expect(body.label_en).toBeNull()
    expect(body.icon).toBeNull()
  })

  it('mapFormToCreate sort_order coerces from string', () => {
    const body = schema.mapFormToCreate({
      platform: 'qq',
      label_zh: 'QQ',
      url: 'https://qm.qq.com/',
      sort_order: '7',
      active: true,
    })
    expect(body.sort_order).toBe(7)
  })

  it('emptyForm initializes active=true, sort_order=0', () => {
    const e = schema.emptyForm()
    expect(e.active).toBe(true)
    expect(e.sort_order).toBe(0)
  })

  it('listColumns include platform + url', () => {
    expect(schema.listColumns.some((c) => c.key === 'platform')).toBe(true)
    expect(schema.listColumns.some((c) => c.key === 'url')).toBe(true)
  })
})

describe('aboutSections schema (R7)', () => {
  const schema = d1Schemas.aboutSections

  it('validateForm flags missing slug/title_zh/body_md', () => {
    const errors = validateForm(schema, {})
    expect(errors.map((e) => e.key).sort()).toEqual(['body_md', 'slug', 'title_zh'])
  })

  it('mapRowToForm handles all-empty input', () => {
    const f = schema.mapRowToForm({})
    expect(f.slug).toBe('')
    expect(f.title_zh).toBe('')
    expect(f.body_md).toBe('')
  })

  it('mapFormToCreate preserves required body_md, strips empty optional', () => {
    const body = schema.mapFormToCreate({
      slug: 'mission',
      title_zh: '使命',
      title_en: '',
      body_md: '我们的使命……',
      sort_order: 0,
      active: true,
    })
    expect(body.body_md).toBe('我们的使命……')
    expect(body.title_en).toBeNull()
  })

  it('emptyForm sets active=true', () => {
    expect(schema.emptyForm().active).toBe(true)
  })
})

describe('validateForm', () => {
  it('returns no errors when required fields are filled', () => {
    const errors = validateForm(d1Schemas.news, {
      slug: '',
      title_zh: 'x',
      body_md: 'y',
      category: 'announcement',
      published_at: '1970-01-01T00:00:00Z',
    })
    expect(errors).toEqual([])
  })

  it('returns errors for missing required fields', () => {
    const errors = validateForm(d1Schemas.news, {})
    expect(errors.map((e) => e.key).sort()).toEqual(
      ['body_md', 'category', 'published_at', 'title_zh'].sort(),
    )
  })

  it('treats whitespace-only as empty', () => {
    const errors = validateForm(d1Schemas.news, {
      title_zh: '   ',
      body_md: 'y',
      category: 'announcement',
      published_at: '1970-01-01T00:00:00Z',
    })
    expect(errors.some((e) => e.key === 'title_zh')).toBe(true)
  })

  it('validates members.display_name required', () => {
    const errors = validateForm(d1Schemas.members, {})
    expect(errors.map((e) => e.key)).toContain('display_name')
  })

  it('validates categories slug+display_zh required', () => {
    const errors = validateForm(d1Schemas.categories, {})
    expect(errors.map((e) => e.key).sort()).toEqual(['display_zh', 'slug'])
  })
})
