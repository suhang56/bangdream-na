import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './NewsSidebar.css'

const CATEGORIES = ['announcement', 'event', 'community', 'release']

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function activeCount(state) {
  let n = 0
  if (state.categories instanceof Set && state.categories.size > 0) n += state.categories.size
  if (state.from) n += 1
  if (state.to) n += 1
  if (state.keyword && state.keyword.length > 0) n += 1
  return n
}

export default function NewsSidebar({ filterState, onChange }) {
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

  function toggleCategory(cat) {
    const next = new Set(filterState.categories || [])
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    onChange({ ...filterState, categories: next })
  }

  function clearAll() {
    setSearchInput('')
    onChange({ categories: new Set(), from: '', to: '', keyword: '' })
  }

  const count = activeCount(filterState)

  return (
    <aside
      className={
        'news-sidebar' + (mobileOpen ? ' news-sidebar--mobile-open' : '')
      }
      aria-labelledby={headingId}
    >
      <button
        type="button"
        className="news-sidebar__toggle"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((p) => !p)}
      >
        <span id={headingId} className="news-sidebar__toggle-label">
          {t('filter.toggleMobile', { N: count })}
        </span>
      </button>
      <div className="news-sidebar__body">
        <fieldset className="news-sidebar__section">
          <legend>{t('filter.category')}</legend>
          <div className="news-sidebar__chips">
            {CATEGORIES.map((cat) => {
              const isActive =
                filterState.categories instanceof Set &&
                filterState.categories.has(cat)
              return (
                <button
                  type="button"
                  key={cat}
                  className={
                    'news-sidebar__chip' +
                    (isActive ? ' news-sidebar__chip--active' : '')
                  }
                  aria-pressed={isActive}
                  onClick={() => toggleCategory(cat)}
                >
                  {t('newsCategory.' + cat)}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset className="news-sidebar__section">
          <legend>{t('filter.dateRange')}</legend>
          <label className="news-sidebar__date-label">
            <span>{t('filter.dateFrom')}</span>
            <input
              type="date"
              value={filterState.from || ''}
              onChange={(e) =>
                onChange({ ...filterState, from: e.target.value })
              }
            />
          </label>
          <label className="news-sidebar__date-label">
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
        <fieldset className="news-sidebar__section">
          <legend>{t('filter.search')}</legend>
          <input
            type="search"
            className="news-sidebar__search"
            placeholder={t('filter.searchPlaceholderNews')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label={t('filter.search')}
          />
        </fieldset>
        {count > 0 ? (
          <button
            type="button"
            className="news-sidebar__clear"
            onClick={clearAll}
          >
            {t('filter.clear')}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
