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
  const dialogRef = useRef(null)
  const [searchInput, setSearchInput] = useState(filterState.keyword || '')

  // Sync native <dialog> open state with the prop. showModal() gives us
  // focus-trap, Escape-to-close, and ::backdrop for free.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal()
      } else {
        dialog.setAttribute('open', '')
      }
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close()
      } else {
        dialog.removeAttribute('open')
      }
    }
    return undefined
  }, [open])

  // Native <dialog> dispatches 'close' on Escape; route it through onClose.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    function handleClose() {
      onClose?.()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

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

  // <dialog>'s click region includes the ::backdrop; clicks on the backdrop
  // have target === dialog itself, while clicks on inner content bubble from
  // descendants. Compare bounding rect to detect outside-content clicks.
  function onDialogClick(e) {
    const dialog = dialogRef.current
    if (!dialog || e.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    if (!inside) onClose?.()
  }

  const count = activeCount(filterState)
  const showBands = Array.isArray(availableBands) && availableBands.length > 0

  return (
    <dialog
      ref={dialogRef}
      className="event-filter-sheet"
      aria-labelledby={headingId}
      onClick={onDialogClick}
      data-testid="event-filter-sheet-dialog"
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
    </dialog>
  )
}
