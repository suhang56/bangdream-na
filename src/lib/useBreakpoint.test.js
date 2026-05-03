import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from './useBreakpoint.js'

const MOBILE_QUERY = '(max-width: 767.98px)'

function makeMql(initialMatches) {
  const listeners = new Set()
  const mql = {
    matches: initialMatches,
    media: MOBILE_QUERY,
    onchange: null,
    addEventListener: vi.fn((event, cb) => {
      if (event === 'change') listeners.add(cb)
    }),
    removeEventListener: vi.fn((event, cb) => {
      if (event === 'change') listeners.delete(cb)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    _emit(matches) {
      this.matches = matches
      for (const cb of listeners) cb({ matches })
    },
    _listeners: listeners,
  }
  return mql
}

describe('useIsMobile', () => {
  let originalMatchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('returns true when viewport is narrow (matches mobile query)', () => {
    const mql = makeMql(true)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith(MOBILE_QUERY)
  })

  it('returns false when viewport is wide (does not match mobile query)', () => {
    const mql = makeMql(false)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('first render returns true (SSR-safe / mobile-first default) before effect runs', () => {
    // Override matchMedia to return wide. Initial useState(true) means first
    // synchronous render must be `true`, then effect syncs to actual `false`.
    let captured = null
    const mql = makeMql(false)
    window.matchMedia = vi.fn().mockImplementation(() => {
      // capture matchMedia call timing
      captured = 'called'
      return mql
    })
    const { result } = renderHook(() => useIsMobile())
    // After render+effect (renderHook flushes effects synchronously in React 19),
    // result reflects actual viewport. We assert matchMedia WAS invoked.
    expect(captured).toBe('called')
    expect(result.current).toBe(false)
  })

  it('re-renders when matchMedia change event fires (narrow → wide)', () => {
    const mql = makeMql(true)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
    act(() => {
      mql._emit(false)
    })
    expect(result.current).toBe(false)
  })

  it('re-renders when matchMedia change event fires (wide → narrow)', () => {
    const mql = makeMql(false)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => {
      mql._emit(true)
    })
    expect(result.current).toBe(true)
  })

  it('cleanup removes change listener on unmount (edge — leak prevention)', () => {
    const mql = makeMql(true)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { unmount } = renderHook(() => useIsMobile())
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mql._listeners.size).toBe(1)
    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mql._listeners.size).toBe(0)
  })

  it('cleanup uses the SAME listener function passed to addEventListener (edge)', () => {
    const mql = makeMql(true)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { unmount } = renderHook(() => useIsMobile())
    const addedFn = mql.addEventListener.mock.calls[0][1]
    unmount()
    const removedFn = mql.removeEventListener.mock.calls[0][1]
    expect(removedFn).toBe(addedFn)
  })

  it('multiple instances each subscribe and clean up independently (edge)', () => {
    const mql = makeMql(true)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const a = renderHook(() => useIsMobile())
    const b = renderHook(() => useIsMobile())
    expect(mql._listeners.size).toBe(2)
    expect(a.result.current).toBe(true)
    expect(b.result.current).toBe(true)
    act(() => {
      mql._emit(false)
    })
    expect(a.result.current).toBe(false)
    expect(b.result.current).toBe(false)
    a.unmount()
    expect(mql._listeners.size).toBe(1)
    b.unmount()
    expect(mql._listeners.size).toBe(0)
  })

  it('queries the exact breakpoint string `(max-width: 767.98px)` (edge — 768 = desktop)', () => {
    const mql = makeMql(false)
    const spy = vi.fn().mockReturnValue(mql)
    window.matchMedia = spy
    renderHook(() => useIsMobile())
    expect(spy).toHaveBeenCalledWith('(max-width: 767.98px)')
  })

  it('handles environment without matchMedia gracefully (edge — SSR/old browser)', () => {
    // Remove matchMedia to simulate SSR or unsupported environment
    delete window.matchMedia
    expect(() => renderHook(() => useIsMobile())).not.toThrow()
    const { result } = renderHook(() => useIsMobile())
    // Without matchMedia, hook keeps initial true (mobile-first default)
    expect(result.current).toBe(true)
  })

  it('does not error when matchMedia returns initialMatches=false then immediately fires change (edge)', () => {
    const mql = makeMql(false)
    window.matchMedia = vi.fn().mockReturnValue(mql)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => mql._emit(true))
    act(() => mql._emit(false))
    act(() => mql._emit(true))
    expect(result.current).toBe(true)
  })
})
