import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './ErrorState.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Bilingual error state with optional retry button. Used by page shells
 * when an API fetch rejects.
 */
export default function ErrorState({
  message,
  onRetry,
  retryLabel,
  className = '',
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const headline =
    typeof message === 'string' && message.length > 0
      ? message
      : t('error.loadFailed')
  const retry =
    typeof retryLabel === 'string' && retryLabel.length > 0
      ? retryLabel
      : t('error.retry')
  return (
    <div
      className={`error-state ${className}`.trim()}
      role="alert"
      aria-live="assertive"
    >
      <p className="error-state__message">{headline}</p>
      {typeof onRetry === 'function' ? (
        <button
          type="button"
          className="error-state__retry"
          onClick={onRetry}
        >
          {retry}
        </button>
      ) : null}
    </div>
  )
}
