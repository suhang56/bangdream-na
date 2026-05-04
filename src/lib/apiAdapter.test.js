import { describe, it, expect } from 'vitest'
import {
  adaptNewsRow,
  adaptEventRow,
  adaptMemberRow,
  adaptNewsList,
  adaptEventList,
  adaptMemberList,
  adaptPostRow,
  adaptPostList,
  adaptSocialRow,
  adaptSocialList,
  adaptAboutSections,
  adaptAboutRow,
  adaptSiteSettings,
  __internals,
} from './apiAdapter.js'

describe('apiAdapter', () => {
  describe('adaptNewsRow', () => {
    it('maps full API row to legacy shape', () => {
      const apiRow = {
        id: 1,
        slug: 'my-news',
        title_zh: '中文标题',
        title_en: 'EN Title',
        body_md: 'Para 1 line A.\nPara 1 line B.\n\nPara 2.',
        category: 'event',
        hero_image_url: 'https://cdn.bangdream.org/news/x.png',
        tags: [],
        published_at: 1700000000,
        created_at: 1700000000,
        updated_at: 1700000000,
      }
      const out = adaptNewsRow(apiRow)
      expect(out.id).toBe('my-news')
      expect(out.title).toBe('中文标题')
      expect(out.body).toBe('Para 1 line A.\nPara 1 line B.\n\nPara 2.')
      expect(out.tag).toBe('event')
      expect(out.category).toBe('event')
      expect(out.image).toBe('https://cdn.bangdream.org/news/x.png')
      expect(out.sourceUrl).toBe('')
      expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('summary is first paragraph (newline-pair split)', () => {
      const out = adaptNewsRow({
        slug: 's',
        title_zh: 't',
        body_md: 'first paragraph\nstill first.\n\nsecond paragraph',
        category: 'announcement',
        published_at: 1700000000,
      })
      expect(out.summary).toBe('first paragraph\nstill first.')
    })

    it('summary truncates to SUMMARY_MAX_LEN chars', () => {
      const long = 'x'.repeat(__internals.SUMMARY_MAX_LEN + 50)
      const out = adaptNewsRow({
        slug: 's',
        title_zh: 't',
        body_md: long,
        category: 'announcement',
        published_at: 1700000000,
      })
      expect(out.summary.length).toBe(__internals.SUMMARY_MAX_LEN)
    })

    it('falls back to title_en when title_zh missing', () => {
      const out = adaptNewsRow({ slug: 's', title_en: 'EN only', body_md: '', category: 'announcement', published_at: 0 })
      expect(out.title).toBe('EN only')
    })

    it('returns null on null/undefined/non-object input', () => {
      expect(adaptNewsRow(null)).toBeNull()
      expect(adaptNewsRow(undefined)).toBeNull()
      expect(adaptNewsRow(42)).toBeNull()
      expect(adaptNewsRow('s')).toBeNull()
    })

    it('handles missing slug by stringifying numeric id', () => {
      const out = adaptNewsRow({ id: 7, title_zh: 't', body_md: '', category: 'announcement', published_at: 0 })
      expect(out.id).toBe('7')
    })

    it('defaults category to announcement when missing', () => {
      const out = adaptNewsRow({ slug: 's', title_zh: 't', body_md: '', published_at: 0 })
      expect(out.tag).toBe('announcement')
      expect(out.category).toBe('announcement')
    })

    it('null hero_image_url stays null', () => {
      const out = adaptNewsRow({ slug: 's', title_zh: 't', body_md: '', category: 'announcement', hero_image_url: null, published_at: 0 })
      expect(out.image).toBeNull()
    })

    it('non-finite published_at gives empty date string', () => {
      const out = adaptNewsRow({ slug: 's', title_zh: 't', body_md: '', category: 'announcement', published_at: NaN })
      expect(out.date).toBe('')
    })

    it('zero body_md gives empty summary', () => {
      const out = adaptNewsRow({ slug: 's', title_zh: 't', body_md: '', category: 'announcement', published_at: 0 })
      expect(out.summary).toBe('')
    })
  })

  describe('adaptEventRow', () => {
    it('maps full API row to legacy shape', () => {
      const apiRow = {
        id: 1,
        slug: 'expo-2099',
        title_zh: 'Expo',
        title_en: null,
        description_md: 'Big convention.',
        hero_image_url: 'https://cdn.bangdream.org/events/expo.png',
        start_at: 1700000000,
        end_at: 1700100000,
        venue: 'Hall A',
        city: 'San Francisco',
        scope: null,
        ticket_url: 'https://tickets.example/expo',
        band_theme: 'Roselia',
      }
      const out = adaptEventRow(apiRow)
      expect(out.id).toBe('expo-2099')
      expect(out.title).toBe('Expo')
      expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(out.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(out.type).toBe('con')
      expect(out.location).toBe('San Francisco · Hall A')
      expect(out.description).toBe('Big convention.')
      expect(out.bands).toEqual(['Roselia'])
      expect(out.image).toBe('https://cdn.bangdream.org/events/expo.png')
      expect(out.ticketUrl).toBe('https://tickets.example/expo')
      expect(out.links).toEqual([])
    })

    it('returns null on null/non-object input', () => {
      expect(adaptEventRow(null)).toBeNull()
      expect(adaptEventRow(undefined)).toBeNull()
      expect(adaptEventRow('s')).toBeNull()
    })

    it('end_at null → endDate null', () => {
      const out = adaptEventRow({
        slug: 'e',
        title_zh: 't',
        start_at: 1700000000,
        end_at: null,
      })
      expect(out.endDate).toBeNull()
    })

    it('non-finite end_at → endDate null', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1, end_at: NaN })
      expect(out.endDate).toBeNull()
    })

    it('city only → location is city', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1, city: 'Tokyo', venue: null })
      expect(out.location).toBe('Tokyo')
    })

    it('venue only → location is venue', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1, city: null, venue: 'Hall' })
      expect(out.location).toBe('Hall')
    })

    it('both city + venue null → empty location', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1 })
      expect(out.location).toBe('')
    })

    it('null band_theme → empty bands array', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1, band_theme: null })
      expect(out.bands).toEqual([])
    })

    it('empty band_theme string → empty bands array', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1, band_theme: '' })
      expect(out.bands).toEqual([])
    })

    it('missing description → empty string', () => {
      const out = adaptEventRow({ slug: 'e', title_zh: 't', start_at: 1 })
      expect(out.description).toBe('')
    })
  })

  describe('adaptMemberRow', () => {
    it('maps full API row to legacy shape', () => {
      const apiRow = {
        id: 42,
        external_id: 'member-42',
        display_name: '群友A',
        city: 'Seattle',
        oshi_character: 'Yukina',
        oshi_band: 'Roselia',
        avatar_url: 'https://cdn.bangdream.org/members/x.png',
        expedition_member: 1,
      }
      const out = adaptMemberRow(apiRow)
      expect(out.id).toBe('member-42')
      expect(out.name).toBe('群友A')
      expect(out.role).toBe('member')
      expect(out.oshiBand).toBe('Roselia')
      expect(out.oshiCharacter).toBe('Yukina')
      expect(out.city).toBe('Seattle')
      expect(out.pronouns).toBeNull()
      expect(out.bio).toBeNull()
    })

    it('falls back to numeric id when external_id missing', () => {
      const out = adaptMemberRow({ id: 99, display_name: 'X' })
      expect(out.id).toBe('99')
    })

    it('returns null on null/non-object input', () => {
      expect(adaptMemberRow(null)).toBeNull()
      expect(adaptMemberRow(undefined)).toBeNull()
      expect(adaptMemberRow('s')).toBeNull()
    })

    it('null oshi_band stays null', () => {
      const out = adaptMemberRow({ id: 1, display_name: 'X', oshi_band: null })
      expect(out.oshiBand).toBeNull()
    })

    it('missing display_name yields empty string', () => {
      const out = adaptMemberRow({ id: 1 })
      expect(out.name).toBe('')
    })

    it('passes role through when present (R5.5)', () => {
      expect(adaptMemberRow({ id: 1, role: 'organizer' }).role).toBe('organizer')
      expect(adaptMemberRow({ id: 1, role: 'alumnus' }).role).toBe('alumnus')
      expect(adaptMemberRow({ id: 1, role: 'cover-band-lead' }).role).toBe('cover-band-lead')
    })

    it('falls back to "member" when role missing or null (R5.5)', () => {
      expect(adaptMemberRow({ id: 1 }).role).toBe('member')
      expect(adaptMemberRow({ id: 1, role: null }).role).toBe('member')
    })
  })

  describe('list adapters', () => {
    it('adaptNewsList maps items array', () => {
      const out = adaptNewsList({
        items: [
          { slug: 'a', title_zh: 'A', body_md: '', category: 'event', published_at: 0 },
          { slug: 'b', title_zh: 'B', body_md: '', category: 'event', published_at: 0 },
        ],
        total: 2,
      })
      expect(out).toHaveLength(2)
      expect(out[0].id).toBe('a')
      expect(out[1].id).toBe('b')
    })

    it('adaptNewsList returns [] for null/undefined/missing items', () => {
      expect(adaptNewsList(null)).toEqual([])
      expect(adaptNewsList(undefined)).toEqual([])
      expect(adaptNewsList({})).toEqual([])
      expect(adaptNewsList({ items: 'not-array' })).toEqual([])
    })

    it('adaptEventList maps items array', () => {
      const out = adaptEventList({
        items: [
          { slug: 'e1', title_zh: 'E1', start_at: 1 },
          { slug: 'e2', title_zh: 'E2', start_at: 2 },
        ],
        total: 2,
      })
      expect(out).toHaveLength(2)
      expect(out[0].id).toBe('e1')
    })

    it('adaptMemberList maps items array', () => {
      const out = adaptMemberList({
        items: [
          { id: 1, display_name: 'A' },
          { id: 2, display_name: 'B' },
        ],
        total: 2,
      })
      expect(out).toHaveLength(2)
      expect(out[0].name).toBe('A')
    })

    it('list adapters drop nulls from invalid rows', () => {
      const out = adaptNewsList({ items: [null, { slug: 'a', title_zh: 'A', body_md: '', category: 'event', published_at: 0 }, undefined] })
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('a')
    })
  })

  describe('isoFromUnixSeconds (internals)', () => {
    it('returns ISO string for valid seconds', () => {
      const out = __internals.isoFromUnixSeconds(0)
      expect(out).toBe('1970-01-01T00:00:00.000Z')
    })

    it('returns empty string for non-finite values', () => {
      expect(__internals.isoFromUnixSeconds(NaN)).toBe('')
      expect(__internals.isoFromUnixSeconds(Infinity)).toBe('')
      expect(__internals.isoFromUnixSeconds(null)).toBe('')
      expect(__internals.isoFromUnixSeconds(undefined)).toBe('')
    })
  })

  describe('firstParagraphSummary (internals)', () => {
    it('returns empty for non-string', () => {
      expect(__internals.firstParagraphSummary(null)).toBe('')
      expect(__internals.firstParagraphSummary(42)).toBe('')
    })

    it('trims trailing whitespace from first paragraph', () => {
      expect(__internals.firstParagraphSummary('hello   \n\nworld')).toBe('hello')
    })
  })

  // ── R7 adapters ───────────────────────────────────────────────────────────

  describe('adaptPostRow', () => {
    it('returns null for null/non-object input', () => {
      expect(adaptPostRow(null)).toBeNull()
      expect(adaptPostRow(undefined)).toBeNull()
      expect(adaptPostRow(42)).toBeNull()
    })

    it('maps full row to legacy posts.json shape', () => {
      const row = {
        id: 7,
        slug: 'hero-2026',
        title_zh: '十周年',
        image_url: 'https://cdn/x.jpg',
        link_url: 'https://example.com/news',
        published_at: 1700000000,
      }
      const out = adaptPostRow(row)
      expect(out.id).toBe('hero-2026')
      expect(out.title).toBe('十周年')
      expect(out.image).toBe('https://cdn/x.jpg')
      expect(out.url).toBe('https://example.com/news')
      expect(out.datePosted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('handles missing optional fields gracefully', () => {
      const out = adaptPostRow({ id: 1, slug: 's', title_zh: 't' })
      expect(out.image).toBeNull()
      expect(out.url).toBe('')
      expect(out.datePosted).toBe('')
    })

    it('falls back to title_en when title_zh missing', () => {
      const out = adaptPostRow({ slug: 'x', title_en: 'EN Title' })
      expect(out.title).toBe('EN Title')
    })

    it('uses id as slug fallback when slug missing', () => {
      const out = adaptPostRow({ id: 42 })
      expect(out.id).toBe('42')
    })
  })

  describe('adaptPostList', () => {
    it('returns [] for non-object/empty input', () => {
      expect(adaptPostList(null)).toEqual([])
      expect(adaptPostList({})).toEqual([])
      expect(adaptPostList({ items: 'not-array' })).toEqual([])
    })

    it('maps an array of rows', () => {
      const out = adaptPostList({ items: [{ id: 1, slug: 'a' }, { id: 2, slug: 'b' }] })
      expect(out.length).toBe(2)
      expect(out[0].id).toBe('a')
    })
  })

  describe('adaptSocialRow', () => {
    it('returns null for null/missing platform', () => {
      expect(adaptSocialRow(null)).toBeNull()
      expect(adaptSocialRow({})).toBeNull()
      expect(adaptSocialRow({ platform: '' })).toBeNull()
    })

    it('maps full row to legacy social shape', () => {
      const out = adaptSocialRow({
        platform: 'discord',
        label_zh: 'Discord',
        url: 'https://discord.gg/abc',
        icon: null,
        active: 1,
      })
      expect(out.platform).toBe('discord')
      expect(out.label).toBe('Discord')
      expect(out.url).toBe('https://discord.gg/abc')
      expect(out.qrImage).toBeNull()
      expect(out.enabled).toBe(true)
    })

    it('falls back to platform name when label missing', () => {
      const out = adaptSocialRow({ platform: 'qq', url: 'https://qm.qq.com' })
      expect(out.label).toBe('qq')
    })

    it('treats active=0 as enabled=false', () => {
      const out = adaptSocialRow({ platform: 'wechat', label_zh: '微信', url: '', active: 0 })
      expect(out.enabled).toBe(false)
    })

    it('defaults enabled=true when active field missing entirely', () => {
      // Public endpoint omits `active` (it always returns active=1).
      const out = adaptSocialRow({ platform: 'x', label_zh: 'X', url: 'https://x.com' })
      expect(out.enabled).toBe(true)
    })
  })

  describe('adaptSocialList', () => {
    it('returns [] for non-object', () => {
      expect(adaptSocialList(null)).toEqual([])
      expect(adaptSocialList({ items: [] })).toEqual([])
    })

    it('drops rows with empty platform', () => {
      const out = adaptSocialList({
        items: [
          { platform: 'discord', label_zh: 'D', url: 'https://discord.gg/x' },
          { platform: '', label_zh: 'X', url: 'https://x' },
        ],
      })
      expect(out.length).toBe(1)
    })
  })

  describe('adaptAboutSections', () => {
    it('returns empty stub for null/non-object', () => {
      const out = adaptAboutSections(null)
      expect(out.mission).toBe('')
      expect(out.faq).toEqual([])
      expect(out.coc).toBe('')
      expect(out.joinInstructions).toBe('')
    })

    it('flattens slug=mission/coc/joinInstructions into top-level strings', () => {
      const out = adaptAboutSections({
        items: [
          { slug: 'mission', body_md: 'Mission body' },
          { slug: 'coc', body_md: 'COC body' },
          { slug: 'joinInstructions', body_md: 'How to join' },
        ],
      })
      expect(out.mission).toBe('Mission body')
      expect(out.coc).toBe('COC body')
      expect(out.joinInstructions).toBe('How to join')
    })

    it('parses faq slug body as JSON array of {q,a}', () => {
      const out = adaptAboutSections({
        items: [
          {
            slug: 'faq',
            body_md: '[{"q":"Q1","a":"A1"},{"q":"Q2","a":"A2"}]',
          },
        ],
      })
      expect(out.faq).toEqual([
        { q: 'Q1', a: 'A1' },
        { q: 'Q2', a: 'A2' },
      ])
    })

    it('faq with malformed JSON falls back to empty array', () => {
      const out = adaptAboutSections({
        items: [{ slug: 'faq', body_md: 'not-json' }],
      })
      expect(out.faq).toEqual([])
    })

    it('faq filters non-{q,a} entries defensively', () => {
      const out = adaptAboutSections({
        items: [
          {
            slug: 'faq',
            body_md: '[{"q":"Q","a":"A"},{"x":1},{"q":"Q2"}]',
          },
        ],
      })
      expect(out.faq).toEqual([{ q: 'Q', a: 'A' }])
    })

    it('ignores unknown slugs', () => {
      const out = adaptAboutSections({
        items: [{ slug: 'random', body_md: 'whatever' }],
      })
      expect(out.mission).toBe('')
      expect(out.coc).toBe('')
    })
  })

  describe('adaptAboutRow', () => {
    it('returns null for null/missing slug', () => {
      expect(adaptAboutRow(null)).toBeNull()
      expect(adaptAboutRow({})).toBeNull()
    })

    it('maps a section row to admin-friendly shape', () => {
      const out = adaptAboutRow({
        id: 5,
        slug: 'mission',
        title_zh: '使命',
        title_en: 'Mission',
        body_md: 'body',
        sort_order: 0,
      })
      expect(out.id).toBe(5)
      expect(out.slug).toBe('mission')
      expect(out.title_zh).toBe('使命')
    })
  })

  describe('adaptSiteSettings', () => {
    it('returns empty default object for null/non-object', () => {
      const out = adaptSiteSettings(null)
      expect(out).toEqual({
        discordInvite: '',
        communityName: '',
        communityNameZh: '',
        communityNameJp: '',
      })
    })

    it('flattens site.* keys to legacy field names', () => {
      const out = adaptSiteSettings({
        items: [
          { key: 'site.communityName', value: 'BanG Dream NA' },
          { key: 'site.communityNameZh', value: '北美邦' },
          { key: 'site.communityNameJp', value: 'バンドリ' },
          { key: 'site.discordInvite', value: 'https://discord.gg/abc' },
        ],
      })
      expect(out.communityName).toBe('BanG Dream NA')
      expect(out.communityNameZh).toBe('北美邦')
      expect(out.communityNameJp).toBe('バンドリ')
      expect(out.discordInvite).toBe('https://discord.gg/abc')
    })

    it('ignores rows without site. prefix', () => {
      const out = adaptSiteSettings({
        items: [
          { key: 'site.communityName', value: 'X' },
          { key: 'webhook.comment.url', value: 'https://hook/' },
        ],
      })
      expect(out.communityName).toBe('X')
      // No leakage into the flat object.
      expect(Object.values(out)).not.toContain('https://hook/')
    })

    it('handles missing values defensively', () => {
      const out = adaptSiteSettings({
        items: [{ key: 'site.communityName' }],
      })
      // No throw; missing string value treated as ''.
      expect(out.communityName).toBe('')
    })

    it('preserves arbitrary site.* short keys (forward-compatible)', () => {
      const out = adaptSiteSettings({
        items: [{ key: 'site.tagline', value: 'forever bandori' }],
      })
      expect(out.tagline).toBe('forever bandori')
    })
  })
})
