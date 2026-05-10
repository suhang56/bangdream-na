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

const STATS = [
  { num: '50+', lbl: '同好' },
  { num: '9', lbl: '分会' },
  { num: '30+', lbl: '活动' },
  { num: '2024', lbl: '创立' },
]

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

  const qqSocial = Array.isArray(socialData)
    ? socialData.find((e) => e && e.platform === 'qq')
    : null
  const showQqCta =
    qqSocial && qqSocial.enabled === true &&
    typeof qqSocial.url === 'string' && qqSocial.url.length > 0

  return (
    <main className="about-page">
      <header className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// 关于</span>
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
          </div>
          <div className="about-hero-meta">
            {hasJp ? (
              <p className="about-name-jp" lang="ja">
                {site.communityNameJp}
              </p>
            ) : null}
            {hasZh && hasEn ? (
              <p className="about-name-en" lang="en">
                {site.communityName}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="about-body bf-container">
        <section id="mission" className="bf-about-block about-section">
          <span className="bf-helper-tag">// {t('about.missionHeading')}</span>
          <h2>{t('about.missionHeading')}</h2>
          {paragraphs(about.mission).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <section className="bf-about-block about-stats-block">
          <span className="bf-helper-tag">// 数字</span>
          <div className="bf-about-stats">
            {STATS.map((s, i) => (
              <div key={i}>
                <span className="num">{s.num}</span>
                <span className="lbl">{s.lbl}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="join" className="bf-about-block about-section">
          <span className="bf-helper-tag">// {t('about.joinHeading')}</span>
          <h2>{t('about.joinHeading')}</h2>
          {paragraphs(about.joinInstructions).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {showQqCta ? (
            <a
              className="about-join-cta"
              href={qqSocial.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('btn.joinQQ')}
            </a>
          ) : null}
        </section>

        <section id="faq" className="bf-about-block about-section">
          <span className="bf-helper-tag">// {t('about.faqHeading')}</span>
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

        <section id="disclaimer" className="bf-about-block about-section about-disclaimer">
          <span className="bf-helper-tag">// {t('about.disclaimerHeading')}</span>
          <h2>{t('about.disclaimerHeading')}</h2>
          <p>{t('about.disclaimerBody')}</p>
        </section>
      </div>
    </main>
  )
}
