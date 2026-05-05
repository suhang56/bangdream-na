import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchEventBySlug } from '../lib/api.js'
import { adaptEventRow } from '../lib/apiAdapter.js'
import { formatDate } from '../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import './EventDetail.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function renderBody(body) {
  if (typeof body !== 'string' || body.trim() === '') return null
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim() !== '')
  return paragraphs.map((p, i) => {
    const lines = p.split(/\n/)
    return (
      <p key={i} className="event-detail__paragraph">
        {lines.map((line, j) => (
          <span key={j}>
            {line}
            {j < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    )
  })
}

export default function EventDetail() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const { slug } = useParams()
  const decodedSlug = useMemo(() => {
    try {
      return typeof slug === 'string' ? decodeURIComponent(slug) : ''
    } catch {
      return slug ?? ''
    }
  }, [slug])

  const initialStatus = decodedSlug ? 'loading' : 'notfound'
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState(initialStatus)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!decodedSlug) return undefined
    fetchEventBySlug(decodedSlug)
      .then((row) => {
        if (cancelled) return
        if (row === null) {
          setItem(null)
          setStatus('notfound')
          return
        }
        setItem(adaptEventRow(row))
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [decodedSlug, reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') {
    return <LoadingState className="event-detail__loading" />
  }
  if (status === 'error') {
    return <ErrorState className="event-detail__error" onRetry={retry} />
  }

  if (status === 'notfound' || !item) {
    return (
      <main className="event-detail">
        <div className="event-detail__inner">
          <Link to="/events" className="event-detail__back">
            {t('events.detail.back')}
          </Link>
          <h1 className="event-detail__title">{t('events.detail.notFoundTitle')}</h1>
          <p className="event-detail__missing">{t('events.detail.notFoundBody')}</p>
        </div>
      </main>
    )
  }

  const formattedStart = formatDate(item.date)
  const formattedEnd = formatDate(item.endDate)
  const hasImage = typeof item.image === 'string' && item.image.length > 0
  const ticketUrl = typeof item.ticketUrl === 'string' && item.ticketUrl.length > 0 ? item.ticketUrl : null
  const hasBands = Array.isArray(item.bands) && item.bands.length > 0

  return (
    <main className="event-detail">
      <div className="event-detail__inner">
        <Link to="/events" className="event-detail__back">
          {t('events.detail.back')}
        </Link>
        {hasImage ? (
          <figure className="event-detail__hero">
            <img
              src={item.image}
              alt={item.title ?? ''}
              className="event-detail__hero-img"
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : null}
        <h1 className="event-detail__title">{item.title ?? ''}</h1>
        <dl className="event-detail__meta">
          {formattedStart ? (
            <>
              <dt>{t('events.detail.startsAt')}</dt>
              <dd>
                <time dateTime={item.date}>{formattedStart}</time>
              </dd>
            </>
          ) : null}
          {formattedEnd ? (
            <>
              <dt>{t('events.detail.endsAt')}</dt>
              <dd>
                <time dateTime={item.endDate}>{formattedEnd}</time>
              </dd>
            </>
          ) : null}
          {item.location ? (
            <>
              <dt>{t('events.detail.location')}</dt>
              <dd>{item.location}</dd>
            </>
          ) : null}
          {hasBands ? (
            <>
              <dt>{t('events.detail.bands')}</dt>
              <dd>{item.bands.join(' · ')}</dd>
            </>
          ) : null}
        </dl>
        {ticketUrl ? (
          <p className="event-detail__ticket-row">
            <a
              href={ticketUrl}
              className="event-detail__ticket-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('btn.tickets')}
            </a>
          </p>
        ) : null}
        <div className="event-detail__body">{renderBody(item.description)}</div>
      </div>
    </main>
  )
}
