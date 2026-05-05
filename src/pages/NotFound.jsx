import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getLanguage, subscribeLanguage, t } from '../lib/uiLanguage.js'
import './NotFound.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function NotFound() {
  // Subscribe so the page re-renders on language toggle.
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <main className="not-found" data-testid="not-found">
      <div className="not-found__inner">
        <p className="not-found__code" aria-hidden="true">404</p>
        <h1 className="not-found__title">{t('notFound.title')}</h1>
        <p className="not-found__body">{t('notFound.body')}</p>
        <Link to="/" className="not-found__home">
          {t('notFound.backHome')}
        </Link>
      </div>
    </main>
  )
}
