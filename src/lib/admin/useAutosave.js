/**
 * R5.5 — autosave hook for admin form drafts.
 *
 * Behaviour:
 *  - Debounces formState changes (default 1000 ms) and writes the JSON-
 *    serialized state to `localStorage[draftKey]`.
 *  - On mount, reads localStorage[draftKey]. If a draft is found AND it
 *    differs from the live formState, exposes `draft` + `restore()` +
 *    `discard()` so the consumer can render a banner.
 *  - `clear()` removes the localStorage entry — call on successful
 *    POST/PUT to API.
 *  - Each post id gets its own key. New-post drafts use a `new:${kind}`
 *    suffix so they don't collide with existing rows or with other kinds.
 *  - Resilient to missing localStorage (test environments) and JSON
 *    parse / quota errors — failures are silently swallowed; the hook
 *    still returns a usable shape.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Build the canonical localStorage key for a draft.
 * `kind` is the schema key (news / events / members / categories) so that
 * a new-news draft doesn't collide with a new-events draft.
 *
 * @param {string} kind   schema key
 * @param {string|number|null|undefined} postId  row id, or null/undefined for new
 */
export function buildDraftKey(kind, postId) {
  if (typeof kind !== 'string' || kind.length === 0) return null
  if (postId === null || postId === undefined || postId === '') {
    return `admin:draft:new:${kind}`
  }
  return `admin:draft:${kind}:${postId}`
}

/**
 * Safe localStorage wrappers — never throw to the caller.
 */
function readLs(key) {
  try {
    if (typeof window === 'undefined') return null
    const ls = window.localStorage
    if (!ls) return null
    return ls.getItem(key)
  } catch {
    return null
  }
}

function writeLs(key, value) {
  try {
    if (typeof window === 'undefined') return false
    const ls = window.localStorage
    if (!ls) return false
    ls.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function removeLs(key) {
  try {
    if (typeof window === 'undefined') return
    const ls = window.localStorage
    if (!ls) return
    ls.removeItem(key)
  } catch {
    /* swallow */
  }
}

/**
 * Read an existing draft from localStorage. Returns the parsed JSON value
 * or null if missing/invalid.
 */
export function loadDraft(key) {
  if (!key) return null
  const raw = readLs(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    // corrupted entry — clear it so next call returns null
    removeLs(key)
    return null
  }
}

/**
 * Persist a draft. Returns true on success, false on failure (quota, etc).
 */
export function saveDraft(key, value) {
  if (!key) return false
  let serialized
  try {
    serialized = JSON.stringify(value)
  } catch {
    return false
  }
  return writeLs(key, serialized)
}

/**
 * Compare two values shallowly via JSON equality.
 * Returns true when they JSON-stringify identically.
 */
function jsonEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/**
 * React hook.
 *
 * @param {object} args
 * @param {string} args.kind         schema key (news/events/members/categories)
 * @param {string|number|null} args.postId   row id; null/undefined for new
 * @param {object} args.formState    current draft form state
 * @param {number} [args.debounceMs] debounce delay; default 1000
 *
 * @returns {{
 *   draft: object | null,         existing draft on mount, when different from formState
 *   pending: boolean,              true between change and persist
 *   restore: () => object | null,  caller should setState with returned value
 *   discard: () => void,           clear localStorage + null draft state
 *   clear: () => void              alias for discard, intended for save-success
 * }}
 */
export function useAutosave({ kind, postId, formState, debounceMs = 1000 }) {
  const key = buildDraftKey(kind, postId)

  // ── Draft state ────────────────────────────────────────────────────────
  // Derive eagerly during render — no useEffect needed. This sidesteps
  // the React-19 "set state in effect" lint rule and matches the intended
  // semantics: when the post id (key) changes, re-evaluate the stored
  // draft against the current formState.
  const [draft, setDraft] = useState(() => {
    const stored = loadDraft(key)
    return stored && !jsonEqual(stored, formState) ? stored : null
  })
  // Track which key the current draft was loaded for. This is the
  // documented "store the previous prop in state" pattern from
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastLoadedKey, setLastLoadedKey] = useState(key)
  if (lastLoadedKey !== key) {
    setLastLoadedKey(key)
    const stored = key ? loadDraft(key) : null
    setDraft(stored && !jsonEqual(stored, formState) ? stored : null)
  }

  // ── Pending state ──────────────────────────────────────────────────────
  // Pending is a transient signal that flips on every formState change and
  // off after debounceMs. The setState-in-effect lint warning is false-
  // positive here: setPending is *the* externalization of the timer's
  // observable state, which is exactly what useEffect is for.
  const [pending, setPending] = useState(false)

  // ── Debounced write ────────────────────────────────────────────────────
  const timerRef = useRef(null)

  useEffect(() => {
    if (!key) return undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    const handle = setTimeout(() => {
      saveDraft(key, formState)
      timerRef.current = null
      setPending(false)
    }, debounceMs)
    timerRef.current = handle
    return () => {
      clearTimeout(handle)
    }
  }, [key, formState, debounceMs])

  const restore = useCallback(() => {
    const value = draft
    setDraft(null)
    return value
  }, [draft])

  const discard = useCallback(() => {
    if (key) removeLs(key)
    setDraft(null)
  }, [key])

  const clear = useCallback(() => {
    if (key) removeLs(key)
    setDraft(null)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPending(false)
  }, [key])

  return { draft, pending, restore, discard, clear }
}

// Test-only exports: pure helpers for unit testing without React.
export const __internals = { jsonEqual, readLs, writeLs, removeLs }
