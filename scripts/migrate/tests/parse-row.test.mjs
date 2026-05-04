import { describe, it, expect } from 'vitest';
import {
  toUnixSeconds,
  normalizeSlug,
  flattenLocation,
  parseNewsRow,
  parseEventRow,
  parseMemberRow,
  parseCategoryRow,
  parseFeaturedPostRow,
  parseSocialLinkRow,
  parseAboutSectionRows,
  parseSiteSettings,
  rewriteImageUrl,
} from '../shared/parse-row.mjs';

const NOW = 1746230400; // 2025-05-03 00:00:00 UTC

// ─── toUnixSeconds ────────────────────────────────────────────────────────────
describe('toUnixSeconds', () => {
  it('parses ISO string with time', () => {
    expect(toUnixSeconds('2026-05-03T07:29:00.000Z')).toBe(1777793340);
  });

  it('parses date-only string as UTC midnight', () => {
    // 2026-05-03 UTC midnight
    expect(toUnixSeconds('2026-05-03')).toBe(1777766400);
  });

  it('passes through unix seconds number', () => {
    expect(toUnixSeconds(1746230400)).toBe(1746230400);
  });

  it('passes through unix seconds as float (floors)', () => {
    expect(toUnixSeconds(1746230400.9)).toBe(1746230400);
  });

  it('returns null for null', () => {
    expect(toUnixSeconds(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toUnixSeconds(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(toUnixSeconds('')).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(toUnixSeconds('not-a-date')).toBeNull();
  });

  it('returns null for number that looks too old (pre-2000)', () => {
    expect(toUnixSeconds(0)).toBeNull();
    expect(toUnixSeconds(-1)).toBeNull();
  });

  it('handles DST boundary — 2025-03-09 US spring-forward', () => {
    // "2025-03-09" should be midnight UTC regardless of local DST
    const result = toUnixSeconds('2025-03-09');
    expect(result).toBe(1741478400); // 2025-03-09T00:00:00Z
  });

  it('handles date-line — 2025-12-31', () => {
    expect(toUnixSeconds('2025-12-31')).toBe(1767139200); // 2025-12-31T00:00:00Z
  });

  it('handles ISO string with +08:00 offset', () => {
    const result = toUnixSeconds('2026-01-01T00:00:00+08:00');
    expect(result).toBe(1767196800); // 2025-12-31T16:00:00Z
  });
});

// ─── normalizeSlug ────────────────────────────────────────────────────────────
describe('normalizeSlug', () => {
  it('trims whitespace', () => {
    expect(normalizeSlug('  foo  ')).toBe('foo');
  });

  it('returns null for empty string', () => {
    expect(normalizeSlug('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeSlug(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeSlug(undefined)).toBeNull();
  });

  it('preserves Chinese characters', () => {
    expect(normalizeSlug('北美邦花篮-53萝p')).toBe('北美邦花篮-53萝p');
  });

  it('preserves very long slug (>255 chars)', () => {
    const long = 'a'.repeat(300);
    expect(normalizeSlug(long)).toBe(long);
  });

  it('preserves Arabic script characters', () => {
    expect(normalizeSlug('ــ')).toBe('ــ');
  });
});

// ─── flattenLocation ──────────────────────────────────────────────────────────
describe('flattenLocation', () => {
  it('returns {city: null, venue: null} for null', () => {
    expect(flattenLocation(null)).toEqual({ city: null, venue: null });
  });

  it('returns {city: null, venue: null} for undefined', () => {
    expect(flattenLocation(undefined)).toEqual({ city: null, venue: null });
  });

  it('treats string as city', () => {
    expect(flattenLocation('Chicago · Anime Central · US')).toEqual({
      city: 'Chicago · Anime Central · US',
      venue: null,
    });
  });

  it('extracts city and venue from object', () => {
    expect(flattenLocation({ city: 'Los Angeles', venue: 'Crypto.com Arena', country: 'US' })).toEqual({
      city: 'Los Angeles',
      venue: 'Crypto.com Arena',
    });
  });

  it('handles object missing venue', () => {
    expect(flattenLocation({ city: 'Seattle' })).toEqual({ city: 'Seattle', venue: null });
  });

  it('handles object missing city', () => {
    expect(flattenLocation({ venue: 'Some Place' })).toEqual({ city: null, venue: 'Some Place' });
  });

  it('handles empty object', () => {
    expect(flattenLocation({})).toEqual({ city: null, venue: null });
  });
});

// ─── parseNewsRow ─────────────────────────────────────────────────────────────
describe('parseNewsRow', () => {
  const base = {
    id: 'test-slug',
    title: 'Test Title',
    date: '2026-05-03',
    tag: 'announcement',
    summary: '',
    body: 'Body text',
    image: '/news/test.png',
    sourceUrl: '',
  };

  it('maps basic fields correctly', () => {
    const row = parseNewsRow(base, NOW);
    expect(row.slug).toBe('test-slug');
    expect(row.title_zh).toBe('Test Title');
    expect(row.body_md).toBe('Body text');
    expect(row.category).toBe('announcement');
    expect(row.hero_image_url).toBe('https://cdn.bangdream.org/news/test.png');
    expect(row.tags_json).toBe('[]');
    expect(row.draft).toBe(0);
    expect(row.created_at).toBe(NOW);
    expect(row.updated_at).toBe(NOW);
  });

  it('sets draft=1 when draft field truthy', () => {
    const row = parseNewsRow({ ...base, draft: true }, NOW);
    expect(row.draft).toBe(1);
  });

  it('defaults category to announcement when tag missing', () => {
    const row = parseNewsRow({ ...base, tag: undefined }, NOW);
    expect(row.category).toBe('announcement');
  });

  it('maps event tag', () => {
    const row = parseNewsRow({ ...base, tag: 'event' }, NOW);
    expect(row.category).toBe('event');
  });

  it('passes unknown tag through as-is', () => {
    const row = parseNewsRow({ ...base, tag: 'unknown-custom' }, NOW);
    expect(row.category).toBe('unknown-custom');
  });

  it('sets hero_image_url to null when image is empty', () => {
    const row = parseNewsRow({ ...base, image: '' }, NOW);
    expect(row.hero_image_url).toBeNull();
  });

  it('throws when id is missing', () => {
    expect(() => parseNewsRow({ ...base, id: '' }, NOW)).toThrow();
  });

  it('throws when date is invalid', () => {
    expect(() => parseNewsRow({ ...base, date: 'bad-date' }, NOW)).toThrow();
  });

  it('handles .jpg image extension', () => {
    const row = parseNewsRow({ ...base, image: '/news/foo.jpg' }, NOW);
    expect(row.hero_image_url).toBe('https://cdn.bangdream.org/news/foo.jpg');
  });
});

// ─── parseEventRow ────────────────────────────────────────────────────────────
describe('parseEventRow', () => {
  const base = {
    id: 'anime-expo',
    title: 'Anime Expo',
    date: '2026-07-02T07:47:00.000Z',
    endDate: '2026-07-06T07:47:00.000Z',
    type: 'concert',
    location: { city: 'Los Angeles', venue: 'Crypto.com Arena', country: 'US' },
    description: 'Big event',
    links: [],
    bands: ['Roselia'],
    image: '/events/anime-expo.png',
    ticketUrl: '',
  };

  it('maps basic fields', () => {
    const row = parseEventRow(base, NOW);
    expect(row.slug).toBe('anime-expo');
    expect(row.title_zh).toBe('Anime Expo');
    expect(row.city).toBe('Los Angeles');
    expect(row.venue).toBe('Crypto.com Arena');
    expect(row.band_theme).toBe('Roselia');
    expect(row.description_md).toBe('Big event');
  });

  it('maps start_at and end_at', () => {
    const row = parseEventRow(base, NOW);
    expect(row.start_at).toBe(toUnixSeconds('2026-07-02T07:47:00.000Z'));
    expect(row.end_at).toBe(toUnixSeconds('2026-07-06T07:47:00.000Z'));
  });

  it('handles null location', () => {
    const row = parseEventRow({ ...base, location: null }, NOW);
    expect(row.city).toBeNull();
    expect(row.venue).toBeNull();
  });

  it('handles string location', () => {
    const row = parseEventRow({ ...base, location: 'Chicago · US' }, NOW);
    expect(row.city).toBe('Chicago · US');
    expect(row.venue).toBeNull();
  });

  it('handles empty bands array', () => {
    const row = parseEventRow({ ...base, bands: [] }, NOW);
    expect(row.band_theme).toBeNull();
  });

  it('handles missing endDate', () => {
    const row = parseEventRow({ ...base, endDate: null }, NOW);
    expect(row.end_at).toBeNull();
  });

  it('handles empty image string', () => {
    const row = parseEventRow({ ...base, image: '' }, NOW);
    expect(row.hero_image_url).toBeNull();
  });

  it('throws when date is invalid', () => {
    expect(() => parseEventRow({ ...base, date: 'nope' }, NOW)).toThrow();
  });

  it('preserves ticketUrl when present', () => {
    const row = parseEventRow({ ...base, ticketUrl: 'https://tickets.example.com' }, NOW);
    expect(row.ticket_url).toBe('https://tickets.example.com');
  });

  it('sets ticket_url null when empty string', () => {
    const row = parseEventRow({ ...base, ticketUrl: '' }, NOW);
    expect(row.ticket_url).toBeNull();
  });
});

// ─── parseMemberRow ───────────────────────────────────────────────────────────
describe('parseMemberRow', () => {
  const base = { id: 'sherry', name: '-Sherry-', role: 'member', oshiBand: null, pronouns: null, bio: null };

  it('maps external_id from id', () => {
    const row = parseMemberRow(base, NOW);
    expect(row.external_id).toBe('sherry');
    expect(row.display_name).toBe('-Sherry-');
  });

  it('maps oshiBand', () => {
    const row = parseMemberRow({ ...base, oshiBand: 'Roselia' }, NOW);
    expect(row.oshi_band).toBe('Roselia');
  });

  it('sets oshi_band null when oshiBand is null', () => {
    const row = parseMemberRow(base, NOW);
    expect(row.oshi_band).toBeNull();
  });

  it('throws when id is missing', () => {
    expect(() => parseMemberRow({ ...base, id: '' }, NOW)).toThrow();
  });

  it('preserves Arabic script id', () => {
    const row = parseMemberRow({ ...base, id: 'ــ', name: 'ــ' }, NOW);
    expect(row.external_id).toBe('ــ');
  });

  it('sets expedition_member 0', () => {
    const row = parseMemberRow(base, NOW);
    expect(row.expedition_member).toBe(0);
  });

  // ── R5.5 role field ─────────────────────────────────────────────────────
  it('preserves role when valid', () => {
    expect(parseMemberRow({ ...base, role: 'organizer' }, NOW).role).toBe('organizer');
    expect(parseMemberRow({ ...base, role: 'alumnus' }, NOW).role).toBe('alumnus');
    expect(parseMemberRow({ ...base, role: 'cover-band-lead' }, NOW).role).toBe('cover-band-lead');
    expect(parseMemberRow({ ...base, role: 'member' }, NOW).role).toBe('member');
  });

  it('defaults role to member when missing', () => {
    expect(parseMemberRow({ ...base, role: undefined }, NOW).role).toBe('member');
    expect(parseMemberRow(base, NOW).role).toBe('member');
  });

  it('rejects unknown role into member fallback', () => {
    expect(parseMemberRow({ ...base, role: 'supreme-leader' }, NOW).role).toBe('member');
    expect(parseMemberRow({ ...base, role: '' }, NOW).role).toBe('member');
    expect(parseMemberRow({ ...base, role: null }, NOW).role).toBe('member');
  });
});

// ─── parseCategoryRow ─────────────────────────────────────────────────────────
describe('parseCategoryRow', () => {
  const base = { slug: 'announcement', display_zh: '公告', display_en: 'Announcement', accent_color: '--accent-coral', sort_order: 0 };

  it('maps all fields', () => {
    const row = parseCategoryRow(base, NOW);
    expect(row.slug).toBe('announcement');
    expect(row.display_zh).toBe('公告');
    expect(row.display_en).toBe('Announcement');
    expect(row.accent_color).toBe('--accent-coral');
    expect(row.active).toBe(1);
  });

  it('throws when slug is missing', () => {
    expect(() => parseCategoryRow({ ...base, slug: '' }, NOW)).toThrow();
  });

  it('defaults sort_order to 0', () => {
    const row = parseCategoryRow({ ...base, sort_order: undefined }, NOW);
    expect(row.sort_order).toBe(0);
  });
});

// ─── R7 parsers ───────────────────────────────────────────────────────────────

describe('parseFeaturedPostRow', () => {
  const VALID = {
    id: 'hero-2026',
    title: '十周年',
    image: '/posts/abc.jpg',
    url: 'https://example.com',
    datePosted: '2026-05-03',
  };

  it('maps full row, rewrites image to CDN, parses date', () => {
    const row = parseFeaturedPostRow(VALID, NOW, 0);
    expect(row.slug).toBe('hero-2026');
    expect(row.title_zh).toBe('十周年');
    expect(row.image_url).toBe('https://cdn.bangdream.org/posts/abc.jpg');
    expect(row.link_url).toBe('https://example.com');
    expect(row.published_at).toBe(1777766400);
    expect(row.sort_order).toBe(0);
    expect(row.active).toBe(1);
  });

  it('throws when id is missing/empty', () => {
    expect(() => parseFeaturedPostRow({ ...VALID, id: '' }, NOW, 0)).toThrow();
    expect(() => parseFeaturedPostRow({ ...VALID, id: null }, NOW, 0)).toThrow();
  });

  it('whitespace-only title becomes null', () => {
    const row = parseFeaturedPostRow({ ...VALID, title: '   ' }, NOW, 0);
    expect(row.title_zh).toBeNull();
  });

  it('empty/missing url becomes null', () => {
    const row1 = parseFeaturedPostRow({ ...VALID, url: '' }, NOW, 0);
    expect(row1.link_url).toBeNull();
    const row2 = parseFeaturedPostRow({ ...VALID, url: undefined }, NOW, 0);
    expect(row2.link_url).toBeNull();
  });

  it('invalid datePosted yields null published_at', () => {
    const row = parseFeaturedPostRow({ ...VALID, datePosted: 'not-a-date' }, NOW, 0);
    expect(row.published_at).toBeNull();
  });

  it('non-numeric sortOrder defaults to 0', () => {
    const row = parseFeaturedPostRow(VALID, NOW, 'oops');
    expect(row.sort_order).toBe(0);
  });
});

describe('parseSocialLinkRow', () => {
  const VALID = {
    platform: 'discord',
    label: 'Discord',
    url: 'https://discord.gg/abc',
    qrImage: null,
    enabled: true,
  };

  it('maps full enabled row to active=1', () => {
    const row = parseSocialLinkRow(VALID, NOW, 1);
    expect(row.platform).toBe('discord');
    expect(row.label_zh).toBe('Discord');
    expect(row.url).toBe('https://discord.gg/abc');
    expect(row.active).toBe(1);
    expect(row.sort_order).toBe(1);
  });

  it('throws when platform is missing', () => {
    expect(() => parseSocialLinkRow({ ...VALID, platform: '' }, NOW, 0)).toThrow();
  });

  it('disabled row → active=0', () => {
    const row = parseSocialLinkRow({ ...VALID, enabled: false }, NOW, 0);
    expect(row.active).toBe(0);
  });

  it('empty url → active=0 even if enabled=true', () => {
    const row = parseSocialLinkRow({ ...VALID, url: '' }, NOW, 0);
    expect(row.active).toBe(0);
  });

  it('label falls back to platform when missing', () => {
    const row = parseSocialLinkRow({ ...VALID, label: undefined }, NOW, 0);
    expect(row.label_zh).toBe('discord');
  });

  it('qrImage non-string preserved as null', () => {
    const row = parseSocialLinkRow({ ...VALID, qrImage: 42 }, NOW, 0);
    expect(row.icon).toBeNull();
  });
});

describe('parseAboutSectionRows', () => {
  it('returns empty array for null/non-object', () => {
    expect(parseAboutSectionRows(null, NOW)).toEqual([]);
    expect(parseAboutSectionRows(undefined, NOW)).toEqual([]);
    expect(parseAboutSectionRows('string', NOW)).toEqual([]);
  });

  it('emits 4 rows for full about.json', () => {
    const rows = parseAboutSectionRows(
      {
        mission: 'M',
        joinInstructions: 'J',
        coc: 'C',
        faq: [
          { q: 'Q1', a: 'A1' },
          { q: 'Q2', a: 'A2' },
        ],
      },
      NOW,
    );
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toEqual(['mission', 'joinInstructions', 'coc', 'faq']);
    expect(rows[3].body_md).toContain('Q1');
    expect(rows[3].body_md).toContain('A1');
    expect(rows[0].sort_order).toBe(0);
    expect(rows[3].sort_order).toBe(30);
  });

  it('skips empty mission/coc/joinInstructions', () => {
    const rows = parseAboutSectionRows(
      { mission: '', coc: '   ', joinInstructions: undefined, faq: [] },
      NOW,
    );
    expect(rows).toEqual([]);
  });

  it('drops malformed faq entries (missing q or a)', () => {
    const rows = parseAboutSectionRows(
      {
        mission: 'M',
        faq: [
          { q: 'Q', a: 'A' },
          { q: 'NoAns' },
          { a: 'NoQ' },
          'string',
        ],
      },
      NOW,
    );
    const faqRow = rows.find((r) => r.slug === 'faq');
    expect(faqRow).toBeDefined();
    const parsed = JSON.parse(faqRow.body_md);
    expect(parsed).toEqual([{ q: 'Q', a: 'A' }]);
  });

  it('skips faq row entirely when array is empty after filtering', () => {
    const rows = parseAboutSectionRows(
      { mission: 'M', faq: [{ q: 1 }] },
      NOW,
    );
    expect(rows.find((r) => r.slug === 'faq')).toBeUndefined();
  });

  it('all rows carry created_at + updated_at + active=1', () => {
    const rows = parseAboutSectionRows({ mission: 'M' }, NOW);
    expect(rows[0].created_at).toBe(NOW);
    expect(rows[0].updated_at).toBe(NOW);
    expect(rows[0].active).toBe(1);
  });
});

describe('parseSiteSettings', () => {
  it('returns [] for null/non-object', () => {
    expect(parseSiteSettings(null, NOW)).toEqual([]);
    expect(parseSiteSettings(42, NOW)).toEqual([]);
  });

  it('flattens flat string values to site.* keys', () => {
    const rows = parseSiteSettings(
      {
        communityName: 'BanG NA',
        communityNameZh: '北美邦',
        communityNameJp: '',
      },
      NOW,
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(map['site.communityName']).toBe('BanG NA');
    expect(map['site.communityNameZh']).toBe('北美邦');
    // Empty string skipped — no site.communityNameJp row.
    expect(map['site.communityNameJp']).toBeUndefined();
  });

  it('flattens nested objects with dotted paths', () => {
    const rows = parseSiteSettings(
      { ui: { tagline: { zh: '一起炸', en: 'Bandori' } } },
      NOW,
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(map['site.ui.tagline.zh']).toBe('一起炸');
    expect(map['site.ui.tagline.en']).toBe('Bandori');
  });

  it('serialises arrays as JSON', () => {
    const rows = parseSiteSettings({ tags: ['a', 'b'] }, NOW);
    expect(rows[0].key).toBe('site.tags');
    expect(JSON.parse(rows[0].value)).toEqual(['a', 'b']);
  });

  it('coerces numbers/booleans to strings', () => {
    const rows = parseSiteSettings({ year: 2026, active: true }, NOW);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(map['site.year']).toBe('2026');
    expect(map['site.active']).toBe('true');
  });

  it('drops null and undefined values', () => {
    const rows = parseSiteSettings(
      { a: null, b: undefined, c: 'keep' },
      NOW,
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(map['site.a']).toBeUndefined();
    expect(map['site.b']).toBeUndefined();
    expect(map['site.c']).toBe('keep');
  });

  it('updated_at carried on every row', () => {
    const rows = parseSiteSettings({ x: 'y' }, NOW);
    expect(rows[0].updated_at).toBe(NOW);
  });
});
