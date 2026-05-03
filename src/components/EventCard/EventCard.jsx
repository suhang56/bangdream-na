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
import { parseEventDate } from '../../lib/events.js'
import { formatDate } from '../../lib/dateFormat.js'
import TypeBadge from '../TypeBadge/TypeBadge.jsx'
import './EventCard.css'

const REL_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const MS_PER_DAY = 86_400_000

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

export default function EventCard({ event, now = new Date() }) {
  const date = parseEventDate(event.date)
  const isPast = date !== null && date.getTime() < now.getTime()
  const formatted = formatDate(event.date)
  const relative = !isPast ? formatRelative(date, now) : null
  const hasImage = typeof event.image === 'string' && event.image.length > 0
  const hasLinks = Array.isArray(event.links) && event.links.length > 0

  const ariaLabel = formatted ? `${event.title}, ${formatted}` : event.title

  return (
    <article
      className={`event-card${isPast ? ' event-card--past' : ''}`}
      aria-label={ariaLabel}
    >
      <div
        className="event-card__image card-thumb-16-9"
        aria-hidden="true"
        style={hasImage ? { backgroundImage: `url(${event.image})` } : undefined}
      />
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
        <h3 className="event-card__title">{event.title}</h3>
        {event.location ? (
          <p className="event-card__location">{event.location}</p>
        ) : null}
        {event.description ? (
          <p className="event-card__description">{event.description}</p>
        ) : null}
        {hasLinks ? (
          <ul className="event-card__links">
            {event.links.map(({ label, url }) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  )
}
