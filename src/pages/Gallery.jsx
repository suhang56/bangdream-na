import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import PhotoGrid from '../components/Gallery/PhotoGrid.jsx'
import Lightbox from '../components/Gallery/Lightbox.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchGallery } from '../lib/api.js'
import { adaptGalleryRow } from '../lib/apiAdapter.js'
import { buildGroups, extractGroupOptions } from '../lib/gallery/grouping.js'
import { getLanguage, subscribeLanguage, t } from '../lib/uiLanguage.js'
import './Gallery.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

const FILTER_PARAM = 'album'
const ALL_VALUE = ''

export default function Gallery() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [searchParams, setSearchParams] = useSearchParams()
  const [lightbox, setLightbox] = useState({ open: false, index: 0, items: [] })
  const [reloadKey, setReloadKey] = useState(0)

  const selectedGroupId = searchParams.get(FILTER_PARAM) || null

  useEffect(() => {
    let cancelled = false
    fetchGallery({ limit: 100 })
      .then((res) => {
        if (cancelled) return
        const adapted = (Array.isArray(res?.items) ? res.items : [])
          .map(adaptGalleryRow)
          .filter(Boolean)
        setItems(adapted)
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

  const groupOptions = useMemo(() => extractGroupOptions(items), [items])
  const groups = useMemo(
    () => buildGroups(items, selectedGroupId),
    [items, selectedGroupId],
  )

  useEffect(() => {
    if (status !== 'ready') return
    if (typeof window === 'undefined') return
    const hash = window.location.hash || ''
    if (!hash.startsWith('#')) return
    const id = hash.slice(1)
    if (!id) return
    const el = document.getElementById(id)
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [status, groups])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  function setSelectedGroupId(nextId) {
    const next = new URLSearchParams(searchParams)
    if (nextId) next.set(FILTER_PARAM, nextId)
    else next.delete(FILTER_PARAM)
    setSearchParams(next, { replace: true })
  }

  function onItemClick(_index, item, group) {
    const flat = group ? group.items : items
    const idx = Math.max(
      0,
      flat.findIndex((x) => x.id === item.id),
    )
    setLightbox({ open: true, index: idx, items: flat })
  }

  function closeLightbox() {
    setLightbox((s) => ({ ...s, open: false }))
  }

  if (status === 'loading') return <LoadingState className="gallery-loading" />
  if (status === 'error') {
    return <ErrorState className="gallery-error" onRetry={retry} />
  }

  const totalImages = items.length
  const groupCount = groupOptions.length
  const selectedOption = selectedGroupId
    ? groupOptions.find((o) => o.id === selectedGroupId) ?? null
    : null
  const isEmpty = totalImages === 0

  return (
    <>
      <div className="bf-page-hero">
        <div className="bf-page-hero__inner bf-container">
          <h1 className="bf-page-hero__title">{t('nav.gallery')}</h1>
          <p className="bf-page-hero__subtitle">
            {t('gallery.groupMeta', { groupCount, imageCount: totalImages })}
          </p>
        </div>
      </div>

      <div className="bf-container bf-gallery-body">
        {!isEmpty && (
          <div
            className="bf-gallery-filter"
            role="group"
            aria-label={t('gallery.filterAria')}
          >
            <button
              type="button"
              className={`bf-gallery-chip${selectedGroupId ? '' : ' bf-gallery-chip--active'}`}
              onClick={() => setSelectedGroupId(null)}
            >
              {t('gallery.filter.allOption')}
            </button>
            <select
              className="bf-gallery-select"
              aria-label={t('gallery.filter.dropdownAria')}
              value={selectedGroupId ?? ALL_VALUE}
              onChange={(e) => setSelectedGroupId(e.target.value || null)}
            >
              <option value={ALL_VALUE}>{t('gallery.filter.placeholder')}</option>
              {groupOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {`${o.label} ${t('gallery.filter.optionMeta', { count: o.count })}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedOption && (
          <div className="bf-active-filter" role="status">
            <span>{t('gallery.filter.active', { label: selectedOption.label })}</span>
            <button
              type="button"
              className="bf-active-filter__clear"
              aria-label={t('gallery.filter.clear')}
              onClick={() => setSelectedGroupId(null)}
            >
              ×
            </button>
          </div>
        )}

        {isEmpty ? (
          <p className="bf-gallery-empty" role="status">
            {t('gallery.empty')}
          </p>
        ) : groups.length === 0 ? (
          <p className="bf-gallery-empty" role="status">
            {t('gallery.emptyFilter')}
          </p>
        ) : (
          <div className="bf-album-grid">
            {groups.map((group) => (
              <section
                key={group.id}
                id={group.id}
                className="bf-album"
                aria-labelledby={`heading-${group.id}`}
              >
                <div className="bf-album__header">
                  <h2
                    className="bf-album__title"
                    id={`heading-${group.id}`}
                  >
                    <button
                      type="button"
                      className="bf-album__title-btn"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      {group.label}
                    </button>
                  </h2>
                  <div className="bf-album__meta">
                    {group.items.length} {t('gallery.photoCountSuffix')}
                    {group.dateRange ? ` · ${group.dateRange}` : ''}
                  </div>
                </div>
                <PhotoGrid
                  items={group.items}
                  onItemClick={(idx, item) => onItemClick(idx, item, group)}
                  ariaLabel={group.label}
                />
              </section>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        items={lightbox.items}
        open={lightbox.open}
        index={lightbox.index}
        onClose={closeLightbox}
      />
    </>
  )
}
