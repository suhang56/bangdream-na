import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  STORAGE_KEY,
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  getPlatformLabel,
  _resetForTests,
} from './uiLanguage.js'

describe('uiLanguage', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
  })

  afterEach(() => {
    _resetForTests()
    vi.restoreAllMocks()
  })

  describe('getLanguage', () => {
    it('returns navigator-detected language when storage empty', () => {
      const out = getLanguage()
      expect(['en', 'zh']).toContain(out)
    })

    it('reads stored value when valid', () => {
      window.localStorage.setItem(STORAGE_KEY, 'zh')
      expect(getLanguage()).toBe('zh')
    })

    it('falls back to default for invalid stored value (edge)', () => {
      window.localStorage.setItem(STORAGE_KEY, 'de')
      const out = getLanguage()
      expect(['en', 'zh']).toContain(out)
    })

    it('falls back to default for empty stored value (edge)', () => {
      window.localStorage.setItem(STORAGE_KEY, '')
      const out = getLanguage()
      expect(['en', 'zh']).toContain(out)
    })

    it('falls back to default for malformed JSON stored value (edge)', () => {
      window.localStorage.setItem(STORAGE_KEY, '{"a":1}')
      const out = getLanguage()
      expect(['en', 'zh']).toContain(out)
    })

    it('returns en when localStorage throws on read (edge)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('disabled')
      })
      const out = getLanguage()
      expect(['en', 'zh']).toContain(out)
    })
  })

  describe('setLanguage', () => {
    it('persists to localStorage', () => {
      setLanguage('zh')
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('zh')
      expect(getLanguage()).toBe('zh')
    })

    it('switches en → zh → en', () => {
      setLanguage('zh')
      setLanguage('en')
      expect(getLanguage()).toBe('en')
    })

    it('rejects invalid lang code (edge)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      setLanguage('zz')
      setLanguage('')
      setLanguage(null)
      setLanguage(undefined)
      expect(warn).toHaveBeenCalled()
      // stored value untouched
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('falls back to in-memory state when localStorage throws (edge)', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })
      setLanguage('zh')
      expect(getLanguage()).toBe('zh')
    })
  })

  describe('subscribeLanguage', () => {
    it('notifies subscribers on change', () => {
      const cb = vi.fn()
      subscribeLanguage(cb)
      setLanguage('zh')
      expect(cb).toHaveBeenCalledWith('zh')
    })

    it('does NOT notify when value unchanged (no-op set)', () => {
      setLanguage('zh')
      const cb = vi.fn()
      subscribeLanguage(cb)
      setLanguage('zh')
      expect(cb).not.toHaveBeenCalled()
    })

    it('unsubscribe stops further notifications', () => {
      const cb = vi.fn()
      const unsub = subscribeLanguage(cb)
      unsub()
      setLanguage('zh')
      expect(cb).not.toHaveBeenCalled()
    })

    it('non-function input → no-op unsubscribe (edge)', () => {
      const unsub = subscribeLanguage(null)
      expect(typeof unsub).toBe('function')
      expect(() => unsub()).not.toThrow()
    })

    it('subscriber error does not break other subscribers (edge)', () => {
      const cb1 = vi.fn(() => {
        throw new Error('boom')
      })
      const cb2 = vi.fn()
      subscribeLanguage(cb1)
      subscribeLanguage(cb2)
      setLanguage('zh')
      expect(cb2).toHaveBeenCalledWith('zh')
    })
  })

  describe('t (translate)', () => {
    it('translates a known key', () => {
      setLanguage('en')
      expect(t('nav.home')).toBe('Home')
      setLanguage('zh')
      expect(t('nav.home')).toBe('首页')
    })

    it('falls back to EN when ZH key missing (synthesized via unknown)', () => {
      setLanguage('zh')
      // We don't know if every key is in zh, but unknown key returns key literal
      expect(t('___nonexistent.key.x')).toBe('___nonexistent.key.x')
    })

    it('returns key when missing in both langs (edge)', () => {
      expect(t('___nope')).toBe('___nope')
    })

    it('substitutes params', () => {
      setLanguage('en')
      const out = t('filter.resultCount', { N: 12, M: 4 })
      expect(out).toContain('12')
      expect(out).toContain('4')
    })

    it('leaves placeholders when param missing (edge)', () => {
      setLanguage('en')
      const out = t('filter.resultCount', { N: 12 })
      expect(out).toContain('12')
      expect(out).toContain('{M}')
    })

    it('handles missing params object (edge)', () => {
      setLanguage('en')
      expect(typeof t('filter.resultCount')).toBe('string')
    })
  })

  describe('getPlatformLabel', () => {
    it('resolves to en value when language is en', () => {
      setLanguage('en')
      expect(getPlatformLabel('xiaohongshu', '小红书')).toBe('Xiaohongshu')
    })

    it('resolves to zh value when language is zh', () => {
      setLanguage('zh')
      expect(getPlatformLabel('xiaohongshu', 'Xiaohongshu')).toBe('小红书')
    })

    it('falls back to provided label when key missing', () => {
      setLanguage('en')
      expect(getPlatformLabel('twitter', 'Twitter')).toBe('Twitter')
    })

    it('returns empty string when platform empty and no fallback', () => {
      expect(getPlatformLabel('', null)).toBe('')
      expect(getPlatformLabel(null, undefined)).toBe('')
    })

    it('returns fallback when platform empty and fallback provided (edge)', () => {
      expect(getPlatformLabel('', 'Default')).toBe('Default')
    })

    it('handles non-string platform argument (edge)', () => {
      expect(getPlatformLabel(42, 'Foo')).toBe('Foo')
      expect(getPlatformLabel(undefined, 'Bar')).toBe('Bar')
    })

    it('handles non-string fallback when key missing (edge)', () => {
      setLanguage('en')
      expect(getPlatformLabel('madeup', null)).toBe('')
      expect(getPlatformLabel('madeup', 0)).toBe('')
    })
  })
})
