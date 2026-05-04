import { describe, it, expect } from 'vitest';
import {
  toUnixSeconds,
  normalizeSlug,
  flattenLocation,
  parseNewsRow,
  parseEventRow,
  parseMemberRow,
  parseCategoryRow,
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
