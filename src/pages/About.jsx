import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchAbout, fetchSite, fetchSocial } from '../lib/api.js'
import {
  adaptAboutSections,
  adaptSiteSettings,
  adaptSocialList,
} from '../lib/apiAdapter.js'
import './About.css'

const EMPTY_SITE = {
  discordInvite: '',
  communityName: '',
  communityNameZh: '',
  communityNameJp: '',
}

const EMPTY_ABOUT = { mission: '', faq: [], coc: '', joinInstructions: '' }

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

export default function About() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [about, setAbout] = useState(EMPTY_ABOUT)
  const [site, setSite] = useState(EMPTY_SITE)
  const [socialData, setSocialData] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAbout(), fetchSite(), fetchSocial()])
      .then(([aboutRes, siteRes, socialRes]) => {
        if (cancelled) return
        setAbout(adaptAboutSections(aboutRes))
        setSite(adaptSiteSettings(siteRes))
        setSocialData(adaptSocialList(socialRes))
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

  if (status === 'loading') return <LoadingState className="about-loading" />
  if (status === 'error') return <ErrorState className="about-error" onRetry={retry} />

  const faq = Array.isArray(about.faq) ? about.faq : []
  const hasJp =
    typeof site.communityNameJp === 'string' && site.communityNameJp.length > 0
  const hasZh =
    typeof site.communityNameZh === 'string' && site.communityNameZh.length > 0
  const hasEn =
    typeof site.communityName === 'string' && site.communityName.length > 0

  return (
    <main className="about-page">
      <section className="about-hero" aria-labelledby="about-title">
        {hasJp ? (
          <p className="about-name-jp" lang="ja">
            {site.communityNameJp}
          </p>
        ) : null}
        {hasZh ? (
          <h1 id="about-title" className="about-name-zh" lang="zh">
            {site.communityNameZh}
          </h1>
        ) : hasEn ? (
          <h1 id="about-title" className="about-name-en" lang="en">
            {site.communityName}
          </h1>
        ) : (
          <h1 id="about-title">BanG Dream NA</h1>
        )}
        {hasZh && hasEn ? (
          <p className="about-name-en" lang="en">
            {site.communityName}
          </p>
        ) : null}
      </section>

      <section id="mission" className="about-section">
        <h2>{t('about.missionHeading')}</h2>
        {paragraphs(about.mission).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <section id="join" className="about-section">
        <h2>{t('about.joinHeading')}</h2>
        {paragraphs(about.joinInstructions).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {(() => {
          const qq = Array.isArray(socialData)
            ? socialData.find((e) => e && e.platform === 'qq')
            : null
          if (!qq || qq.enabled !== true) return null
          if (typeof qq.url !== 'string' || qq.url.length === 0) return null
          return (
            <a
              className="about-join-cta"
              href={qq.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('btn.joinQQ')}
            </a>
          )
        })()}
      </section>

      <section id="faq" className="about-section">
        <h2>{t('about.faqHeading')}</h2>
        {faq.length === 0 ? (
          <p className="about-empty">{t('empty.noFaq')}</p>
        ) : (
          <div className="about-faq-list">
            {faq.map((item, i) => (
              <details key={i} className="about-faq-item">
                <summary>{item.q}</summary>
                <div className="about-faq-answer">
                  {paragraphs(item.a).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section id="disclaimer" className="about-section about-disclaimer">
        <h2>{t('about.disclaimerHeading')}</h2>
        <p>{t('about.disclaimerBody')}</p>
      </section>
    </main>
  )
}
