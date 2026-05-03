import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import about from '../data/about.json'
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
  const cocText = typeof about.coc === 'string' ? about.coc : ''
  const items = paragraphs(cocText)

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
