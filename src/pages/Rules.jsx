import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchAbout } from '../lib/api.js'
import { adaptAboutSections } from '../lib/apiAdapter.js'
import './Rules.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function paragraphs(body) {
  if (typeof body !== 'string' || body.length === 0) return []
  return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

export default function Rules() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [coc, setCoc] = useState('')
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAbout()
      .then((aboutRes) => {
        if (cancelled) return
        const sections = adaptAboutSections(aboutRes)
        setCoc(typeof sections.coc === 'string' ? sections.coc : '')
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') return <LoadingState className="rules-loading" />
  if (status === 'error') return <ErrorState className="rules-error" onRetry={retry} />

  const items = paragraphs(coc)

  return (
    <main className="rules-page" aria-labelledby="rules-title">
      <header className="rules-header">
        <h1 id="rules-title" className="rules-title">
          {t('rules.title')}
        </h1>
        <p className="rules-subtitle">{t('rules.subtitle')}</p>
      </header>

      {items.length === 0 ? (
        <p className="rules-empty">{t('empty.noCoc')}</p>
      ) : (
        <ol className="rules-list">
          {items.map((p, i) => (
            <li key={i} className="rules-item">
              {p}
            </li>
          ))}
        </ol>
      )}

      <footer className="rules-footer-note">
        <p>{t('rules.footerNote')}</p>
      </footer>
    </main>
  )
}
