import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767.98px)'

function subscribe(callback) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', callback)
  return () => {
    mql.removeEventListener('change', callback)
  }
}

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  // Mobile-first SSR default — first render is mobile until client matches.
  return true
}

/**
 * Returns `true` when the viewport is mobile-sized (≤ 767.98px wide).
 * Exactly 768px is desktop. SSR-safe via `useSyncExternalStore`: the server
 * snapshot is `true` (mobile-first); client subscribes to matchMedia 'change'.
 *
 * @returns {boolean}
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
