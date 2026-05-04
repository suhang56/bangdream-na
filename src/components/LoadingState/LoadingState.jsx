import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './LoadingState.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Bilingual loading indicator. Re-renders on UI-language change so the
 * label flips zh ↔ en in lockstep with other chrome.
 */
export default function LoadingState({ label, className = '' }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const text = typeof label === 'string' && label.length > 0 ? label : t('loading.message')
  return (
    <div
      className={`loading-state ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="loading-state__spinner" aria-hidden="true" />
      <span className="loading-state__text">{text}</span>
    </div>
  )
}
