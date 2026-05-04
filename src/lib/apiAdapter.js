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
 *           expedition_member, created_at, updated_at }
 *
 * `role` is hardcoded to 'member' since R-phase D1 schema doesn't carry
 * it (member roster is presented uniformly today). Reviewer/admin tier
 * can extend in a later phase.
 */
export function adaptMemberRow(apiRow) {
  if (!apiRow || typeof apiRow !== 'object') return null
  const id =
    apiRow.external_id ??
    (apiRow.id !== undefined && apiRow.id !== null ? String(apiRow.id) : '')
  return {
    id,
    name: apiRow.display_name ?? '',
    role: 'member',
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

export const __internals = { isoFromUnixSeconds, firstParagraphSummary, SUMMARY_MAX_LEN }
