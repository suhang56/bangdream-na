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

export const createNews = (data) => adminFetch('POST', '/api/admin/news', data)
export const updateNews = (id, data) => adminFetch('PUT', `/api/admin/news/${id}`, data)
export const deleteNews = (id) => adminFetch('DELETE', `/api/admin/news/${id}`)

export const createEvent = (data) => adminFetch('POST', '/api/admin/events', data)
export const updateEvent = (id, data) => adminFetch('PUT', `/api/admin/events/${id}`, data)
export const deleteEvent = (id) => adminFetch('DELETE', `/api/admin/events/${id}`)

export const createMember = (data) => adminFetch('POST', '/api/admin/members', data)
export const updateMember = (id, data) => adminFetch('PUT', `/api/admin/members/${id}`, data)
export const deleteMember = (id) => adminFetch('DELETE', `/api/admin/members/${id}`)

export const createCategory = (data) => adminFetch('POST', '/api/admin/categories', data)
export const updateCategory = (id, data) => adminFetch('PUT', `/api/admin/categories/${id}`, data)
export const deleteCategory = (id) => adminFetch('DELETE', `/api/admin/categories/${id}`)

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

/** Admin variant: list all rows including drafts. Falls back to public + ?t cache-bust. */
export async function adminListNews(opts = {}) {
  const ts = Date.now()
  const params = new URLSearchParams({ t: String(ts) })
  if (opts.limit != null) params.set('limit', String(opts.limit))
  if (opts.offset != null) params.set('offset', String(opts.offset))
  // Public route excludes drafts. R4 has no admin list endpoint, so admin UI
  // sees only published rows; full list-with-drafts arrives in a future phase.
  const url = `/api/news?${params.toString()}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListEvents() {
  const ts = Date.now()
  const url = `/api/events?scope=upcoming&t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListMembers() {
  const ts = Date.now()
  const url = `/api/members?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export async function adminListCategories() {
  const ts = Date.now()
  const url = `/api/categories?t=${ts}`
  const res = await fetch(buildUrl(url), { credentials: 'include' })
  await throwForBadStatus(res, `GET ${url}`)
  return res.json()
}

export const __internals = { buildUrl, readApiBase, FALLBACK_API_BASE, PUBLIC_READ_TTL_MS, cacheKey }
