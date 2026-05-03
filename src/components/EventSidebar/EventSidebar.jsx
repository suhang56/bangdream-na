import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './EventSidebar.css'

const CATEGORIES = ['concert', 'fanmeet', 'con', 'online']

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function activeCount(state) {
  let n = 0
  if (state.types instanceof Set && state.types.size > 0) n += state.types.size
  if (state.bands instanceof Set && state.bands.size > 0) n += state.bands.size
  if (state.from) n += 1
  if (state.to) n += 1
  if (state.keyword && state.keyword.length > 0) n += 1
  return n
}

export default function EventSidebar({
  filterState,
  onChange,
  availableBands = [],
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [mobileOpen, setMobileOpen] = useState(false)
  const headingId = useId()
  const [searchInput, setSearchInput] = useState(filterState.keyword || '')

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== filterState.keyword) {
        onChange({ ...filterState, keyword: searchInput })
      }
    }, 200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function toggleType(type) {
    const next = new Set(filterState.types || [])
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange({ ...filterState, types: next })
  }

  function toggleBand(band) {
    const next = new Set(filterState.bands || [])
    if (next.has(band)) next.delete(band)
    else next.add(band)
    onChange({ ...filterState, bands: next })
  }

  function clearAll() {
    setSearchInput('')
    onChange({
      types: new Set(),
      bands: new Set(),
      from: '',
      to: '',
      keyword: '',
    })
  }

  const count = activeCount(filterState)
  const showBands = Array.isArray(availableBands) && availableBands.length > 0

  return (
    <aside
      className={
        'event-sidebar' + (mobileOpen ? ' event-sidebar--mobile-open' : '')
      }
      aria-labelledby={headingId}
    >
      <button
        type="button"
        className="event-sidebar__toggle"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((p) => !p)}
      >
        <span id={headingId} className="event-sidebar__toggle-label">
          {t('filter.toggleMobile', { N: count })}
        </span>
      </button>
      <div className="event-sidebar__body">
        <fieldset className="event-sidebar__section">
          <legend>{t('filter.category')}</legend>
          <div className="event-sidebar__chips">
            {CATEGORIES.map((cat) => {
              const isActive =
                filterState.types instanceof Set &&
                filterState.types.has(cat)
              return (
                <button
                  type="button"
                  key={cat}
                  className={
                    'event-sidebar__chip' +
                    (isActive ? ' event-sidebar__chip--active' : '')
                  }
                  aria-pressed={isActive}
                  onClick={() => toggleType(cat)}
                >
                  {t('category.' + cat)}
                </button>
              )
            })}
          </div>
        </fieldset>

        {showBands ? (
          <fieldset className="event-sidebar__section">
            <legend>{t('filter.band')}</legend>
            <div className="event-sidebar__chips">
              {availableBands.map((band) => {
                const isActive =
                  filterState.bands instanceof Set &&
                  filterState.bands.has(band)
                return (
                  <button
                    type="button"
                    key={band}
                    className={
                      'event-sidebar__chip' +
                      (isActive ? ' event-sidebar__chip--active' : '')
                    }
                    aria-pressed={isActive}
                    onClick={() => toggleBand(band)}
                  >
                    {band}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="event-sidebar__section">
          <legend>{t('filter.dateRange')}</legend>
          <label className="event-sidebar__date-label">
            <span>{t('filter.dateFrom')}</span>
            <input
              type="date"
              value={filterState.from || ''}
              onChange={(e) =>
                onChange({ ...filterState, from: e.target.value })
              }
            />
          </label>
          <label className="event-sidebar__date-label">
            <span>{t('filter.dateTo')}</span>
            <input
              type="date"
              value={filterState.to || ''}
              onChange={(e) =>
                onChange({ ...filterState, to: e.target.value })
              }
            />
          </label>
        </fieldset>

        <fieldset className="event-sidebar__section">
          <legend>{t('filter.search')}</legend>
          <input
            type="search"
            className="event-sidebar__search"
            placeholder={t('filter.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label={t('filter.search')}
          />
        </fieldset>

        {count > 0 ? (
          <button
            type="button"
            className="event-sidebar__clear"
            onClick={clearAll}
          >
            {t('filter.clear')}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
