/**
 * Pure adapters mapping API row shapes (snake_case from the Worker /
 * D1) to the legacy JSON shapes that the existing pure libs (news.js,
 * events.js, members.js) and presentational tracks (Members.mobile.jsx,
 * etc.) consume. Keeps R5b a single-place swap: shells fetch + adapt,
 * everything downstream stays untouched.
 *
 * All functions return new objects; inputs are never mutated.
 */

const SUMMARY_MAX_LEN = 200

function isoFromUnixSeconds(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return ''
  return new Date(sec * 1000).toISOString()
}

function firstParagraphSummary(body) {
  if (typeof body !== 'string' || body.length === 0) return ''
  const paragraphs = body.split(/\n{2,}/)
  const first = paragraphs[0]?.trim() ?? ''
  if (first.length <= SUMMARY_MAX_LEN) return first
  return first.slice(0, SUMMARY_MAX_LEN)
}

/**
 * Map API news row → legacy JSON news shape.
 * Legacy: { id, title, body, summary, date, tag, image, sourceUrl }
 * API:    { id, slug, title_zh, title_en, body_md, category, hero_image_url,
 *           tags, published_at, created_at, updated_at }
 */
export function adaptNewsRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const slug = typeof apiRow.slug === 'string' ? apiRow.slug : String(apiRow.id ?? '')
  const title = apiRow.title_zh ?? apiRow.title_en ?? ''
  const body = apiRow.body_md ?? ''
  return {
    id: slug,
    title,
    body,
    summary: firstParagraphSummary(body),
    date: isoFromUnixSeconds(apiRow.published_at),
    tag: apiRow.category ?? 'announcement',
    category: apiRow.category ?? 'announcement',
    image: apiRow.hero_image_url ?? null,
    sourceUrl: '',
  }
}

/**
 * Map API event row → legacy JSON event shape.
 * Legacy: { id, title, date, endDate, type, location, description, links,
 *           bands, image, ticketUrl }
 * API:    { id, slug, title_zh, description_md, hero_image_url, start_at,
 *           end_at, venue, city, scope, ticket_url, band_theme }
 *
 * Type is set to 'con' as a default so the existing type-filter chip
 * still produces visible rows; admin can extend later in R5.5.
 */
export function adaptEventRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const slug = typeof apiRow.slug === 'string' ? apiRow.slug : String(apiRow.id ?? '')
  const title = apiRow.title_zh ?? apiRow.title_en ?? ''
  const venue = apiRow.venue ?? null
  const city = apiRow.city ?? null
  const location =
    venue && city ? `${city} · ${venue}` : (city ?? venue ?? '')
  const bands =
    typeof apiRow.band_theme === 'string' && apiRow.band_theme.length > 0
      ? [apiRow.band_theme]
      : []
  return {
    id: slug,
    title,
    date: isoFromUnixSeconds(apiRow.start_at),
    endDate:
      typeof apiRow.end_at === 'number' && Number.isFinite(apiRow.end_at)
        ? isoFromUnixSeconds(apiRow.end_at)
        : null,
    type: 'con',
    location,
    description: apiRow.description_md ?? '',
    links: [],
    bands,
    image: apiRow.hero_image_url ?? null,
    ticketUrl: apiRow.ticket_url ?? '',
  }
}

/**
 * Map API member row → legacy JSON member shape.
 * Legacy: { id, name, role, oshiBand, oshiCharacter, pronouns, bio, city }
 * API:    { id, display_name, city, oshi_character, oshi_band, avatar_url,
 *           expedition_member, role, created_at, updated_at }
 *
 * Falls back to 'member' for older API responses lacking role
 * (pre-R5.5 0003 migration).
 */
export function adaptMemberRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const id =
    apiRow.external_id ??
    (apiRow.id !== undefined && apiRow.id !== null ? String(apiRow.id) : '')
  return {
    id,
    name: apiRow.display_name ?? '',
    role: apiRow.role ?? 'member',
    oshiBand: apiRow.oshi_band ?? null,
    oshiCharacter: apiRow.oshi_character ?? null,
    pronouns: null,
    bio: null,
    city: apiRow.city ?? null,
  }
}

export function adaptNewsList(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') return []
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  return items.map(adaptNewsRow).filter((x) => x !== null)
}

export function adaptEventList(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') return []
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  return items.map(adaptEventRow).filter((x) => x !== null)
}

export function adaptMemberList(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') return []
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  return items.map(adaptMemberRow).filter((x) => x !== null)
}

// ── R7: featured_posts → legacy posts shape ─────────────────────────────────
//
// Legacy posts.json shape: { id, title, image, url, datePosted }
// API featured_posts:      { id, slug, title_zh, title_en, body_md, image_url,
//                            link_url, published_at, sort_order, ... }

