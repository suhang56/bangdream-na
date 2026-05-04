import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useAutosave,
  buildDraftKey,
  loadDraft,
  saveDraft,
} from './useAutosave.js'

describe('buildDraftKey', () => {
  it('builds key for existing post id', () => {
    expect(buildDraftKey('news', 42)).toBe('admin:draft:news:42')
  })

  it('builds key for string post id', () => {
    expect(buildDraftKey('events', 'foo-slug')).toBe('admin:draft:events:foo-slug')
  })

  it('uses new:<kind> when postId is null/undefined/empty', () => {
    expect(buildDraftKey('news', null)).toBe('admin:draft:new:news')
    expect(buildDraftKey('news', undefined)).toBe('admin:draft:new:news')
    expect(buildDraftKey('news', '')).toBe('admin:draft:new:news')
  })

  it('returns null when kind missing', () => {
    expect(buildDraftKey('', 1)).toBeNull()
    expect(buildDraftKey(null, 1)).toBeNull()
    expect(buildDraftKey(undefined, 1)).toBeNull()
  })

  it('different kinds produce different keys for same post id', () => {
    expect(buildDraftKey('news', 1)).not.toBe(buildDraftKey('events', 1))
  })
})

describe('loadDraft / saveDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('saveDraft + loadDraft round-trip object', () => {
    expect(saveDraft('k', { a: 1, b: 'x' })).toBe(true)
    expect(loadDraft('k')).toEqual({ a: 1, b: 'x' })
  })

  it('loadDraft returns null when key missing', () => {
    expect(loadDraft('absent')).toBeNull()
  })

  it('loadDraft returns null + clears entry on JSON parse failure', () => {
    window.localStorage.setItem('bad', 'not json')
    expect(loadDraft('bad')).toBeNull()
    expect(window.localStorage.getItem('bad')).toBeNull()
  })

  it('saveDraft returns false when key is empty/null', () => {
    expect(saveDraft('', { a: 1 })).toBe(false)
    expect(saveDraft(null, { a: 1 })).toBe(false)
  })

  it('loadDraft returns null when key is empty/null', () => {
    expect(loadDraft('')).toBeNull()
    expect(loadDraft(null)).toBeNull()
  })

  it('saveDraft returns false on circular structure', () => {
    const obj = { a: 1 }
    obj.self = obj
    expect(saveDraft('k', obj)).toBe(false)
  })
})

describe('useAutosave hook', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces writes (no save before timer)', () => {
    const { rerender } = renderHook(
      ({ form }) => useAutosave({ kind: 'news', postId: 1, formState: form, debounceMs: 1000 }),
      { initialProps: { form: { x: 'a' } } },
    )
    rerender({ form: { x: 'b' } })
    expect(window.localStorage.getItem('admin:draft:news:1')).toBeNull()
  })

  it('debounce timer fires → writes to localStorage', async () => {
    renderHook(() => useAutosave({ kind: 'news', postId: 1, formState: { x: 1 }, debounceMs: 500 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(JSON.parse(window.localStorage.getItem('admin:draft:news:1'))).toEqual({ x: 1 })
  })

  it('exposes pending=true between change and flush', async () => {
    const stableForm = { x: 1 }
    const { result } = renderHook(
      ({ form }) => useAutosave({ kind: 'news', postId: 1, formState: form, debounceMs: 500 }),
      { initialProps: { form: stableForm } },
    )
    expect(result.current.pending).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
    expect(result.current.pending).toBe(false)
  })

  it('reads existing localStorage draft on mount + exposes via .draft', () => {
    window.localStorage.setItem('admin:draft:news:5', JSON.stringify({ title: 'restored' }))
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 5, formState: { title: 'live' }, debounceMs: 1000 }),
    )
    expect(result.current.draft).toEqual({ title: 'restored' })
  })

  it('does NOT expose draft when stored value matches live form', () => {
    const live = { title: 'same' }
    window.localStorage.setItem('admin:draft:news:6', JSON.stringify(live))
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 6, formState: live, debounceMs: 1000 }),
    )
    expect(result.current.draft).toBeNull()
  })

  it('restore() returns stored value + clears the .draft state', () => {
    window.localStorage.setItem('admin:draft:news:7', JSON.stringify({ title: 'r' }))
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 7, formState: { title: 'live' }, debounceMs: 1000 }),
    )
    let restored
    act(() => {
      restored = result.current.restore()
    })
    expect(restored).toEqual({ title: 'r' })
    expect(result.current.draft).toBeNull()
  })

  it('discard() clears localStorage + .draft', () => {
    window.localStorage.setItem('admin:draft:news:8', JSON.stringify({ title: 'r' }))
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 8, formState: { title: 'live' }, debounceMs: 1000 }),
    )
    expect(result.current.draft).toEqual({ title: 'r' })
    act(() => {
      result.current.discard()
    })
    expect(result.current.draft).toBeNull()
    expect(window.localStorage.getItem('admin:draft:news:8')).toBeNull()
  })

  it('clear() removes localStorage entry (intended for save-success)', async () => {
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 9, formState: { x: 1 }, debounceMs: 100 }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(window.localStorage.getItem('admin:draft:news:9')).not.toBeNull()
    act(() => {
      result.current.clear()
    })
    expect(window.localStorage.getItem('admin:draft:news:9')).toBeNull()
  })

  it('multi-post-id isolation — different post ids use different keys', async () => {
    const { rerender } = renderHook(
      ({ id, form }) => useAutosave({ kind: 'news', postId: id, formState: form, debounceMs: 100 }),
      { initialProps: { id: 1, form: { x: 'one' } } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender({ id: 2, form: { x: 'two' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(JSON.parse(window.localStorage.getItem('admin:draft:news:1'))).toEqual({ x: 'one' })
    expect(JSON.parse(window.localStorage.getItem('admin:draft:news:2'))).toEqual({ x: 'two' })
  })

  it('post id null vs concrete id stored under separate keys', async () => {
    const { rerender } = renderHook(
      ({ id }) => useAutosave({ kind: 'news', postId: id, formState: { x: id }, debounceMs: 100 }),
      { initialProps: { id: null } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender({ id: 5 })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(window.localStorage.getItem('admin:draft:new:news')).not.toBeNull()
    expect(window.localStorage.getItem('admin:draft:news:5')).not.toBeNull()
  })

  it('different schema kinds isolated', async () => {
    const { rerender } = renderHook(
      ({ kind }) => useAutosave({ kind, postId: 1, formState: { kind }, debounceMs: 100 }),
      { initialProps: { kind: 'news' } },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender({ kind: 'events' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(window.localStorage.getItem('admin:draft:news:1')).not.toBeNull()
    expect(window.localStorage.getItem('admin:draft:events:1')).not.toBeNull()
  })

  it('survives JSON.parse failure on stored data', () => {
    window.localStorage.setItem('admin:draft:news:10', '{not json')
    const { result } = renderHook(() =>
      useAutosave({ kind: 'news', postId: 10, formState: { x: 1 }, debounceMs: 100 }),
    )
    expect(result.current.draft).toBeNull()
  })

  it('returns null draft when kind missing (key falsy)', async () => {
    const { result } = renderHook(() =>
      useAutosave({ kind: '', postId: 1, formState: { x: 1 }, debounceMs: 100 }),
    )
    expect(result.current.draft).toBeNull()
    // No key, no write
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    // localStorage empty
    expect(window.localStorage.length).toBe(0)
  })
})
