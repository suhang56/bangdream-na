/**
 * Typed fetch wrappers for the Cloudflare Worker API at api.bangdream.org.
 *
 * Public reads use credentials:'omit' (cacheable, anonymous).
 * Auth/admin/upload endpoints use credentials:'include' so the
 * __Host-bdna_session cookie travels.
 *
 * VITE_API_BASE is read at build time from import.meta.env. In dev/test
 * environments where the var is absent, falls back to the production origin.
 */

import { cache } from './cache.js'

const FALLBACK_API_BASE = 'https://api.bangdream.org'

const PUBLIC_READ_TTL_MS = 15_000

function readApiBase() {
  // Vite injects import.meta.env at build time; tests stub it.
  // Be defensive — Node test runners may not define import.meta.env.
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      const v = import.meta.env.VITE_API_BASE
      if (typeof v === 'string' && v.length > 0) return v.replace(/\/+$/, '')
    }
  } catch {
    /* no-op */
  }
  return FALLBACK_API_BASE
}

export const API_BASE = readApiBase()

export class ApiError extends Error {
  constructor(message, { status, body, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status ?? 0
    this.body = body ?? null
    this.code = code ?? null
  }
}

async function readJsonSafe(res) {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function throwForBadStatus(res, label) {
  if (res.ok) return
  const body = await readJsonSafe(res)
  const code = body && typeof body.error === 'string' ? body.error : null
  const msg = code ? `${label} ${res.status} ${code}` : `${label} ${res.status}`
  throw new ApiError(msg, { status: res.status, body, code })
}

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (!path.startsWith('/')) return `${API_BASE}/${path}`
  return `${API_BASE}${path}`
}

// ── Auth / session ───────────────────────────────────────────────────────────

/**
 * Fetch the current user from the JWT cookie.
 * Returns { user: { id, github_login, display_name, avatar_url, role } } when authed.
 * Returns null when 401 (unauthenticated).
 * Throws ApiError on other non-2xx.
 */
export async function fetchMe() {
  const res = await fetch(buildUrl('/api/me'), {
    method: 'GET',
    credentials: 'include',
  })
  if (res.status === 401) return null
  await throwForBadStatus(res, 'GET /api/me')
  return res.json()
}

/** Clears the session cookie via Worker. Resolves on 204 or any 2xx. */
export async function logout() {
  const res = await fetch(buildUrl('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok && res.status !== 401) {
    await throwForBadStatus(res, 'POST /api/auth/logout')
  }
}

/** URL the browser should navigate to in order to start the GitHub OAuth flow. */
export function loginUrl() {
  return buildUrl('/api/auth/github')
}

// ── Admin CRUD core ──────────────────────────────────────────────────────────

/**
 * Generic admin fetch: serializes body as JSON, sends cookie.
 * Resolves to parsed JSON body on 2xx (or null for 204).
 */
export async function adminFetch(method, path, body) {
  const init = {
    method,
    credentials: 'include',
    headers: {},
  }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const res = await fetch(buildUrl(path), init)
  if (res.status === 204) return null
  await throwForBadStatus(res, `${method} ${path}`)
  if (res.status === 200 || res.status === 201) return res.json()
  return null
}

// Convenience wrappers — one per (kind, op).
//
// Each write awaits the API response THEN evicts the matching public-read
// cache prefix. Order matters: a failed write (4xx/5xx) bubbles via ApiError
// before invalidate runs, so a stale-but-valid cache survives a rejected
// write instead of forcing the next public read into a needless Worker hit.

export const createNews = async (data) => {
  const r = await adminFetch('POST', '/api/admin/news', data)
  cache.invalidate('news:')
  return r
}
export const updateNews = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/news/${id}`, data)
  cache.invalidate('news:')
  return r
}
export const deleteNews = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/news/${id}`)
  cache.invalidate('news:')
  return r
}

