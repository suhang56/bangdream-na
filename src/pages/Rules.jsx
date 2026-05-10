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

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳']
const CIRCLED_RE = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/

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

function parseRule(text, index) {
  const match = text.match(CIRCLED_RE)
  if (match) {
    return { glyph: match[0].trim(), body: text.slice(match[0].length).trim() }
  }
  return { glyph: CIRCLED[index] || String(index + 1), body: text }
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
      <header className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// 群规</span>
            <h1 id="rules-title" className="rules-title">
              {t('rules.title')}
            </h1>
          </div>
          <span className="ph-meta">{t('rules.subtitle')}</span>
        </div>
      </header>

      <div className="rules-body bf-container">
        <div className="bf-helper rules-scope-helper">
          <span className="bf-helper-tag">// 适用范围</span>
          <p>{t('rules.subtitle')}</p>
        </div>

        {items.length === 0 ? (
          <p className="rules-empty">{t('empty.noCoc')}</p>
        ) : (
          <div className="bf-rules">
            {items.map((text, i) => {
              const { glyph, body } = parseRule(text, i)
              return (
                <article key={i} className="bf-rule">
                  <span className="bf-rule-n">{glyph}</span>
                  <p className="bf-rule-text">{body}</p>
                </article>
              )
            })}
          </div>
        )}

        <div className="bf-helper rules-footer-helper">
          <span className="bf-helper-tag">// 摘要</span>
          <p>{t('rules.footerNote')}</p>
        </div>
      </div>
    </main>
  )
}
