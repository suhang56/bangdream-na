/**
 * JSON → D1 row mapping helpers.
 * All functions are pure (no side effects) to keep them testable.
 */

const CDN_BASE = 'https://cdn.bangdream.org';

/**
 * Rewrite a local image path like /news/foo.png → CDN URL.
 * Already-absolute URLs (http/https) are returned unchanged.
 * Empty string or null/undefined → null.
 */
export function rewriteImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // strip leading slash for CDN path
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${CDN_BASE}/${path}`;
}

/**
 * Parse a date value (ISO string, date-only string "YYYY-MM-DD", or unix seconds number)
 * into unix seconds INTEGER. Returns null for null/undefined/invalid.
 *
 * Treats "YYYY-MM-DD" as midnight UTC to avoid DST / date-line ambiguity.
 */
export function toUnixSeconds(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // already unix seconds (sanity: must be > 0 and plausibly a year after 2000)
    if (value > 946684800) return Math.floor(value);
    return null;
  }
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    // "YYYY-MM-DD" — parse as UTC midnight to avoid local-timezone shift
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    const d = dateOnly ? new Date(`${value.trim()}T00:00:00Z`) : new Date(value);
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }
  return null;
}

/**
 * Normalise a slug: trim whitespace only.
 * The JSON ids are already kebab-case or Chinese slug strings; we preserve them as-is.
 * Returns null for empty/null input.
 */
export function normalizeSlug(value) {
  if (!value) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Flatten a location value (string | {city, venue, country} | null) into {city, venue}.
 */
export function flattenLocation(location) {
  if (!location) return { city: null, venue: null };
  if (typeof location === 'string') return { city: location, venue: null };
  return {
    city: location.city ?? null,
    venue: location.venue ?? null,
  };
}

/**
 * Map a news JSON row → D1 news_posts row object.
 * Unknown tag values are inserted as-is (admin can reassign later).
 */
export function parseNewsRow(item, nowSec) {
  const slug = normalizeSlug(item.id);
  if (!slug) throw new Error(`news item missing id: ${JSON.stringify(item)}`);
  const publishedAt = toUnixSeconds(item.date);
  if (publishedAt === null) throw new Error(`news item "${slug}" has unparseable date: ${item.date}`);
  return {
    slug,
    title_zh: item.title ?? '',
    title_en: null,
    body_md: item.body ?? '',
    category: item.tag ?? 'announcement',
    hero_image_url: rewriteImageUrl(item.image),
    tags_json: '[]',
    published_at: publishedAt,
    created_at: nowSec,
    updated_at: nowSec,
    draft: item.draft ? 1 : 0,
  };
}

/**
 * Map an events JSON row → D1 events row object.
 */
export function parseEventRow(item, nowSec) {
  const slug = normalizeSlug(item.id);
  if (!slug) throw new Error(`event item missing id: ${JSON.stringify(item)}`);
  const startAt = toUnixSeconds(item.date);
  if (startAt === null) throw new Error(`event item "${slug}" has unparseable date: ${item.date}`);
  const { city, venue } = flattenLocation(item.location);
  const bands = Array.isArray(item.bands) ? item.bands : [];
  return {
    slug,
    title_zh: item.title ?? '',
    title_en: null,
    description_md: item.description ?? null,
    hero_image_url: rewriteImageUrl(item.image),
    start_at: startAt,
    end_at: toUnixSeconds(item.endDate),
    venue,
    city,
    scope: null,
    ticket_url: item.ticketUrl || null,
    band_theme: bands.length > 0 ? bands[0] : null,
    created_at: nowSec,
    updated_at: nowSec,
  };
}

const VALID_MEMBER_ROLES = new Set([
  'organizer',
  'member',
  'alumnus',
  'cover-band-lead',
]);

/**
 * Map a members JSON row → D1 members row object.
 * `role` falls back to 'member' when missing or unrecognised — matches
 * the 0003_add_members_role.sql DEFAULT and CHECK constraint.
 */
export function parseMemberRow(item, nowSec) {
  const externalId = normalizeSlug(item.id);
  if (!externalId) throw new Error(`member item missing id: ${JSON.stringify(item)}`);
  const role = VALID_MEMBER_ROLES.has(item.role) ? item.role : 'member';
  return {
    display_name: item.name ?? '',
    city: null,
    oshi_character: null,
    oshi_band: item.oshiBand ?? null,
    avatar_url: null,
    expedition_member: 0,
    external_id: externalId,
    role,
    created_at: nowSec,
    updated_at: nowSec,
  };
}

/**
 * Map a categories seed object → D1 categories row object.
 */
export function parseCategoryRow(item, nowSec) {
  const slug = normalizeSlug(item.slug);
  if (!slug) throw new Error(`category missing slug: ${JSON.stringify(item)}`);
  return {
    slug,
    display_zh: item.display_zh ?? '',
    display_en: item.display_en ?? null,
    accent_color: item.accent_color ?? null,
    sort_order: item.sort_order ?? 0,
    active: 1,
    created_at: nowSec,
    updated_at: nowSec,
  };
}