export const createEvent = async (data) => {
  const r = await adminFetch('POST', '/api/admin/events', data)
  cache.invalidate('events:')
  return r
}
export const updateEvent = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/events/${id}`, data)
  cache.invalidate('events:')
  return r
}
export const deleteEvent = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/events/${id}`)
  cache.invalidate('events:')
  return r
}

export const createMember = async (data) => {
  const r = await adminFetch('POST', '/api/admin/members', data)
  cache.invalidate('members:')
  return r
}
export const updateMember = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/members/${id}`, data)
  cache.invalidate('members:')
  return r
}
export const deleteMember = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/members/${id}`)
  cache.invalidate('members:')
  return r
}

export const createCategory = async (data) => {
  const r = await adminFetch('POST', '/api/admin/categories', data)
  cache.invalidate('categories:')
  // Inactive-category gating in /api/news may also flip; clear news too.
  cache.invalidate('news:')
  return r
}
export const updateCategory = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/categories/${id}`, data)
  cache.invalidate('categories:')
  cache.invalidate('news:')
  return r
}
export const deleteCategory = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/categories/${id}`)
  cache.invalidate('categories:')
  cache.invalidate('news:')
  return r
}

export const createFeaturedPost = async (data) => {
  const r = await adminFetch('POST', '/api/admin/featured-posts', data)
  cache.invalidate('posts:')
  return r
}
export const updateFeaturedPost = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/featured-posts/${id}`, data)
  cache.invalidate('posts:')
  return r
}
export const deleteFeaturedPost = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/featured-posts/${id}`)
  cache.invalidate('posts:')
  return r
}

export const createSocialLink = async (data) => {
  const r = await adminFetch('POST', '/api/admin/social-links', data)
  cache.invalidate('social:')
  return r
}
export const updateSocialLink = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/social-links/${id}`, data)
  cache.invalidate('social:')
  return r
}
export const deleteSocialLink = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/social-links/${id}`)
  cache.invalidate('social:')
  return r
}

export const createAboutSection = async (data) => {
  const r = await adminFetch('POST', '/api/admin/about-sections', data)
  cache.invalidate('about:')
  return r
}
export const updateAboutSection = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/about-sections/${id}`, data)
  cache.invalidate('about:')
  return r
}
export const deleteAboutSection = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/about-sections/${id}`)
  cache.invalidate('about:')
  return r
}

// ── Gallery (G-phase) ──────────────────────────────────────────────────────
//
// Cache namespace `gallery:` covers both `gallery:list:*` and `gallery:event:*`.
// `cache.invalidate('gallery:')` clears both prefixes — admin writes call it.

const GALLERY_CACHE_PREFIX = 'gallery:'

export const createGalleryItem = async (data) => {
  const r = await adminFetch('POST', '/api/admin/gallery', data)
  cache.invalidate(GALLERY_CACHE_PREFIX)
  return r
}
export const updateGalleryItem = async (id, data) => {
  const r = await adminFetch('PUT', `/api/admin/gallery/${id}`, data)
  cache.invalidate(GALLERY_CACHE_PREFIX)
  return r
}
export const deleteGalleryItem = async (id) => {
  const r = await adminFetch('DELETE', `/api/admin/gallery/${id}`)
  cache.invalidate(GALLERY_CACHE_PREFIX)
  return r
}

