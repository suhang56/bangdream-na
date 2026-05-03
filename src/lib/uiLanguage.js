/**
 * uiLanguage — get/set/subscribe with localStorage persistence.
 *
 * Scope: UI chrome only (~30 strings via i18n.json). Page CONTENT
 * (events, members, news bodies, about page text) does NOT translate.
 */
import i18n from '../data/i18n.json'

export const STORAGE_KEY = 'bangdream-na:uiLanguage'
const VALID = new Set(['en', 'zh'])
const DEFAULT_LANG = 'en'

const subscribers = new Set()
let storageListenerAttached = false
let inMemoryFallback = null

function detectFromNavigator() {
  try {
    const lang =
      typeof navigator !== 'undefined' && typeof navigator.language === 'string'
        ? navigator.language.toLowerCase()
        : ''
    if (lang.startsWith('zh')) return 'zh'
  } catch {
    // ignore
  }
  return DEFAULT_LANG
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (typeof raw === 'string' && VALID.has(raw)) return raw
  } catch {
    // localStorage unavailable
  }
  return null
}

function writeStorage(lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
    return true
  } catch {
    return false
  }
}

function attachStorageListener() {
  if (storageListenerAttached) return
  if (typeof window === 'undefined') return
  storageListenerAttached = true
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    if (typeof e.newValue !== 'string' || !VALID.has(e.newValue)) return
    notify(e.newValue)
  })
}

function notify(lang) {
  for (const cb of subscribers) {
    try {
      cb(lang)
    } catch {
      // subscriber error must not break others
    }
  }
}

/** @returns {'en'|'zh'} */
export function getLanguage() {
  if (inMemoryFallback !== null) return inMemoryFallback
  const stored = readStorage()
  if (stored !== null) return stored
  return detectFromNavigator()
}

/**
 * @param {'en'|'zh'} lang
 */
export function setLanguage(lang) {
  if (!VALID.has(lang)) {
    console.warn('[uiLanguage] invalid lang:', lang)
    return
  }
  const prev = getLanguage()
  const wrote = writeStorage(lang)
  if (!wrote) inMemoryFallback = lang
  else inMemoryFallback = null
  if (prev !== lang) notify(lang)
}

/**
 * @param {(lang: 'en'|'zh') => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribeLanguage(cb) {
  if (typeof cb !== 'function') return () => {}
  subscribers.add(cb)
  attachStorageListener()
  return () => {
    subscribers.delete(cb)
  }
}

/**
 * Translate a key. Falls back EN → key literal.
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  const lang = getLanguage()
  const dict = i18n[lang] || i18n.en || {}
  let value = dict[key]
  if (typeof value !== 'string') {
    const en = i18n.en || {}
    value = en[key]
    if (typeof value !== 'string') return key
  }
  if (params && typeof params === 'object') {
    return value.replace(/\{(\w+)\}/g, (m, name) => {
      const v = params[name]
      return v === undefined || v === null ? m : String(v)
    })
  }
  return value
}

// test-only reset
export function _resetForTests() {
  subscribers.clear()
  inMemoryFallback = null
}
