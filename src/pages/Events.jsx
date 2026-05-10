import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import SectionTitle from '../components/SectionTitle/SectionTitle.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchEvents } from '../lib/api.js'
import { adaptEventList } from '../lib/apiAdapter.js'
import { formatDate } from '../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import './Events.css'

function subscribe(cb) { return subscribeLanguage(cb) }
function getSnapshot() { return getLanguage() }

function EventRow({ item }) {
  const slug = item.id
  const dateStr = formatDate(item.date) ?? item.date ?? ''
  const hasTicket = typeof item.ticketUrl === 'string' && item.ticketUrl.length > 0

  return (
    <tr>
      <td className="td-d">{dateStr}</td>
      <td className="td-title">
        <Link to={`/events/${slug}`}>{item.title}</Link>
        {item.location ? <small>{item.location}</small> : null}
      </td>
      <td className="td-cat bf-hide-mobile">{item.location ?? '—'}</td>
      <td className="bf-hide-mobile">
        {hasTicket ? (
          <a
            href={item.ticketUrl}
            className="td-buy"
            target="_blank"
            rel="noopener noreferrer"
          >
            购票
          </a>
        ) : (
          <span>—</span>
        )}
      </td>
    </tr>
  )
}

export default function Events() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [upcoming, setUpcoming] = useState([])
  const [past, setPast] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    Promise.all([
      fetchEvents({ scope: 'upcoming' }),
      fetchEvents({ scope: 'past' }),
    ])
      .then(([upResp, pastResp]) => {
        if (cancelled) return
        setUpcoming(adaptEventList(upResp))
        setPast(adaptEventList(pastResp))
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
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') {
    return <LoadingState className="events-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="events-error" onRetry={retry} />
  }

  return (
    <>
      <section className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// {t('nav.events')}</span>
            <h1>{t('nav.events')}</h1>
          </div>
          <span className="ph-meta">
            {upcoming.length} {t('events.scope.upcoming')} · {past.length} {t('events.scope.past')}
          </span>
        </div>
      </section>

      <div className="bf-page-body">
        <div className="bf-container">
          <SectionTitle jp="UPCOMING EVENTS" cn="即将到来" />
          {upcoming.length === 0 ? (
            <p className="bf-events-counter">暂无即将到来的活动</p>
          ) : (
            <table className="bf-tbl">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>日期</th>
                  <th>活动名称</th>
                  <th className="bf-hide-mobile" style={{ width: 200 }}>地点</th>
                  <th className="bf-hide-mobile" style={{ width: 80 }}>票务</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((item) => (
                  <EventRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          )}

          <div className="bf-events-gap" />

          <SectionTitle jp="PAST EVENTS" cn="往期活动" />
          {past.length === 0 ? (
            <p className="bf-events-counter">暂无往期活动</p>
          ) : (
            <table className="bf-tbl bf-tbl-muted">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>日期</th>
                  <th>活动名称</th>
                  <th className="bf-hide-mobile" style={{ width: 200 }}>地点</th>
                  <th className="bf-hide-mobile" style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {past.map((item) => (
                  <EventRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