function isoDateFromUnixSeconds(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return ''
  return new Date(sec * 1000).toISOString().slice(0, 10)
}

export function adaptPostRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const slug = typeof apiRow.slug === 'string' ? apiRow.slug : String(apiRow.id ?? '')
  const title = apiRow.title_zh ?? apiRow.title_en ?? ''
  return {
    id: slug,
    title,
    image: apiRow.image_url ?? null,
    url: apiRow.link_url ?? '',
    datePosted: isoDateFromUnixSeconds(apiRow.published_at),
  }
}

export function adaptPostList(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') return []
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  return items.map(adaptPostRow).filter((x) => x !== null)
}

// ── R7: social_links → legacy social shape ─────────────────────────────────
//
// Legacy social.json shape: { platform, label, url, qrImage, enabled }
// API social_links:         { id, platform, label_zh, label_en, url, icon,
//                             sort_order, active }

export function adaptSocialRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const platform = typeof apiRow.platform === 'string' ? apiRow.platform : ''
  if (platform.length === 0) return null
  return {
    platform,
    label: apiRow.label_zh ?? apiRow.label_en ?? platform,
    url: typeof apiRow.url === 'string' ? apiRow.url : '',
    qrImage: apiRow.icon ?? null,
    enabled: apiRow.active === undefined ? true : apiRow.active === 1 || apiRow.active === true,
  }
}

export function adaptSocialList(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') return []
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  return items.map(adaptSocialRow).filter((x) => x !== null)
}

// ── R7: about_sections → legacy about shape ────────────────────────────────
//
// Legacy about.json shape: { mission, faq: [{q,a}], coc, joinInstructions }
// API about_sections:      list of { slug, title_zh, body_md, ... }
//
// Sections with slug='mission'|'coc'|'joinInstructions' → flat strings.
// Section with slug='faq' has body_md being a JSON-encoded array of {q,a}.

function parseFaqBody(body) {
  if (typeof body !== 'string') return []
  const trimmed = body.trim()
  if (trimmed.length === 0) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.q === 'string' &&
          typeof entry.a === 'string',
      )
      .map((entry) => ({ q: entry.q, a: entry.a }))
  } catch {
    return []
  }
}

export function adaptAboutSections(apiResponse) {
  if (!apiResponse || typeof apiResponse !== 'object') {
    return { mission: '', faq: [], coc: '', joinInstructions: '' }
  }
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  const out = { mission: '', faq: [], coc: '', joinInstructions: '' }
  for (const row of items) {
    if (!row || typeof row !== 'object') continue
    const slug = typeof row.slug === 'string' ? row.slug : ''
    const body = typeof row.body_md === 'string' ? row.body_md : ''
    if (slug === 'mission') out.mission = body
    else if (slug === 'coc') out.coc = body
    else if (slug === 'joinInstructions') out.joinInstructions = body
    else if (slug === 'faq') out.faq = parseFaqBody(body)
  }
  return out
}

export function adaptAboutRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const slug = typeof apiRow.slug === 'string' ? apiRow.slug : ''
  if (slug.length === 0) return null
  return {
    id: apiRow.id,
    slug,
    title_zh: apiRow.title_zh ?? '',
    title_en: apiRow.title_en ?? '',
    body_md: apiRow.body_md ?? '',
    sort_order: apiRow.sort_order ?? 0,
  }
}

// ── R7: settings rows (key, value) → legacy site.json flat object ──────────
//
// site.json shape: { discordInvite, communityName, communityNameZh,
//                    communityNameJp }
// Settings rows:   [{ key:'site.communityName', value:'…' }, ...]

const LEGACY_SITE_KEYS = [
  'discordInvite',
  'communityName',
  'communityNameZh',
  'communityNameJp',
]

const SITE_PREFIX = 'site.'

export function adaptSiteSettings(apiResponse) {
  const out = {}
  for (const k of LEGACY_SITE_KEYS) out[k] = ''
  if (!apiResponse || typeof apiResponse !== 'object') return out
  const items = Array.isArray(apiResponse.items) ? apiResponse.items : []
  for (const row of items) {
    if (!row || typeof row !== 'object') continue
    const k = typeof row.key === 'string' ? row.key : ''
    const v = typeof row.value === 'string' ? row.value : ''
    if (!k.startsWith(SITE_PREFIX)) continue
    const short = k.slice(SITE_PREFIX.length)
    out[short] = v
  }
  return out
}

export const __internals = {
  isoFromUnixSeconds,
  firstParagraphSummary,
  SUMMARY_MAX_LEN,
  isoDateFromUnixSeconds,
  parseFaqBody,
  LEGACY_SITE_KEYS,
}
