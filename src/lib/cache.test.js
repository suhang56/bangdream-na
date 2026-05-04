import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createCache, cache, __internals } from './cache.js'

describe('createCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('get/set roundtrip', () => {
    it('returns the stored value when not expired', () => {
      const c = createCache()
      c.set('news:list', [{ id: 1 }])
      expect(c.get('news:list')).toEqual([{ id: 1 }])
    })

    it('returns null for unknown keys', () => {
      const c = createCache()
      expect(c.get('missing')).toBeNull()
    })

    it('overwrites the entry when set is called twice', () => {
      const c = createCache()
      c.set('k', 'a')
      c.set('k', 'b')
      expect(c.get('k')).toBe('b')
    })

    it('stores falsey but defined values (0, false, empty string, empty array)', () => {
      const c = createCache()
      c.set('zero', 0)
      c.set('false', false)
      c.set('empty', '')
      c.set('arr', [])
      expect(c.get('zero')).toBe(0)
      expect(c.get('false')).toBe(false)
      expect(c.get('empty')).toBe('')
      expect(c.get('arr')).toEqual([])
    })
  })

  describe('expiration', () => {
    it('returns null after TTL elapses', () => {
      const c = createCache()
      c.set('k', 'v', 1000)
      vi.advanceTimersByTime(999)
      expect(c.get('k')).toBe('v')
      vi.advanceTimersByTime(2)
      expect(c.get('k')).toBeNull()
    })

    it('uses default TTL when ttlMs not provided', () => {
      const c = createCache()
      c.set('k', 'v')
      vi.advanceTimersByTime(__internals.DEFAULT_TTL_MS - 1)
      expect(c.get('k')).toBe('v')
      vi.advanceTimersByTime(2)
      expect(c.get('k')).toBeNull()
    })

    it('evicts the entry when read after expiration (size shrinks)', () => {
      const c = createCache()
      c.set('k', 'v', 100)
      expect(c.size()).toBe(1)
      vi.advanceTimersByTime(101)
      c.get('k')
      expect(c.size()).toBe(0)
    })
  })

  describe('invalidate by prefix', () => {
    it('removes only keys matching the prefix', () => {
      const c = createCache()
      c.set('news:1', 'a')
      c.set('news:2', 'b')
      c.set('events:1', 'c')
      const removed = c.invalidate('news:')
      expect(removed).toBe(2)
      expect(c.get('news:1')).toBeNull()
      expect(c.get('news:2')).toBeNull()
      expect(c.get('events:1')).toBe('c')
    })

    it('returns 0 when no keys match', () => {
      const c = createCache()
      c.set('news:1', 'a')
      expect(c.invalidate('events:')).toBe(0)
    })

    it('ignores empty/non-string prefix without throwing', () => {
      const c = createCache()
      c.set('a', 1)
      expect(c.invalidate('')).toBe(0)
      expect(c.invalidate(null)).toBe(0)
      expect(c.invalidate(undefined)).toBe(0)
      expect(c.invalidate(42)).toBe(0)
      expect(c.get('a')).toBe(1)
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      const c = createCache()
      c.set('a', 1)
      c.set('b', 2)
      c.clear()
      expect(c.size()).toBe(0)
      expect(c.get('a')).toBeNull()
      expect(c.get('b')).toBeNull()
    })
  })

  describe('multiple instances are independent', () => {
    it('does not share state across instances', () => {
      const a = createCache()
      const b = createCache()
      a.set('k', 'a')
      b.set('k', 'b')
      expect(a.get('k')).toBe('a')
      expect(b.get('k')).toBe('b')
      a.clear()
      expect(b.get('k')).toBe('b')
    })
  })

  describe('defensive input handling', () => {
    it('non-string key on get returns null', () => {
      const c = createCache()
      expect(c.get(null)).toBeNull()
      expect(c.get(undefined)).toBeNull()
      expect(c.get(42)).toBeNull()
      expect(c.get({})).toBeNull()
      expect(c.get('')).toBeNull()
    })

    it('non-string key on set is a no-op', () => {
      const c = createCache()
      c.set(null, 'v')
      c.set(42, 'v')
      c.set('', 'v')
      expect(c.size()).toBe(0)
    })

    it('undefined value on set is a no-op', () => {
      const c = createCache()
      c.set('k', undefined)
      expect(c.get('k')).toBeNull()
      expect(c.size()).toBe(0)
    })

    it('null value is stored (distinguishable from missing key)', () => {
      const c = createCache()
      c.set('k', null)
      expect(c.get('k')).toBeNull() // get returns null both ways
      expect(c.size()).toBe(1) // but the entry exists
    })

    it('zero TTL evicts any prior entry and does not store', () => {
      const c = createCache()
      c.set('k', 'v')
      c.set('k', 'v2', 0)
      expect(c.get('k')).toBeNull()
      expect(c.size()).toBe(0)
    })

    it('negative TTL evicts any prior entry and does not store', () => {
      const c = createCache()
      c.set('k', 'v')
      c.set('k', 'v2', -100)
      expect(c.get('k')).toBeNull()
      expect(c.size()).toBe(0)
    })

    it('NaN/Infinity TTL falls back to default', () => {
      const c = createCache()
      c.set('a', 'va', NaN)
      c.set('b', 'vb', Infinity)
      // NaN → default; Infinity is finite-check fails → default
      expect(c.get('a')).toBe('va')
      expect(c.get('b')).toBe('vb')
    })
  })

  describe('singleton', () => {
    it('exports a default cache instance', () => {
      expect(typeof cache.get).toBe('function')
      expect(typeof cache.set).toBe('function')
      expect(typeof cache.invalidate).toBe('function')
      expect(typeof cache.clear).toBe('function')
    })

    it('singleton clear works after writes from earlier tests', () => {
      cache.set('singleton-test-key', 'x')
      expect(cache.get('singleton-test-key')).toBe('x')
      cache.clear()
      expect(cache.get('singleton-test-key')).toBeNull()
    })
  })
})
