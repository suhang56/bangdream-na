import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import EventsMobile from './Events.mobile.jsx'
import EventsDesktop from './Events.desktop.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchEvents } from '../lib/api.js'
import { adaptEventList } from '../lib/apiAdapter.js'
import {
  filterEvents,
  groupEventsByTime,
  sortEventsByDate,
} from '../lib/events.js'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'

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
  const scope = searchParams.get('scope') === 'past' ? 'past' : 'upcoming'
  const [filterState, setFilterState] = useState({
    types: new Set(),
    bands: new Set(),
    from: '',
    to: '',
    keyword: '',
  })
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchEvents({ scope: 'upcoming' }),
      fetchEvents({ scope: 'past' }),
    ])
      .then(([upcoming, past]) => {
        if (cancelled) return
        const merged = [...adaptEventList(upcoming), ...adaptEventList(past)]
        setEvents(merged)
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

  const availableBands = useMemo(() => deriveBands(events), [events])

  const visible = useMemo(
    () => sortEventsByDate(applyFilters(events, filterState), 'asc'),
    [filterState, events],
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

  function setScope(nextScope) {
    const sp = new URLSearchParams(searchParams)
    if (nextScope === 'upcoming') sp.delete('scope')
    else sp.set('scope', nextScope)
    setSearchParams(sp, { replace: true })
  }

  if (status === 'loading') {
    return <LoadingState className="events-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="events-error" onRetry={retry} />
  }

  const layoutProps = {
    view,
    setView,
    scope,
    setScope,
    filterState,
    onFilterChange: setFilterState,
    availableBands,
    visible,
    groups,
    now,
  }

  return (
    <>
      <Mobile>
        <EventsMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <EventsDesktop {...layoutProps} />
      </Desktop>
    </>
  )
}
