/**
 * TTL-aware in-memory cache used by the api.js read wrappers.
 *
 * Rationale: 15s default TTL mirrors the Worker's public-read
 * `Cache-Control: max-age=15`, so SPA users can't be stuck staring at
 * stale data for an entire session. Admin writes call
 * `cache.invalidate('news:')` etc. to clear keys eagerly.
 *
 * Per feedback_validator_at_every_boundary.md: defensive on non-string
 * keys, undefined values, negative TTL.
 */

const DEFAULT_TTL_MS = 15_000

function now() {
  return Date.now()
}

export function createCache() {
  const store = new Map()

  function get(key) {
    if (typeof key !== 'string' || key.length === 0) return null
    const entry = store.get(key)
    if (!entry) return null
    if (now() >= entry.expiresAt) {
      store.delete(key)
      return null
    }
    return entry.value
  }

  function set(key, value, ttlMs = DEFAULT_TTL_MS) {
    if (typeof key !== 'string' || key.length === 0) return
    if (value === undefined) return
    const ttl = typeof ttlMs === 'number' && Number.isFinite(ttlMs) ? ttlMs : DEFAULT_TTL_MS
    if (ttl <= 0) {
      // Negative or zero TTL: evict any existing key, do not store.
      store.delete(key)
      return
    }
    store.set(key, { value, expiresAt: now() + ttl })
  }

  function invalidate(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) return 0
    let removed = 0
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key)
        removed++
      }
    }
    return removed
  }

  function clear() {
    store.clear()
  }

  function size() {
    return store.size
  }

  return { get, set, invalidate, clear, size }
}

/** Module-level singleton used by api.js read wrappers. */
export const cache = createCache()

export const __internals = { DEFAULT_TTL_MS }
