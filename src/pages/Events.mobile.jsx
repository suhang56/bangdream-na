import { useState } from 'react'
import EventCalendar from '../components/EventCalendar/EventCalendar.jsx'
import EventFilterSheet from '../components/EventFilterSheet/EventFilterSheet.jsx'
import { formatDate } from '../lib/dateFormat.js'
import { t } from '../lib/uiLanguage.js'
import './Events.mobile.css'

function activeFilterCount(state) {
  let n = 0
  if (state.types instanceof Set && state.types.size > 0) n += state.types.size
  if (state.bands instanceof Set && state.bands.size > 0) n += state.bands.size
  if (state.from) n += 1
  if (state.to) n += 1
  if (state.keyword && state.keyword.length > 0) n += 1
  return n
}

function formatLocationShort(loc) {
  if (typeof loc === 'string') return loc
  if (!loc || typeof loc !== 'object') return ''
  const parts = [loc.city, loc.venue, loc.country].filter(
    (v) => typeof v === 'string' && v.trim() !== '',
  )
  if (parts.length > 0) return parts.join(' · ')
  return Object.values(loc)
    .filter((v) => typeof v === 'string' && v.trim() !== '')
    .join(' · ')
}

function tileHref(event) {
  if (Array.isArray(event?.links) && event.links.length > 0) {
    const first = event.links[0]
    if (first && typeof first.url === 'string' && first.url.length > 0) {
      return first.url
    }
  }
  return null
}

function EventTile({ event }) {
  const href = tileHref(event)
  const hasImage = typeof event.image === 'string' && event.image.length > 0
  const dateText = formatDate(event.date)
  const locationText = formatLocationShort(event.location)
  const inner = (
    <>
      <div
        className="events-mobile__tile-thumb"
        aria-hidden="true"
        style={hasImage ? { backgroundImage: `url(${event.image})` } : undefined}
      />
      <div className="events-mobile__tile-body">
        <h3 className="events-mobile__tile-title">{event.title}</h3>
        {dateText ? (
          <time className="events-mobile__tile-date" dateTime={event.date}>
            {dateText}
          </time>
        ) : null}
        {locationText ? (
          <p className="events-mobile__tile-venue">{locationText}</p>
        ) : null}
      </div>
    </>
  )
  const ariaLabel = dateText ? `${event.title}, ${dateText}` : event.title
  if (href) {
    return (
      <a
        className="events-mobile__tile events-mobile__tile--link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
      >
        {inner}
      </a>
    )
  }
  return (
    <article className="events-mobile__tile" aria-label={ariaLabel}>
      {inner}
    </article>
  )
}

export default function EventsMobile({
  view,
  setView,
  scope,
  setScope,
  filterState,
  onFilterChange,
  availableBands,
  visible,
  groups,
  now,
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const filterCount = activeFilterCount(filterState)
  const scopeList = scope === 'past' ? groups.past : groups.upcoming
  const emptyKey =
    scope === 'past' ? 'empty.noPastEvents' : 'empty.noUpcomingEvents'

  return (
    <main className="events-mobile section">
      <div className="events-mobile__sticky-bar">
        <h1 className="events-mobile__title">{t('nav.events')}</h1>
        <div className="events-mobile__controls">
          <div
            className="events-mobile__view-toggle"
            role="tablist"
            aria-label={t('btn.viewList') + ' / ' + t('btn.viewCalendar')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={
                'events-mobile__view-btn' +
                (view === 'list' ? ' events-mobile__view-btn--active' : '')
              }
              onClick={() => setView('list')}
            >
              {t('btn.viewList')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'calendar'}
              className={
                'events-mobile__view-btn' +
                (view === 'calendar' ? ' events-mobile__view-btn--active' : '')
              }
              onClick={() => setView('calendar')}
            >
              {t('btn.viewCalendar')}
            </button>
          </div>
          <div
            className="events-mobile__scope"
            role="tablist"
            aria-label={t('events.filters')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'upcoming'}
              className={
                'events-mobile__scope-chip' +
                (scope === 'upcoming'
                  ? ' events-mobile__scope-chip--active'
                  : '')
              }
              onClick={() => setScope('upcoming')}
            >
              {t('events.scope.upcoming')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'past'}
              className={
                'events-mobile__scope-chip' +
                (scope === 'past' ? ' events-mobile__scope-chip--active' : '')
              }
              onClick={() => setScope('past')}
            >
              {t('events.scope.past')}
            </button>
          </div>
          <button
            type="button"
            className={
              'events-mobile__filter-pill' +
              (filterCount > 0
                ? ' events-mobile__filter-pill--active'
                : '')
            }
            aria-label={t('events.filtersOpen')}
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <span className="events-mobile__filter-pill-label">
              {t('events.filters')}
            </span>
            {filterCount > 0 ? (
              <span
                className="events-mobile__filter-badge"
                aria-hidden="true"
              >
                {filterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="events-mobile__body">
        {view === 'calendar' ? (
          <EventCalendar events={visible} now={now} />
        ) : scopeList.length === 0 ? (
          <p
            className="events-mobile__empty"
            role="status"
            aria-live="polite"
          >
            {t(emptyKey)}
          </p>
        ) : (
          <ul className="events-mobile__list">
            {scopeList.map((e) => (
              <li key={e.id} className="events-mobile__list-item">
                <EventTile event={e} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <EventFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filterState={filterState}
        onChange={onFilterChange}
        availableBands={availableBands}
      />
    </main>
  )
}
