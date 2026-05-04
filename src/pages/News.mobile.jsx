import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import './News.mobile.css'

const CATEGORIES = ['announcement', 'event', 'community', 'release']

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function resolveCategoryKey(item) {
  const raw = item?.category ?? item?.tag
  return CATEGORIES.indexOf(raw) >= 0 ? raw : 'announcement'
}

function excerpt(item) {
  if (typeof item?.summary === 'string' && item.summary.trim().length > 0) {
    return item.summary.trim()
  }
  if (typeof item?.body !== 'string') return ''
  const trimmed = item.body.trim()
  const firstPara = trimmed.split(/\n\n/)[0] || ''
  return firstPara.replace(/\n+/g, ' ')
}

function MobileNewsCard({ item }) {
  const date = formatDate(item?.date)
  const categoryKey = resolveCategoryKey(item)
  const categoryLabel = t('newsCategory.' + categoryKey)
  const hasImage = typeof item?.image === 'string' && item.image.length > 0
  const summary = excerpt(item)
  const tagList = Array.isArray(item?.tags) ? item.tags : []
  const id = typeof item?.id === 'string' ? item.id : ''
  const ariaLabel = [item?.title, date, summary]
    .filter((p) => typeof p === 'string' && p.length > 0)
    .join(', ')

  const cardInner = (
    <article
      className={
        'news-mobile-card' +
        (hasImage ? '' : ' news-mobile-card--no-image')
      }
      aria-label={ariaLabel}
    >
      {hasImage ? (
        <div
          className="news-mobile-card__hero card-thumb-16-9"
          role="img"
          aria-label=""
          style={{ backgroundImage: `url(${item.image})` }}
        />
      ) : null}
      <div className="news-mobile-card__body">
        <div className="news-mobile-card__meta">
          <span
            className={
              'news-mobile-card__category news-mobile-card__category--' + categoryKey
            }
            data-category={categoryKey}
          >
            {categoryLabel}
          </span>
          {date ? (
            <time className="news-mobile-card__date" dateTime={item.date}>
              {date}
            </time>
          ) : null}
        </div>
        <h2 className="news-mobile-card__title">{item?.title ?? ''}</h2>
        {summary ? (
          <p className="news-mobile-card__summary">{summary}</p>
        ) : null}
        {tagList.length > 0 ? (
          <ul className="news-mobile-card__tags" aria-label="tags">
            {tagList.slice(0, 4).map((tag) => (
              <li key={tag} className="news-mobile-card__tag">
                #{tag}
              </li>
            ))}
            {tagList.length > 4 ? (
              <li className="news-mobile-card__tag news-mobile-card__tag--more">
                +{tagList.length - 4}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </article>
  )

  if (id.length > 0) {
    return (
      <Link
        to={`/news/${encodeURIComponent(id)}`}
        className="news-mobile-card__link"
      >
        {cardInner}
      </Link>
    )
  }
  return cardInner
}

export default function NewsMobile({
  visible,
  filterState,
  onChange,
  onClear,
  totalCount,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(filterState.keyword || '')
  const searchInputRef = useRef(null)
  const searchHeadingId = useId()
  const filterHeadingId = useId()

  useEffect(() => {
    if (!searchOpen) return
    const id = window.setTimeout(() => {
      if (searchInput !== filterState.keyword) {
        onChange({ ...filterState, keyword: searchInput })
      }
    }, 200)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, searchOpen])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  const activeCategory =
    filterState.categories instanceof Set && filterState.categories.size > 0
      ? Array.from(filterState.categories)[0]
      : 'all'

  function setCategory(cat) {
    if (cat === 'all' || cat === activeCategory) {
      onChange({ ...filterState, categories: new Set() })
      return
    }
    onChange({ ...filterState, categories: new Set([cat]) })
  }

  function openSearch() {
    setSearchOpen(true)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchInput('')
    if (filterState.keyword) {
      onChange({ ...filterState, keyword: '' })
    }
  }

  function handleClearAll() {
    setSearchInput('')
    setSearchOpen(false)
    onClear?.()
  }

  const isEmptyTotal = totalCount === 0
  const visibleList = Array.isArray(visible) ? visible : []
  const isFilteredEmpty = !isEmptyTotal && visibleList.length === 0

  return (
    <main className="news-mobile" aria-labelledby={filterHeadingId}>
      <header className="news-mobile__hero">
        <h1 id={filterHeadingId} className="news-mobile__title">
          {t('nav.news')}
        </h1>
      </header>

      <div className="news-mobile__filter-strip" role="group" aria-label={t('newsCategory.all')}>
        {searchOpen ? (
          <div className="news-mobile__search-row">
            <input
              ref={searchInputRef}
              type="search"
              className="news-mobile__search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('filter.searchPlaceholderNews')}
              aria-label={t('filter.search')}
              aria-describedby={searchHeadingId}
            />
            <span id={searchHeadingId} className="visually-hidden">
              {t('filter.search')}
            </span>
            <button
              type="button"
              className="news-mobile__search-cancel"
              onClick={closeSearch}
              aria-label="cancel"
              data-testid="news-mobile-search-cancel"
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <ul className="news-mobile__chip-row" role="tablist">
              <li>
                <button
                  type="button"
                  role="tab"
                  className={
                    'news-mobile__chip' +
                    (activeCategory === 'all' ? ' news-mobile__chip--active' : '')
                  }
                  aria-selected={activeCategory === 'all'}
                  aria-pressed={activeCategory === 'all'}
                  onClick={() => setCategory('all')}
                >
                  {t('newsCategory.all')}
                </button>
              </li>
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      role="tab"
                      className={
                        'news-mobile__chip news-mobile__chip--' + cat +
                        (active ? ' news-mobile__chip--active' : '')
                      }
                      aria-selected={active}
                      aria-pressed={active}
                      onClick={() => setCategory(cat)}
                    >
                      {t('newsCategory.' + cat)}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="news-mobile__search-button"
              onClick={openSearch}
              aria-label={t('filter.search')}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {isEmptyTotal ? (
        <div className="news-mobile__empty" role="status" aria-live="polite">
          <span className="news-mobile__empty-glyph news-mobile__empty-glyph--lemon" aria-hidden="true">
            ◈
          </span>
          <p className="news-mobile__empty-text">{t('empty.noNews')}</p>
        </div>
      ) : isFilteredEmpty ? (
        <div className="news-mobile__empty" role="status" aria-live="polite">
          <span className="news-mobile__empty-glyph news-mobile__empty-glyph--coral" aria-hidden="true">
            ◈
          </span>
          <p className="news-mobile__empty-text">{t('empty.noNewsMatch')}</p>
          <button
            type="button"
            className="news-mobile__empty-clear"
            onClick={handleClearAll}
          >
            {t('filter.clear')}
          </button>
        </div>
      ) : (
        <ul className="news-mobile__list">
          {visibleList.map((item) => (
            <li key={item.id ?? item.title} className="news-mobile__list-item">
              <MobileNewsCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
