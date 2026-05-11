import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchSite, fetchMembers, fetchEvents } from '../lib/api.js'
import { adaptSiteSettings } from '../lib/apiAdapter.js'
import {
  CONTACT_EMAIL,
  QQ_GROUP_URL,
  DISCORD_INVITE_URL,
  X_PROFILE_URL,
} from '../data/socialLinks.js'
import './About.css'

const JOIN_LINKS = [
  {
    id: 'qq',
    href: QQ_GROUP_URL,
    tone: '#12B7F5',
    external: true,
    nameKey: 'about.join.qqName',
    descKey: 'about.join.qqDesc',
  },
  {
    id: 'discord',
    href: DISCORD_INVITE_URL,
    tone: '#5865F2',
    external: true,
    nameKey: 'about.join.discordName',
    descKey: 'about.join.discordDesc',
  },
  {
    id: 'x',
    href: X_PROFILE_URL,
    tone: '#000000',
    external: true,
    nameKey: 'about.join.xName',
    descKey: 'about.join.xDesc',
  },
  {
    id: 'email',
    href: `mailto:${CONTACT_EMAIL}`,
    tone: '#f31864',
    external: false,
    nameKey: 'about.join.emailName',
    descKey: 'about.join.emailDesc',
  },
]

const EMPTY_SITE = {
  discordInvite: '',
  communityName: '',
  communityNameZh: '',
  communityNameJp: '',
}

const BODY_KEYS = ['about.body1', 'about.body2', 'about.body3', 'about.body4', 'about.body5']

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function About() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [site, setSite] = useState(EMPTY_SITE)
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [members, setMembers] = useState(null)
  const [membersStatus, setMembersStatus] = useState('loading')
  const [events, setEvents] = useState(null)
  const [eventsStatus, setEventsStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    fetchSite()
      .then((siteRes) => {
        if (cancelled) return
        setSite(adaptSiteSettings(siteRes))
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

  useEffect(() => {
    let cancelled = false
    fetchMembers()
      .then((r) => {
        if (cancelled) return
        const total = typeof r?.total === 'number'
          ? r.total
          : Array.isArray(r?.items) ? r.items.length : null
        setMembers(total)
        setMembersStatus(typeof total === 'number' ? 'ready' : 'error')
      })
      .catch(() => {
        if (cancelled) return
        setMembers(null)
        setMembersStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchEvents({ scope: 'all' })
      .then((r) => {
        if (cancelled) return
        const total = typeof r?.total === 'number'
          ? r.total
          : Array.isArray(r?.items) ? r.items.length : null
        setEvents(total)
        setEventsStatus(typeof total === 'number' ? 'ready' : 'error')
      })
      .catch(() => {
        if (cancelled) return
        setEvents(null)
        setEventsStatus('error')
      })
    return () => { cancelled = true }
  }, [])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') return <LoadingState className="about-loading" />
  if (status === 'error') return <ErrorState className="about-error" onRetry={retry} />

  const hasJp =
    typeof site.communityNameJp === 'string' && site.communityNameJp.length > 0
  const hasZh =
    typeof site.communityNameZh === 'string' && site.communityNameZh.length > 0
  const hasEn =
    typeof site.communityName === 'string' && site.communityName.length > 0

  function renderStatValue(value, statusName) {
    if (statusName === 'loading') {
      return <span className="num num-skeleton" aria-hidden="true">···</span>
    }
    if (statusName === 'error' || typeof value !== 'number') {
      return <span className="num num-fallback">—</span>
    }
    return <span className="num">{value}</span>
  }

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
        <section
          id="story"
          className="bf-about-block about-section about-narrative"
          data-testid="about-narrative"
        >
          <span className="bf-helper-tag">{t('about.helperTag')}</span>
          <p className="about-lead">{t('about.lead')}</p>
          {BODY_KEYS.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
          <p className="about-closing">{t('about.closing')}</p>
        </section>

        <section id="contact" className="bf-about-block about-section about-contact">
          <span className="bf-helper-tag">// {t('contact.label')}</span>
          <h2>{t('contact.label')}</h2>
          <p>{t('contact.aboutBody')}</p>
          <p className="about-contact-line">
            <a
              className="about-contact-link"
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label={t('contact.ariaLabel')}
            >
              <span className="about-contact-glyph" aria-hidden="true">✉</span>
              {' '}
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <section
          id="join"
          className="bf-about-block about-section about-join"
          data-testid="about-join"
        >
          <span className="bf-helper-tag">// {t('about.joinHeading')}</span>
          <h2>{t('about.joinHeading')}</h2>
          <p className="about-join-intro">{t('about.joinIntro')}</p>
          <div className="about-join-list">
            {JOIN_LINKS.map((link) => {
              const isExternal = link.external
              const arrow = link.id === 'email' ? '✉' : '↗'
              return (
                <a
                  key={link.id}
                  className="about-join-link"
                  href={link.href}
                  style={{ '--tone': link.tone }}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <span className="ajl-name">{t(link.nameKey)}</span>
                  <span className="ajl-desc">{t(link.descKey)}</span>
                  <span className="ajl-arrow" aria-hidden="true">{arrow}</span>
                </a>
              )
            })}
          </div>
        </section>

        <section className="bf-about-block about-stats-block">
          <span className="bf-helper-tag">// 数字</span>
          <div className="bf-about-stats">
            <div data-testid="stat-members">
              {renderStatValue(members, membersStatus)}
              <span className="lbl">同好</span>
            </div>
            <div data-testid="stat-chapters">
              {/* TODO: wire when /api/chapters lands */}
              <span className="num">9</span>
              <span className="lbl">分会</span>
            </div>
            <div data-testid="stat-events">
              {renderStatValue(events, eventsStatus)}
              <span className="lbl">活动</span>
            </div>
            <div data-testid="stat-founded">
              <span className="num">2024</span>
              <span className="lbl">创立</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
