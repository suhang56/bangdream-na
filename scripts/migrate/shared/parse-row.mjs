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

/**
 * Map a posts.json item → D1 featured_posts row object.
 *
 * Legacy posts.json shape: { id, title, image, url, datePosted }
 * Image paths like "/posts/foo.jpg" are rewritten to CDN urls so the row
 * is portable; the backfill script also uploads the file to R2 first.
 */
export function parseFeaturedPostRow(item, nowSec, sortOrder) {
  const slug = normalizeSlug(item.id);
  if (!slug) throw new Error(`post item missing id: ${JSON.stringify(item)}`);
  return {
    slug,
    title_zh: typeof item.title === 'string' && item.title.trim().length > 0 ? item.title.trim() : null,
    title_en: null,
    body_md: null,
    image_url: rewriteImageUrl(item.image),
    link_url: typeof item.url === 'string' && item.url.length > 0 ? item.url : null,
    published_at: toUnixSeconds(item.datePosted),
    sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
    active: 1,
    created_at: nowSec,
    updated_at: nowSec,
  };
}

/**
 * Map a social.json item → D1 social_links row object.
 */
export function parseSocialLinkRow(item, nowSec, sortOrder) {
  const platform = typeof item.platform === 'string' ? item.platform.trim() : '';
  if (!platform) throw new Error(`social item missing platform: ${JSON.stringify(item)}`);
  const url = typeof item.url === 'string' ? item.url.trim() : '';
  return {
    platform,
    label_zh: typeof item.label === 'string' && item.label.length > 0 ? item.label : platform,
    label_en: null,
    url,
    icon: typeof item.qrImage === 'string' && item.qrImage.length > 0 ? item.qrImage : null,
    sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
    active: item.enabled === true && url.length > 0 ? 1 : 0,
    created_at: nowSec,
    updated_at: nowSec,
  };
}

/**
 * Map an about.json structure → array of D1 about_sections rows.
 *
 * Legacy about.json: { mission, faq: [{q,a}], coc, joinInstructions }
 *
 * R7 splits this into 4 rows:
 *   slug='mission', sort=0
 *   slug='joinInstructions', sort=10
 *   slug='coc', sort=20
 *   slug='faq', sort=30 (body_md = JSON-encoded faq array)
 *
 * Sections with empty body are skipped so rendering stays clean.
 */
export function parseAboutSectionRows(about, nowSec) {
  if (!about || typeof about !== 'object') return [];
  const rows = [];
  const seedRow = (slug, titleZh, body, sortOrder) => {
    if (typeof body !== 'string' || body.trim().length === 0) return;
    rows.push({
      slug,
      title_zh: titleZh,
      title_en: null,
      body_md: body,
      sort_order: sortOrder,
      active: 1,
      created_at: nowSec,
      updated_at: nowSec,
    });
  };
  seedRow('mission', '使命', about.mission, 0);
  seedRow('joinInstructions', '加入我们', about.joinInstructions, 10);
  seedRow('coc', '群规', about.coc, 20);
  if (Array.isArray(about.faq) && about.faq.length > 0) {
    const faqValid = about.faq.filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.q === 'string' &&
        typeof entry.a === 'string',
    );
    if (faqValid.length > 0) {
      rows.push({
        slug: 'faq',
        title_zh: 'FAQ',
        title_en: null,
        body_md: JSON.stringify(faqValid),
        sort_order: 30,
        active: 1,
        created_at: nowSec,
        updated_at: nowSec,
      });
    }
  }
  return rows;
}

/**
 * Flatten site.json → array of settings rows {key, value, updated_at}.
 * Nested objects use dotted paths under `site.`.
 *
 * Empty strings/null/undefined are dropped (no point storing empties).
 */
export function parseSiteSettings(site, nowSec) {
  if (!site || typeof site !== 'object') return [];
  const rows = [];
  function visit(value, path) {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      if (value.length === 0) return;
      rows.push({ key: path, value, updated_at: nowSec });
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      rows.push({ key: path, value: String(value), updated_at: nowSec });
      return;
    }
    if (Array.isArray(value)) {
      // Arrays serialised as JSON — admin would manage these via a dedicated
      // editor; fine for site metadata which is mostly flat.
      rows.push({ key: path, value: JSON.stringify(value), updated_at: nowSec });
      return;
    }
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        visit(v, `${path}.${k}`);
      }
    }
  }
  for (const [k, v] of Object.entries(site)) {
    visit(v, `site.${k}`);
  }
  return rows;
}
