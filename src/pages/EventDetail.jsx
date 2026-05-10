import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchEventBySlug } from '../lib/api.js'
import { adaptEventRow } from '../lib/apiAdapter.js'
import { formatDate } from '../lib/dateFormat.js'
import './EventDetail.css'

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
        <div className="bf-container event-detail__inner">
          <Link to="/events" className="event-detail__back">← 返回活动</Link>
          <h1 className="event-detail__title">未找到这个活动</h1>
          <p className="event-detail__missing">该活动不存在或已被移除。</p>
        </div>
      </main>
    )
  }

  const formattedStart = formatDate(item.date)
  const formattedEnd = formatDate(item.endDate)
  const hasImage = typeof item.image === 'string' && item.image.length > 0
  const ticketUrl = typeof item.ticketUrl === 'string' && item.ticketUrl.length > 0 ? item.ticketUrl : null
  const hasDescription = typeof item.description === 'string' && item.description.trim().length > 0

  return (
    <main className="event-detail">
      <div className="bf-container event-detail__inner">
        <Link to="/events" className="event-detail__back">← 返回活动</Link>

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

        {(formattedStart || formattedEnd) ? (
          <div className="bf-helper">
            <span className="bf-helper-tag">时间</span>
            <p>
              {formattedStart ? <time dateTime={item.date}>{formattedStart}</time> : null}
              {formattedEnd ? <> — <time dateTime={item.endDate}>{formattedEnd}</time></> : null}
            </p>
          </div>
        ) : null}

        {item.location ? (
          <div className="bf-helper">
            <span className="bf-helper-tag">地点</span>
            <p>{item.location}</p>
          </div>
        ) : null}

        {ticketUrl ? (
          <div className="bf-helper">
            <span className="bf-helper-tag">票务</span>
            <p>
              <a
                href={ticketUrl}
                className="bf-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                购票
              </a>
            </p>
          </div>
        ) : null}

        {hasDescription ? (
          <div className="bf-helper">
            <span className="bf-helper-tag">备注</span>
            <div className="event-detail__body">{renderBody(item.description)}</div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
