import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import GalleryMobile from './Gallery.mobile.jsx'
import GalleryDesktop from './Gallery.desktop.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import Lightbox from '../components/Gallery/Lightbox.jsx'
import { fetchGallery } from '../lib/api.js'
import { adaptGalleryRow } from '../lib/apiAdapter.js'
import { buildGroups, extractGroupOptions } from '../lib/gallery/grouping.js'
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

const FILTER_PARAM = 'album'

/**
 * Gallery shell — owns ALL state + data fetching. The `?album=<group-id>`
 * URL param is the single source of truth for filter state via
 * useSearchParams. Mobile/desktop tracks are pure presentational. The
 * separate hash anchor `/gallery#event-{slug}` still scrolls to a group on
 * mount — orthogonal to the filter param.
 */
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

  // Hash anchor scroll: when groups arrive, look for #group-id and scroll.
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
    // Replace, not push — back button shouldn't accumulate intermediate
    // filter selections (this is in-place page state, not navigation).
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

  const layoutProps = {
    groups,
    groupOptions,
    selectedGroupId,
    selectedOption,
    onSelectGroup: setSelectedGroupId,
    totalImages,
    groupCount,
    onItemClick,
    isEmpty: totalImages === 0,
  }

  return (
    <>
      <Mobile>
        <GalleryMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <GalleryDesktop {...layoutProps} />
      </Desktop>
      <Lightbox
        items={lightbox.items}
        open={lightbox.open}
        index={lightbox.index}
        onClose={closeLightbox}
      />
    </>
  )
}
