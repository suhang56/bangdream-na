import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './EventFilterSheet.css'

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

export default function EventFilterSheet({
  open,
  onClose,
  filterState,
  onChange,
  availableBands = [],
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const headingId = useId()
  const sheetRef = useRef(null)
  const [searchInput, setSearchInput] = useState(filterState.keyword || '')

  // Debounced commit of search input.
  useEffect(() => {
    if (!open) return undefined
    const handle = setTimeout(() => {
      if (searchInput !== filterState.keyword) {
        onChange({ ...filterState, keyword: searchInput })
      }
    }, 200)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, open])

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

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

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  const count = activeCount(filterState)
  const showBands = Array.isArray(availableBands) && availableBands.length > 0

  return (
    <div
      className="event-filter-sheet__backdrop"
      onClick={onBackdropClick}
      data-testid="event-filter-sheet-backdrop"
    >
      <div
        ref={sheetRef}
        className="event-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="event-filter-sheet__header">
          <h2 id={headingId} className="event-filter-sheet__heading">
            {t('events.filters')}
          </h2>
          <button
            type="button"
            className="event-filter-sheet__close"
            onClick={onClose}
            aria-label={t('events.filtersClose')}
          >
            ×
          </button>
        </div>
        <div className="event-filter-sheet__body">
          <fieldset className="event-filter-sheet__section">
            <legend>{t('filter.category')}</legend>
            <div className="event-filter-sheet__chips">
              {CATEGORIES.map((cat) => {
                const isActive =
                  filterState.types instanceof Set &&
                  filterState.types.has(cat)
                return (
                  <button
                    type="button"
                    key={cat}
                    className={
                      'event-filter-sheet__chip' +
                      (isActive ? ' event-filter-sheet__chip--active' : '')
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
            <fieldset className="event-filter-sheet__section">
              <legend>{t('filter.band')}</legend>
              <div className="event-filter-sheet__chips">
                {availableBands.map((band) => {
                  const isActive =
                    filterState.bands instanceof Set &&
                    filterState.bands.has(band)
                  return (
                    <button
                      type="button"
                      key={band}
                      className={
                        'event-filter-sheet__chip' +
                        (isActive
                          ? ' event-filter-sheet__chip--active'
                          : '')
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

          <fieldset className="event-filter-sheet__section">
            <legend>{t('filter.dateRange')}</legend>
            <label className="event-filter-sheet__date-label">
              <span>{t('filter.dateFrom')}</span>
              <input
                type="date"
                value={filterState.from || ''}
                onChange={(e) =>
                  onChange({ ...filterState, from: e.target.value })
                }
              />
            </label>
            <label className="event-filter-sheet__date-label">
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

          <fieldset className="event-filter-sheet__section">
            <legend>{t('filter.search')}</legend>
            <input
              type="search"
              className="event-filter-sheet__search"
              placeholder={t('filter.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={t('filter.search')}
            />
          </fieldset>
        </div>
        <div className="event-filter-sheet__footer">
          {count > 0 ? (
            <button
              type="button"
              className="event-filter-sheet__clear"
              onClick={clearAll}
            >
              {t('filter.clear')}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="event-filter-sheet__apply"
            onClick={onClose}
          >
            {t('events.filtersApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
