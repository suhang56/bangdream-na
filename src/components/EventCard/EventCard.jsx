/**
 * @typedef {Object} EventLink
 * @property {string} label
 * @property {string} url
 *
 * @typedef {Object} EventEntry
 * @property {string} id
 * @property {string} title
 * @property {string} date     - ISO 8601 with timezone
 * @property {string} location
 * @property {'concert'|'fanmeet'|'con'} type
 * @property {string} description
 * @property {EventLink[]} [links]
 * @property {string} [image]  - URL; falls back to gradient placeholder
 *
 * Visual treatment + spacing: see docs/p2-design.md (single source of truth).
 * Schema details: see docs/p2-architecture.md §3.
 */
import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { parseEventDate } from '../../lib/events.js'
import { formatDate } from '../../lib/dateFormat.js'
import { getLanguage, subscribeLanguage, t } from '../../lib/uiLanguage.js'
import TypeBadge from '../TypeBadge/TypeBadge.jsx'
import './EventCard.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

const REL_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const MS_PER_DAY = 86_400_000

function formatLocation(loc) {
  if (typeof loc === 'string') return loc
  if (!loc || typeof loc !== 'object') return ''
  const preferred = [loc.city, loc.venue, loc.country].filter((v) => typeof v === 'string' && v.trim() !== '')
  if (preferred.length > 0) return preferred.join(' · ')
  return Object.values(loc).filter((v) => typeof v === 'string' && v.trim() !== '').join(' · ')
}

function formatRelative(date, now) {
  if (!date) return null
  const diffMs = date.getTime() - now.getTime()
  if (diffMs <= 0) return null
  const days = Math.round(diffMs / MS_PER_DAY)
  if (days > 30) return null
  try {
    return REL_FORMATTER.format(days, 'day')
  } catch {
    return null
  }
}

export default function EventCard({ event, now = new Date(), variant = 'default' }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const isCompact = variant === 'compact'
  const date = parseEventDate(event.date)
  const isPast = date !== null && date.getTime() < now.getTime()
  const formatted = formatDate(event.date)
  const relative = !isPast ? formatRelative(date, now) : null
  const hasImage = typeof event.image === 'string' && event.image.length > 0
  const hasLinks = Array.isArray(event.links) && event.links.length > 0
  const ticketUrl = typeof event.ticketUrl === 'string' && event.ticketUrl.length > 0 ? event.ticketUrl : null
  const detailHref = event.id ? `/events/${encodeURIComponent(event.id)}` : null

  const ariaLabel = formatted ? `${event.title}, ${formatted}` : event.title

  return (
    <article
      className={[
        'event-card',
        isPast ? 'event-card--past' : '',
        isCompact ? 'event-card--compact' : '',
      ].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
    >
      <div
        className="event-card__image card-thumb-16-9"
        aria-hidden="true"
        style={hasImage ? { backgroundImage: `url(${event.image})` } : undefined}
      >
        {!hasImage && isCompact ? (
          <span className="event-card__placeholder-glyph" aria-hidden="true">◆</span>
        ) : null}
      </div>
      <div className="event-card__body">
        <div className="event-card__meta">
          <TypeBadge type={event.type} />
          {formatted ? (
            <time className="event-card__date" dateTime={event.date}>
              {formatted}
            </time>
          ) : null}
          {relative ? (
            <span className="event-card__relative">{relative}</span>
          ) : null}
        </div>
        <h3 className="event-card__title">
          {detailHref ? (
            <Link to={detailHref} className="event-card__title-link">
              {event.title}
            </Link>
          ) : (
            event.title
          )}
        </h3>
        {event.location ? (
          <p className="event-card__location">{formatLocation(event.location)}</p>
        ) : null}
        {event.description ? (
          <p className="event-card__description">{event.description}</p>
        ) : null}
        {(hasLinks || ticketUrl) ? (
          <ul className="event-card__links">
            {hasLinks
              ? event.links.map(({ label, url }) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {label}
                    </a>
                  </li>
                ))
              : null}
            {ticketUrl ? (
              <li>
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  {t('btn.tickets')}
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
