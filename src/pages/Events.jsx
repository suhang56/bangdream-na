import { useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventList from '../components/EventList/EventList.jsx'
import EventSidebar from '../components/EventSidebar/EventSidebar.jsx'
import EventCalendar from '../components/EventCalendar/EventCalendar.jsx'
import {
  filterEvents,
  groupEventsByTime,
  sortEventsByDate,
} from '../lib/events.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import events from '../data/events.json'
import './Events.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function deriveBands(list) {
  const set = new Set()
  for (const e of list) {
    if (Array.isArray(e?.bands)) {
      for (const b of e.bands) {
        if (typeof b === 'string' && b.length > 0) set.add(b)
      }
    }
  }
  return Array.from(set).sort()
}

function applyFilters(list, state) {
  let filtered = filterEvents(list, { types: state.types })

  // band filter — only events with bands array, intersect with selected
  if (state.bands instanceof Set && state.bands.size > 0) {
    filtered = filtered.filter((e) => {
      if (!Array.isArray(e?.bands) || e.bands.length === 0) return false
      return e.bands.some((b) => state.bands.has(b))
    })
  }

  const fromTs = state.from ? Date.parse(state.from) : NaN
  const toTs = state.to ? Date.parse(state.to) + 86_400_000 - 1 : NaN

  if (!Number.isNaN(fromTs) || !Number.isNaN(toTs)) {
    filtered = filtered.filter((e) => {
      const ts = Date.parse(e.date)
      if (Number.isNaN(ts)) return false
      if (!Number.isNaN(fromTs) && ts < fromTs) return false
      if (!Number.isNaN(toTs) && ts > toTs) return false
      return true
    })
  }

  if (state.keyword && state.keyword.length > 0) {
    const kw = state.keyword.toLowerCase()
    filtered = filtered.filter((e) => {
      const hay = (
        (e?.title || '') +
        ' ' +
        (e?.location || '') +
        ' ' +
        (Array.isArray(e?.bands) ? e.bands.join(' ') : '')
      ).toLowerCase()
      return hay.includes(kw)
    })
  }
  return filtered
}

export default function Events() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'list'
  const [filterState, setFilterState] = useState({
    types: new Set(),
    bands: new Set(),
    from: '',
    to: '',
    keyword: '',
  })
  const now = useMemo(() => new Date(), [])
  const availableBands = useMemo(() => deriveBands(events), [])

  const visible = useMemo(
    () => sortEventsByDate(applyFilters(events, filterState), 'asc'),
    [filterState],
  )

  const groups = useMemo(
    () => groupEventsByTime(visible, now),
    [visible, now],
  )

  function setView(nextView) {
    const sp = new URLSearchParams(searchParams)
    if (nextView === 'list') sp.delete('view')
    else sp.set('view', nextView)
    setSearchParams(sp, { replace: true })
  }

  return (
    <main className="events-page section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.events')}</h1>
        <div className="events-page__view-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={
              'events-page__view-btn' +
              (view === 'list' ? ' events-page__view-btn--active' : '')
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
              'events-page__view-btn' +
              (view === 'calendar' ? ' events-page__view-btn--active' : '')
            }
            onClick={() => setView('calendar')}
          >
            {t('btn.viewCalendar')}
          </button>
        </div>
        <p
          className="events-page__count"
          role="status"
          aria-live="polite"
        >
          {t('filter.resultCount', {
            N: groups.upcoming.length,
            M: groups.past.length,
          })}
        </p>
        <div className="events-page__layout">
          <EventSidebar
            filterState={filterState}
            onChange={setFilterState}
            availableBands={availableBands}
          />
          <div className="events-page__content">
            {view === 'calendar' ? (
              <EventCalendar events={visible} now={now} />
            ) : (
              <EventList events={visible} now={now} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
