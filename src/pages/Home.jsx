import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle/SectionTitle.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchNews, fetchEvents, fetchGallery } from '../lib/api.js'
import { BANDS } from '../data/bands.js'
import {
  QQ_GROUP_URL,
  DISCORD_INVITE_URL,
  X_PROFILE_URL,
  FORUM_URL,
  XHS_URL,
} from '../data/socialLinks.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import './Home.css'

const NEWS_LIMIT = 5
const EVENTS_LIMIT = 4
const GALLERY_LIMIT = 6

const HARDCODED_MEMBERS = '150+'
const HARDCODED_CHAPTERS = 9

const INK_FALLBACK = '#1f1d1a'
const INK_2_FALLBACK = '#45413b'
const FIXED_GRADIENT = `linear-gradient(135deg, ${INK_FALLBACK} 0%, ${INK_2_FALLBACK} 100%)`

function hostnameOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const COMMUNITY_LINKS = [
  { id: 'discord', name: 'Discord', handle: 'discord.gg/bandori-na', desc: '主社群 · 实时聊天 / 语音频道', href: DISCORD_INVITE_URL, tone: '#5865F2' },
  { id: 'xhs', name: '小红书', handle: '@北美炸梦同好会', desc: '现场报告 / 二创发布 / 活动预告', href: XHS_URL, tone: '#FF2442' },
  { id: 'x', name: 'X (Twitter)', handle: '@BandoriNACC', desc: '官方公告 / 北美演出转发', href: X_PROFILE_URL, tone: '#000000' },
  { id: 'forum', name: '论坛', handle: hostnameOf(FORUM_URL), desc: '深度讨论 / 长文报告 / 攻略归档', href: FORUM_URL, tone: '#E8466E' },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function bandFor(id) {
  return BANDS.find((b) => b.id === id) || BANDS[0]
}

function formatYmd(unixSec) {
  if (typeof unixSec !== 'number' || !Number.isFinite(unixSec)) return ''
  const d = new Date(unixSec * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function daysOutLabel(unixSec) {
  if (typeof unixSec !== 'number' || !Number.isFinite(unixSec)) return ''
  const diffDays = Math.ceil((unixSec * 1000 - Date.now()) / 86400000)
  if (diffDays <= 0) return t('home.hero.today')
  return t('home.hero.daysOut', { n: diffDays })
}

function stripMarkdown(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/[#*_`>[\]()]/g, '')
    .replace(/!\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s, max) {
  const clean = stripMarkdown(s)
  if (clean.length <= max) return clean
  return clean.slice(0, max) + '…'
}

function HomeHero({ news, upcomingEvents, eventsTotal }) {
  const featured = news && news.length > 0 ? news[0] : null
  const next = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0] : null

  return (
    <section className="bf-home-hero">
      <div className="bf-container">
        <div className="bf-hh-grid">
          {featured ? (
            <Link
              to={`/news/${encodeURIComponent(featured.slug)}`}
              className="bf-hh-feature"
              style={featured.hero_image_url ? {
                backgroundImage: `linear-gradient(135deg, rgba(31,29,26,0.30) 0%, transparent 60%), url(${featured.hero_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : { background: FIXED_GRADIENT }}
            >
              <span className="hhf-tag">{t('home.hero.latestReport')}</span>
              <span className="hhf-d">{formatYmd(featured.published_at)}</span>
              <h1 className="hhf-title">{featured.title_zh ?? featured.title_en ?? '—'}</h1>
              <p className="hhf-excerpt">{truncate(featured.body_md, 160)}</p>
              <span className="hhf-cta">{t('home.hero.readFull')}</span>
            </Link>
          ) : (
            <div
              className="bf-hh-feature bf-hh-feature--empty"
              aria-label={t('empty.noNews')}
            >
              <span className="hhf-tag">{t('home.hero.latestReport')}</span>
              <p className="hhf-excerpt">{t('empty.noNews')}</p>
            </div>
          )}

          <div className="bf-hh-side">
            {next ? (
              <Link
                to={`/events/${encodeURIComponent(next.slug)}`}
                className="bf-hh-next"
                style={{ borderLeftColor: bandFor(next.band_theme).color }}
              >
                <span className="hhn-tag">{t('home.hero.nextEvent')}</span>
                <span className="hhn-d">
                  {formatYmd(next.start_at)}
                  <span className="hhn-out">{daysOutLabel(next.start_at)}</span>
                </span>
                <h2 className="hhn-title">{next.title_zh ?? next.title_en ?? '—'}</h2>
                <dl className="hhn-meta">
                  <dt>城市</dt>
                  <dd>{next.city ?? '—'}</dd>
                  <dt>会场</dt>
                  <dd>{next.venue ?? '—'}</dd>
                </dl>
              </Link>
            ) : (
              <div className="bf-hh-next bf-hh-next--empty">
                <span className="hhn-tag">{t('home.hero.nextEvent')}</span>
                <span>{t('home.events.empty')}</span>
              </div>
            )}
            <div className="bf-hh-stats">
              <Link to="/members" style={{ display: 'block' }}>
                <span className="num">{HARDCODED_MEMBERS}</span>
                <span className="lbl">{t('home.stats.members')}</span>
              </Link>
              <Link to="/about" style={{ display: 'block' }}>
                <span className="num">{HARDCODED_CHAPTERS}</span>
                <span className="lbl">{t('home.stats.chapters')}</span>
              </Link>
              <Link to="/events" style={{ display: 'block' }}>
                <span className="num">{eventsTotal === null ? '—' : eventsTotal}</span>
                <span className="lbl">{t('home.stats.events')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HomeNews({ news }) {
  // up to 4 news cards from news[1..4]
  const cards = news && news.length > 1 ? news.slice(1, 5) : []
  return (
    <section className="bf-section bf-section--paper">
      <div className="bf-container">
        <SectionTitle
          cn={t('home.news.sectionCn')}
          jp={t('home.news.sectionJp')}
          more={t('home.news.more')}
          href="/news"
        />
        <div className="bf-news-list">
          {cards.map((n) => (
            <Link
              key={n.id ?? n.slug}
              to={`/news/${encodeURIComponent(n.slug)}`}
              className="bf-news-card"
            >
              <div className="nc-thumb" style={n.hero_image_url ? {
                backgroundImage: `linear-gradient(135deg, rgba(31,29,26,0.30) 0%, transparent 60%), url(${n.hero_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : { background: FIXED_GRADIENT }}>
                <span className="nc-band-name">REPORT</span>
              </div>
              <div className="nc-body">
                <div className="nc-meta">
                  <span
                    className="nc-tag"
                    style={
                      (n.category || '').toLowerCase() === 'announcement'
                        ? { background: '#cd2c34', color: '#fff' }
                        : { background: bandFor(n.band_theme).color, color: bandFor(n.band_theme).ink }
                    }
                  >
                    {(n.category || '').toUpperCase() || 'NEWS'}
                  </span>
                  <span className="nc-d">{formatYmd(n.published_at)}</span>
                </div>
                <h3 className="nc-title">{n.title_zh ?? n.title_en ?? '—'}</h3>
                <p className="nc-excerpt">{truncate(n.body_md, 120)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomeEvents({ events }) {
  return (
    <section className="bf-section">
      <div className="bf-container">
        <SectionTitle
          cn={t('home.events.sectionCn')}
          jp={t('home.events.sectionJp')}
          more={t('home.events.more')}
          href="/events"
        />
        <table className="bf-tbl">
          <thead>
            <tr>
              <th style={{ width: 96 }}>{t('home.events.col.date')}</th>
              <th style={{ width: 80 }}>{t('home.events.col.daysOut')}</th>
              <th>{t('home.events.col.event')}</th>
              <th style={{ width: 140 }} className="bf-hide-mobile">
                {t('home.events.col.city')}
              </th>
              <th style={{ width: 80 }} aria-label="ticket" />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td className="td-d" colSpan={5}>
                  {t('home.events.empty')}
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id ?? e.slug}>
                  <td className="td-d">{formatYmd(e.start_at)}</td>
                  <td>
                    <span className="td-kind">{daysOutLabel(e.start_at)}</span>
                  </td>
                  <td className="td-title">
                    <Link to={`/events/${encodeURIComponent(e.slug)}`}>
                      {e.title_zh ?? e.title_en ?? '—'}
                    </Link>
                    {e.description_md ? (
                      <div className="td-sub">{truncate(e.description_md, 80)}</div>
                    ) : null}
                  </td>
                  <td className="bf-hide-mobile">{e.city ?? '—'}</td>
                  <td>
                    {e.ticket_url ? (
                      <a
                        className="td-buy"
                        href={e.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('home.events.buy')}
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HomeGallery({ items }) {
  return (
    <section className="bf-section bf-section--paper">
      <div className="bf-container">
        <SectionTitle
          cn={t('home.gallery.sectionCn')}
          jp={t('home.gallery.sectionJp')}
          more={t('home.gallery.more')}
          href="/gallery"
        />
        {items.length === 0 ? (
          <p className="bf-helper">{t('home.gallery.empty')}</p>
        ) : (
          <div className="bf-album-grid">
            {items.map((a) => (
              <Link key={a.id} to="/gallery" className="bf-album">
                <div className="al-thumb">
                  {a.image_url ? (
                    <img src={a.image_url} alt="" className="al-thumb-img" loading="lazy" />
                  ) : null}
                </div>
                <div className="al-meta">
                  <span className="al-d">
                    {formatYmd(a.taken_at ?? a.created_at)}
                  </span>
                  <h4 className="al-title">
                    {a.caption ?? a.event_title_zh ?? 'Photo'}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function HomeJoin() {
  return (
    <section className="bf-section bf-section--dark">
      <div className="bf-container">
        <SectionTitle
          cn={t('home.join.sectionCn')}
          jp={t('home.join.sectionJp')}
          more={t('home.join.more')}
          href="/about"
        />
        <div className="bf-join">
          <a href={QQ_GROUP_URL} className="bf-join-card" target="_blank" rel="noopener noreferrer" style={{'--tone': '#12B7F5'}}>
            <span className="jc-tag">{t('home.join.qqTag')}</span>
            <span className="jc-title">{t('home.join.qqTitle')}</span>
            <span className="jc-sub">{t('home.join.qqSub')}</span>
            <span className="jc-cta">{t('home.join.qqCta')}</span>
          </a>
          <div className="bf-links-list">
            {COMMUNITY_LINKS.map((l) => (
              <a key={l.id} href={l.href} className="bf-link" target="_blank" rel="noopener noreferrer" style={{'--tone': l.tone}}>
                <span className="lk-name">{l.name}</span>
                <span className="lk-handle">{l.handle}</span>
                <span className="lk-desc">{l.desc}</span>
                <span className="lk-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [news, setNews] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [gallery, setGallery] = useState([])
  const [eventsTotal, setEventsTotal] = useState(null)
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchNews({ limit: NEWS_LIMIT }),
      fetchEvents({ scope: 'upcoming', limit: EVENTS_LIMIT }),
      fetchGallery({ limit: GALLERY_LIMIT }),
    ])
      .then(async ([newsRes, upcomingRes, galleryRes]) => {
        if (cancelled) return
        const newsItems = (newsRes && newsRes.items) || []
        const upcomingItems = (upcomingRes && upcomingRes.items) || []
        const galleryItems = (galleryRes && galleryRes.items) || []
        setNews(newsItems)
        setUpcoming(upcomingItems)
        setGallery(galleryItems)

        const upcomingTotal =
          typeof upcomingRes?.total === 'number' ? upcomingRes.total : upcomingItems.length

        // Fetch past total separately; if it fails, we still render upcoming.
        try {
          const pastRes = await fetchEvents({ scope: 'past', limit: 1 })
          if (cancelled) return
          const pastTotal = typeof pastRes?.total === 'number' ? pastRes.total : 0
          setEventsTotal(upcomingTotal + pastTotal)
        } catch {
          if (cancelled) return
          setEventsTotal(null)
        }
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

  if (status === 'loading') {
    return <LoadingState className="home-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="home-error" onRetry={retry} />
  }

  return (
    <>
      <HomeHero news={news} upcomingEvents={upcoming} eventsTotal={eventsTotal} />
      <HomeNews news={news} />
      <HomeEvents events={upcoming} />
      <HomeGallery items={gallery} />
      <HomeJoin />
    </>
  )
}
