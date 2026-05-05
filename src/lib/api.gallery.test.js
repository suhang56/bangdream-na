import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGalleryItem,
  deleteGalleryItem,
  fetchGallery,
  fetchGalleryByEventSlug,
  updateGalleryItem,
} from './api.js'
import { cache } from './cache.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function emptyResponse(status = 204) {
  return new Response(null, { status })
}

describe('api.js — gallery', () => {
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

  describe('fetchGallery', () => {
    it('builds the URL with event_id and album params', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchGallery({ eventId: 5, album: 'free' })
      const url = fetchMock.mock.calls[0][0]
      expect(url).toContain('/api/gallery?')
      expect(url).toContain('event_id=5')
      expect(url).toContain('album=free')
    })

    it('serves cached response on second call within TTL', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchGallery({ eventId: 5 })
      await fetchGallery({ eventId: 5 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('omits empty params from URL', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }))
      await fetchGallery({})
      expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/gallery$/)
    })
  })

  describe('fetchGalleryByEventSlug', () => {
    it('returns null on 404', async () => {
      fetchMock.mockResolvedValue(emptyResponse(404))
      const r = await fetchGalleryByEventSlug('missing')
      expect(r).toBeNull()
    })

    it('returns body on 200 + caches under gallery:event:slug', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ items: [], total: 0, event: { id: 1, slug: 'a', title_zh: 'A' } }),
      )
      const r1 = await fetchGalleryByEventSlug('a')
      expect(r1.event.slug).toBe('a')
      // Second call hits cache
      await fetchGalleryByEventSlug('a')
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('cache invalidation on writes', () => {
    it('createGalleryItem invalidates BOTH list and event cache prefixes', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/by-event/')) {
          return Promise.resolve(
            jsonResponse({ items: [], total: 0, event: { id: 1, slug: 'a', title_zh: 'A' } }),
          )
        }
        if (url.includes('/api/admin/gallery')) {
          return Promise.resolve(jsonResponse({ id: 1 }, 201))
        }
        return Promise.resolve(jsonResponse({ items: [], total: 0 }))
      })
      // Prime both caches
      await fetchGallery({})
      await fetchGalleryByEventSlug('a')
      expect(fetchMock).toHaveBeenCalledTimes(2)

      // Writing should clear both
      await createGalleryItem({ image_url: 'https://cdn/x.jpg', album: 'a' })
      expect(fetchMock).toHaveBeenCalledTimes(3)

      // Subsequent reads must MISS the cache (re-fetch)
      await fetchGallery({})
      await fetchGalleryByEventSlug('a')
      expect(fetchMock).toHaveBeenCalledTimes(5)
    })

    it('updateGalleryItem invokes the cache invalidation', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
      const spy = vi.spyOn(cache, 'invalidate')
      await updateGalleryItem(1, { caption: 'x' })
      expect(spy).toHaveBeenCalledWith('gallery:')
    })

    it('deleteGalleryItem invokes the cache invalidation', async () => {
      fetchMock.mockResolvedValue(emptyResponse(204))
      const spy = vi.spyOn(cache, 'invalidate')
      await deleteGalleryItem(1)
      expect(spy).toHaveBeenCalledWith('gallery:')
    })
  })
})
