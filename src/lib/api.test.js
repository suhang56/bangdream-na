import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchMe,
  logout,
  loginUrl,
  adminFetch,
  createNews,
  updateNews,
  deleteNews,
  createEvent,
  updateEvent,
  deleteEvent,
  createMember,
  updateMember,
  deleteMember,
  createCategory,
  updateCategory,
  deleteCategory,
  checkSlug,
  uploadImage,
  fetchNews,
  fetchNewsBySlug,
  fetchEvents,
  fetchEventBySlug,
  fetchMembers,
  fetchCategories,
  adminListNews,
  adminListEvents,
  adminListMembers,
  adminListCategories,
  ApiError,
  API_BASE,
} from './api.js'
import { cache } from './cache.js'

function jsonResponse(body, status = 200, headers = {}) {
  const blob = JSON.stringify(body)
  return new Response(blob, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function emptyResponse(status = 204) {
  return new Response(null, { status })
}

describe('api.js', () => {
  let fetchMock
  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    cache.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    cache.clear()
  })

  describe('API_BASE', () => {
    it('is a non-empty string', () => {
      expect(typeof API_BASE).toBe('string')
      expect(API_BASE.length).toBeGreaterThan(0)
    })
  })

  describe('fetchMe', () => {
    it('returns parsed body on 200', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ user: { id: 1, role: 'admin', github_login: 'x', display_name: 'X', avatar_url: null } }))
      const result = await fetchMe()
      expect(result.user.role).toBe('admin')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/me')
      expect(init.credentials).toBe('include')
    })

    it('returns null on 401', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
      const result = await fetchMe()
      expect(result).toBeNull()
    })

    it('throws ApiError on 500', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'internal_error' }, 500))
      await expect(fetchMe()).rejects.toBeInstanceOf(ApiError)
    })

    it('throws ApiError preserves status + body', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'broken' }, 502))
      try {
        await fetchMe()
        throw new Error('should not reach')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect(err.status).toBe(502)
        expect(err.code).toBe('broken')
      }
    })
  })

  describe('logout', () => {
    it('POSTs to /api/auth/logout with include', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      await logout()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/auth/logout')
      expect(init.method).toBe('POST')
      expect(init.credentials).toBe('include')
    })

    it('tolerates 401 silently', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
      await expect(logout()).resolves.toBeUndefined()
    })

    it('throws on 500', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'broken' }, 500))
      await expect(logout()).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('loginUrl', () => {
    it('returns absolute URL ending with /api/auth/github', () => {
      expect(loginUrl()).toMatch(/\/api\/auth\/github$/)
    })
  })

  describe('adminFetch', () => {
    it('GET no body sends no Content-Type', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
      await adminFetch('GET', '/api/admin/news/check-slug?slug=foo')
      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('GET')
      expect(init.credentials).toBe('include')
      expect(init.body).toBeUndefined()
    })

    it('POST with body sets Content-Type and serializes JSON', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201))
      const body = { title_zh: 'x' }
      const result = await adminFetch('POST', '/api/admin/news', body)
      expect(result).toEqual({ id: 1 })
      const [, init] = fetchMock.mock.calls[0]
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(init.body).toBe(JSON.stringify(body))
    })

    it('returns null on 204', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      const result = await adminFetch('DELETE', '/api/admin/news/1')
      expect(result).toBeNull()
    })

    it('throws ApiError on 4xx with parsed code', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'not_found' }, 404))
      try {
        await adminFetch('PUT', '/api/admin/news/1', { x: 1 })
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect(err.status).toBe(404)
        expect(err.code).toBe('not_found')
      }
    })

    it('throws ApiError on 409 unique violation', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'unique_violation', detail: { field: 'slug' } }, 409))
      await expect(adminFetch('POST', '/api/admin/news', {})).rejects.toMatchObject({ status: 409, code: 'unique_violation' })
    })
  })

  describe('news CRUD', () => {
    it('createNews POSTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 7 }, 201))
      await createNews({ title_zh: 'x' })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/news')
      expect(init.method).toBe('POST')
    })

    it('updateNews PUTs to /:id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 7 }))
      await updateNews(7, { title_zh: 'y' })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toMatch(/\/api\/admin\/news\/7$/)
      expect(init.method).toBe('PUT')
    })

    it('deleteNews DELETEs', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      await deleteNews(7)
      const [, init] = fetchMock.mock.calls[0]
      expect(init.method).toBe('DELETE')
    })
  })

  describe('events CRUD', () => {
    it('createEvent POSTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201))
      await createEvent({ title_zh: 'x' })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/admin/events')
      expect(init.method).toBe('POST')
    })
    it('updateEvent PUTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
      await updateEvent(1, { city: 'x' })
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    })
    it('deleteEvent DELETEs', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      await deleteEvent(1)
      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })
  })

  describe('members CRUD', () => {
    it('createMember POSTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201))
      await createMember({ display_name: 'x' })
      expect(fetchMock.mock.calls[0][0]).toContain('/api/admin/members')
    })
    it('updateMember PUTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
      await updateMember(1, { city: 'x' })
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    })
    it('deleteMember DELETEs', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      await deleteMember(1)
      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })
  })

  describe('categories CRUD', () => {
    it('createCategory POSTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }, 201))
      await createCategory({ slug: 'x', display_zh: 'x' })
      expect(fetchMock.mock.calls[0][0]).toContain('/api/admin/categories')
    })
    it('updateCategory PUTs', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
      await updateCategory(1, { display_zh: 'x' })
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    })
    it('deleteCategory DELETEs', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      await deleteCategory(1)
      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })
  })

  describe('checkSlug', () => {
    it('GETs /api/admin/news/check-slug?slug=...', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ available: true }))
      const result = await checkSlug('news', 'my-slug')
      expect(result).toEqual({ available: true })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('check-slug?slug=my-slug')
      expect(init.credentials).toBe('include')
    })

    it('encodes special chars in slug', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ available: false }))
      await checkSlug('news', 'a b/c')
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('a%20b%2Fc')
    })

    it('non-news kinds return available=true without fetch', async () => {
      const result = await checkSlug('events', 'x')
      expect(result).toEqual({ available: true })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('throws on 401', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
      await expect(checkSlug('news', 'x')).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('uploadImage', () => {
    it('POSTs multipart form to /api/upload with credentials', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ url: 'https://cdn/x', key: 'news/x', size: 1, contentType: 'image/png' }, 201))
      const file = new File([new Uint8Array([0x89])], 'x.png', { type: 'image/png' })
      const result = await uploadImage(file, 'news', 'my-slug')
      expect(result.url).toBe('https://cdn/x')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/upload')
      expect(init.method).toBe('POST')
      expect(init.credentials).toBe('include')
      expect(init.body).toBeInstanceOf(FormData)
    })

    it('omits slug when not provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ url: 'https://cdn/x', key: 'news/x', size: 1, contentType: 'image/png' }, 201))
      const file = new File([new Uint8Array([0x89])], 'x.png', { type: 'image/png' })
      await uploadImage(file, 'news')
      const [, init] = fetchMock.mock.calls[0]
      const formSlug = init.body.get('slug')
      expect(formSlug).toBeNull()
    })

    it('throws ApiError on 413', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'payload_too_large' }, 413))
      const file = new File([new Uint8Array([0x89])], 'x.png', { type: 'image/png' })
      await expect(uploadImage(file, 'news')).rejects.toMatchObject({ status: 413, code: 'payload_too_large' })
    })
  })

  describe('public reads', () => {
    it('fetchNews uses credentials:omit, no params', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchNews()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toMatch(/\/api\/news$/)
      expect(init.credentials).toBe('omit')
    })

    it('fetchNews builds query string', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchNews({ limit: 5, offset: 10, category: 'announcement', q: 'hi' })
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('limit=5')
      expect(url).toContain('offset=10')
      expect(url).toContain('category=announcement')
      expect(url).toContain('q=hi')
    })

    it('fetchNewsBySlug returns null on 404', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'not_found' }, 404))
      const result = await fetchNewsBySlug('missing')
      expect(result).toBeNull()
    })

    it('fetchNewsBySlug throws on 500', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'broken' }, 500))
      await expect(fetchNewsBySlug('x')).rejects.toBeInstanceOf(ApiError)
    })

    it('fetchEvents builds scope param', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchEvents({ scope: 'past' })
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('scope=past')
    })

    it('fetchEventBySlug returns null on 404', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: 'not_found' }, 404))
      const result = await fetchEventBySlug('missing')
      expect(result).toBeNull()
    })

    it('fetchMembers + fetchCategories use credentials:omit', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }))
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }))
      await fetchMembers()
      await fetchCategories()
      expect(fetchMock.mock.calls[0][1].credentials).toBe('omit')
      expect(fetchMock.mock.calls[1][1].credentials).toBe('omit')
    })
  })

  describe('admin list helpers', () => {
    it('adminListNews uses credentials:include + cache-bust query', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await adminListNews()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/api/news?')
      expect(url).toMatch(/[?&]t=\d+/)
      expect(init.credentials).toBe('include')
    })

    it('adminListEvents/Members/Categories all include cache-bust', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], total: 0 })))
      await adminListEvents()
      await adminListMembers()
      await adminListCategories()
      for (const call of fetchMock.mock.calls) {
        expect(call[0]).toMatch(/[?&]t=\d+/)
        expect(call[1].credentials).toBe('include')
      }
    })

    it('adminListNews accepts limit/offset', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await adminListNews({ limit: 50, offset: 0 })
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('limit=50')
      expect(url).toContain('offset=0')
    })
  })

  describe('public-read cache', () => {
    it('fetchNews returns cached body on second call within TTL (no second fetch)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [{ slug: 'a' }], total: 1 }))
      const a = await fetchNews({ limit: 5 })
      const b = await fetchNews({ limit: 5 })
      expect(a).toEqual(b)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('different opts produce different cache keys', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], total: 0 })))
      await fetchNews({ limit: 5 })
      await fetchNews({ limit: 10 })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('cache.invalidate("news:") forces refetch', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], total: 0 })))
      await fetchNews({ limit: 5 })
      cache.invalidate('news:')
      await fetchNews({ limit: 5 })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('non-2xx responses are NOT cached (next call refetches)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'broken' }, 500))
      await expect(fetchNews()).rejects.toBeInstanceOf(ApiError)
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }))
      await fetchNews()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('fetchNewsBySlug caches single-row response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ slug: 'a', title_zh: 'A' }))
      await fetchNewsBySlug('a')
      await fetchNewsBySlug('a')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('fetchNewsBySlug 404 returns null and is NOT cached', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not_found' }, 404))
      const a = await fetchNewsBySlug('missing')
      expect(a).toBeNull()
      fetchMock.mockResolvedValueOnce(jsonResponse({ slug: 'missing' }))
      const b = await fetchNewsBySlug('missing')
      expect(b).toEqual({ slug: 'missing' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('fetchEvents caches separately by scope', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ items: [], total: 0 })))
      await fetchEvents({ scope: 'upcoming' })
      await fetchEvents({ scope: 'upcoming' })
      await fetchEvents({ scope: 'past' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('fetchMembers + fetchCategories cached', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }))
      fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }))
      await fetchMembers()
      await fetchMembers()
      await fetchCategories()
      await fetchCategories()
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