/** Server-side slug uniqueness check. Resolves to { available: bool }. */
export async function checkSlug(kind, slug) {
  if (kind !== 'news') {
    // Categories/events also have unique slugs but no check-slug endpoint in R4.
    // Return true so admin UI doesn't block; collision will surface as 409 on save.
    return { available: true }
  }
  const url = `/api/admin/news/check-slug?slug=${encodeURIComponent(slug)}`
  const res = await fetch(buildUrl(url), { method: 'GET', credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

// ── R2 upload ────────────────────────────────────────────────────────────────

/**
 * Upload a binary image to the Worker, which streams it into R2.
 * Returns { url, key, size, contentType }.
 *
 * @param {File} file
 * @param {'news'|'events'|'members'} kind
 * @param {string} [slug] optional override; auto-derived from filename if absent
 */
export async function uploadImage(file, kind, slug) {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  if (slug) form.append('slug', slug)
  const res = await fetch(buildUrl('/api/upload'), {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  await throwForBadStatus(res, 'POST /api/upload')
  return res.json()
}

// ── Public reads (cached via TTL — see lib/cache.js) ────────────────────────
//
// Each wrapper checks the in-memory cache first. On miss, it fetches and
// stores the parsed JSON for PUBLIC_READ_TTL_MS (15s, mirrors the Worker's
// `Cache-Control: max-age=15` header). Non-2xx responses bypass the cache.
// Admin write paths can call `cache.invalidate('news:')` etc. to clear keys.

function cacheKey(prefix, opts) {
  if (!opts || typeof opts !== 'object') return `${prefix}:`
  return `${prefix}:${JSON.stringify(opts)}`
}

/** GET /api/news?limit=&offset=&category=&q= — returns { items, total }. */
export async function fetchNews(opts = {}) {
  const key = cacheKey('news:list', opts)
  const cached = cache.get(key)
  if (cached !== null) return cached

  const params = new URLSearchParams()
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  if (opts.category) params.set('category', opts.category)
  if (opts.q) params.set('q', opts.q)
  const qs = params.toString()
  const url = qs ? `/api/news?${qs}` : '/api/news'
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchNewsBySlug(slug) {
  const key = `news:slug:${slug}`
  const cached = cache.get(key)
  if (cached !== null) return cached

  const url = `/api/news/${encodeURIComponent(slug)}`
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  if (res.status === 404) return null
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchEvents(opts = {}) {
  const key = cacheKey('events:list', opts)
  const cached = cache.get(key)
  if (cached !== null) return cached

  const params = new URLSearchParams()
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  if (opts.scope) params.set('scope', opts.scope)
  const qs = params.toString()
  const url = qs ? `/api/events?${qs}` : '/api/events'
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchEventBySlug(slug) {
  const key = `events:slug:${slug}`
  const cached = cache.get(key)
  if (cached !== null) return cached

  const url = `/api/events/${encodeURIComponent(slug)}`
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  if (res.status === 404) return null
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchMembers() {
  const key = 'members:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached

  const res = await fetch(buildUrl('/api/members'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/members')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchCategories() {
  const key = 'categories:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached

  const res = await fetch(buildUrl('/api/categories'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/categories')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchPosts() {
  const key = 'posts:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached
  const res = await fetch(buildUrl('/api/posts'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/posts')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchSocial() {
  const key = 'social:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached
  const res = await fetch(buildUrl('/api/social'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/social')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchAbout() {
  const key = 'about:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached
  const res = await fetch(buildUrl('/api/about'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/about')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchSite() {
  const key = 'site:list:'
  const cached = cache.get(key)
  if (cached !== null) return cached
  const res = await fetch(buildUrl('/api/site'), { credentials: 'omit' })
  await throwForBadStatus(res, 'GET /api/site')
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchGallery(opts = {}) {
  const key = cacheKey('gallery:list', opts)
  const cached = cache.get(key)
  if (cached !== null) return cached
  const params = new URLSearchParams()
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  if (opts.eventId != null) params.set('event_id', String(opts.eventId))
  if (opts.album) params.set('album', String(opts.album))
  const qs = params.toString()
  const url = qs ? `/api/gallery?${qs}` : '/api/gallery'
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

export async function fetchGalleryByEventSlug(slug) {
  const key = `gallery:event:${slug}`
  const cached = cache.get(key)
  if (cached !== null) return cached
  const url = `/api/gallery/by-event/${encodeURIComponent(slug)}`
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  if (res.status === 404) return null
  await throwForBadStatus(res, `GET ${url}`)
  const body = await res.json()
  cache.set(key, body, PUBLIC_READ_TTL_MS)
  return body
}

// Admin list endpoints — call /api/admin/<kind> directly so drafts (news)
// and soft-deleted rows (categories/featured-posts/social-links/about-sections)
// are visible. Public routes filter by draft=0 / active=1 and would render
// these rows invisible to the operator.

export async function adminListNews(opts = {}) {
  const ts = Date.now()
  const params = new URLSearchParams({ t: String(ts) })
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  if (opts.draft != null) params.set('draft', String(opts.draft))
  const url = `/api/admin/news?${params.toString()}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListEvents() {
  // Admin GET returns BOTH upcoming AND past in a single call (no scope
  // partition). Cache-bust so admin sees fresh data after a save.
  const ts = Date.now()
  const url = `/api/admin/events?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListMembers() {
  const ts = Date.now()
  const url = `/api/admin/members?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListCategories() {
  const ts = Date.now()
  const url = `/api/admin/categories?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListFeaturedPosts() {
  const ts = Date.now()
  const url = `/api/admin/featured-posts?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListSocialLinks() {
  const ts = Date.now()
  const url = `/api/admin/social-links?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListAboutSections() {
  const ts = Date.now()
  const url = `/api/admin/about-sections?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListGallery() {
  const ts = Date.now()
  const url = `/api/gallery?limit=100&t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

/** GET /api/admin/settings?prefix=site. — admin list of settings rows under prefix. */
export async function adminListSettings(prefix) {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error('adminListSettings: prefix required')
  }
  const url = `/api/admin/settings?prefix=${encodeURIComponent(prefix)}`
  const res = await fetch(buildUrl(url), {
    method: 'GET',
    credentials: 'include',
  })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

// ── Comments (R5.7) ─────────────────────────────────────────────────────────
//
// GET /api/comments?targetKind=news&targetId=… — public read, threaded.
//   credentials: 'omit' (no cookie needed; cacheable).
// POST /api/comments — auth required, returns 201 + new row.
//   credentials: 'include' so the session cookie travels.
// DELETE /api/comments/:id — auth required (author OR admin), returns 204.
//   credentials: 'include'.

/** GET threaded comments for a news/event target. Returns { items, total }. */
export async function fetchComments({ targetKind, targetId, limit }) {
  const params = new URLSearchParams({
    targetKind: String(targetKind),
    targetId: String(targetId),
  })
  if (limit != null) params.set('limit', String(limit))
  const url = `/api/comments?${params.toString()}`
  const res = await fetch(buildUrl(url), { credentials: 'omit' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

/**
 * POST a new comment. Returns the inserted row.
 * Throws ApiError on non-2xx; rate-limit responses surface as
 * `err.code === 'rate_limited'` with `err.status === 429`.
 */
export async function postComment({ targetKind, targetId, body, parentId }) {
  const payload = { target_kind: targetKind, target_id: targetId, body }
  if (parentId != null) payload.parent_id = parentId
  const res = await fetch(buildUrl('/api/comments'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwForBadStatus(res, 'POST /api/comments')
  return res.json()
}

/** DELETE a comment by id. Resolves on 204; throws ApiError otherwise. */
export async function deleteComment(id) {
  const res = await fetch(buildUrl(`/api/comments/${id}`), {
    method: 'DELETE',
    credentials: 'include',
  })
  if (res.status === 204) return null
  await throwForBadStatus(res, `DELETE /api/comments/${id}`)
  return null
}

// ── Admin settings (R5.7) ───────────────────────────────────────────────────
//
// All endpoints require admin role; cookie auth via credentials:'include'.

/** GET /api/admin/settings/:key — returns { key, value, updated_at } or null on 404. */
export async function getAdminSetting(key) {
  const res = await fetch(buildUrl(`/api/admin/settings/${encodeURIComponent(key)}`), {
    method: 'GET',
    credentials: 'include',
  })
  if (res.status === 404) return null
  await throwForBadStatus(res, `GET /api/admin/settings/${key}`)
  return res.json()
}

/** PUT /api/admin/settings/:key — upserts `value`. */
export async function putAdminSetting(key, value) {
  const res = await fetch(buildUrl(`/api/admin/settings/${encodeURIComponent(key)}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  await throwForBadStatus(res, `PUT /api/admin/settings/${key}`)
  return res.json()
}

/** POST /api/admin/settings/test-webhook — fires a test message via waitUntil. */
export async function testAdminWebhook({ url } = {}) {
  const init = {
    method: 'POST',
    credentials: 'include',
    headers: {},
  }
  if (url) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify({ url })
  }
  const res = await fetch(buildUrl('/api/admin/settings/test-webhook'), init)
  await throwForBadStatus(res, 'POST /api/admin/settings/test-webhook')
  return res.json()
}

// ── Gallery submissions (anonymous public + admin moderation) ────────────────

/**
 * POST /api/gallery/submit — anonymous photo submission.
 * Sends multipart/form-data with file + nickname + caption? + event_id? + terms.
 * credentials: 'omit' so no session cookie travels (truly anonymous).
 * Throws ApiError on non-2xx; specific error codes are surfaced via err.code.
 */
export async function submitGalleryPhoto({
  file,
  nickname,
  caption,
  eventId,
  eventLabel,
  takenOn,
}) {
  const form = new FormData()
  form.append('file', file, file.name || 'photo')
  form.append('nickname', nickname)
  if (caption) form.append('caption', caption)
  if (eventId != null && eventId !== '') form.append('event_id', String(eventId))
  if (eventLabel != null && eventLabel !== '')
    form.append('event_label', String(eventLabel))
  if (takenOn != null && takenOn !== '')
    form.append('taken_on', String(takenOn))
  form.append('terms', 'true')
  const res = await fetch(buildUrl('/api/gallery/submit'), {
    method: 'POST',
    body: form,
    credentials: 'omit',
  })
  await throwForBadStatus(res, 'POST /api/gallery/submit')
  return res.json()
}

/** GET /api/admin/gallery/submissions — admin moderation queue listing. */
export async function listPendingSubmissions({ cursor, limit, status } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  if (limit != null) params.set('limit', String(limit))
  const query = params.toString()
  const path = `/api/admin/gallery/submissions${query ? `?${query}` : ''}`
  const res = await fetch(buildUrl(path), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${path}`)
  return res.json()
}

/** POST /api/admin/gallery/submissions/:id/approve — admin approve action. */
export async function approveSubmission(id, sortOrder) {
  const path = `/api/admin/gallery/submissions/${encodeURIComponent(id)}/approve`
  const init = {
    method: 'POST',
    credentials: 'include',
    headers: {},
  }
  if (typeof sortOrder === 'number') {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify({ sort_order: sortOrder })
  }
  const res = await fetch(buildUrl(path), init)
  await throwForBadStatus(res, `POST ${path}`)
  return res.json()
}

/** POST /api/admin/gallery/submissions/:id/reject — admin reject action. */
export async function rejectSubmission(id, reason) {
  const path = `/api/admin/gallery/submissions/${encodeURIComponent(id)}/reject`
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  await throwForBadStatus(res, `POST ${path}`)
  return res.json()
}

/** GET /api/admin/gallery/submissions/stats — pending count for admin badge. */
export async function getSubmissionStats() {
  const res = await fetch(buildUrl('/api/admin/gallery/submissions/stats'), {
    credentials: 'include',
  })
  await throwForBadStatus(res, 'GET /api/admin/gallery/submissions/stats')
  return res.json()
}

export const __internals = { buildUrl, readApiBase, FALLBACK_API_BASE, PUBLIC_READ_TTL_MS, cacheKey }
