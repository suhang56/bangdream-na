import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './EventFilter.css'

const TYPES = [
  { type: 'concert', key: 'category.concert' },
  { type: 'fanmeet', key: 'category.fanmeet' },
  { type: 'con', key: 'category.con' },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function EventFilter({
  filterState,
  onChange,
  sortDir,
  onSortChange,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const types = filterState?.types instanceof Set ? filterState.types : new Set()

  function toggleType(type) {
    const next = new Set(types)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange({ types: next })
  }

  function handleSort(e) {
    onSortChange(e.target.value)
  }

  return (
    <div className="event-filter">
      <fieldset className="event-filter__types">
        <legend className="visually-hidden">{t('eventFilter.filterByType')}</legend>
        {TYPES.map(({ type, key }) => {
          const active = types.has(type)
          return (
            <button
              key={type}
              type="button"
              className={`event-filter__chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleType(type)}
            >
              {t(key)}
            </button>
          )
        })}
      </fieldset>

      <fieldset
        className="event-filter__sort"
        role="radiogroup"
        aria-label={t('eventFilter.sortByDate')}
      >
        <legend className="visually-hidden">{t('eventFilter.sortOrder')}</legend>
        <label className="event-filter__sort-option">
          <input
            type="radio"
            name="event-sort"
            value="asc"
            checked={sortDir === 'asc'}
            onChange={handleSort}
          />
          <span>{t('eventFilter.earliestFirst')}</span>
        </label>
        <label className="event-filter__sort-option">
          <input
            type="radio"
            name="event-sort"
            value="desc"
            checked={sortDir === 'desc'}
            onChange={handleSort}
          />
          <span>{t('eventFilter.latestFirst')}</span>
        </label>
      </fieldset>
    </div>
  )
}
