import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ApiError,
  adminListEvents,
  adminListGallery,
  createGalleryItem,
  deleteGalleryItem,
  getSubmissionStats,
  uploadImage,
} from '../../lib/api.js'
import { adaptGalleryRow } from '../../lib/apiAdapter.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import PendingQueue from './PendingQueue.jsx'
import './GalleryTab.css'

const SUB_TABS = ['published', 'pending', 'trusted']
const STATS_POLL_MS = 30_000

function readTabFromUrl() {
  if (typeof window === 'undefined' || !window.location) return 'published'
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('tab')
  if (raw && SUB_TABS.includes(raw)) return raw
  return 'published'
}

function writeTabToUrl(tab) {
  if (typeof window === 'undefined' || !window.history) return
  const params = new URLSearchParams(window.location.search)
  params.set('tab', tab)
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`
  window.history.replaceState(null, '', next)
}

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

let pendingIdCounter = 0
function nextPendingId() {
  pendingIdCounter += 1
  return `p${Date.now()}-${pendingIdCounter}`
}

function isoDateToUnixSeconds(s) {
  if (typeof s !== 'string' || s.length === 0) return null
  const d = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor(d.getTime() / 1000)
}

function unixSecondsToIsoDate(sec) {
  if (typeof sec !== 'number') return ''
  const d = new Date(sec * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function makePendingFromFile(file) {
  return {
    id: nextPendingId(),
    file,
    objectUrl: URL.createObjectURL(file),
    source: 'event',
    eventId: '',
    album: '',
    caption: '',
    takenAt: '',
    status: 'idle', // idle | uploading | success | error
    errorMessage: null,
  }
}

/**
 * Admin sibling-tab: drag-drop or file-pick → per-item form → batch submit.
 * Sibling to <AdminSettings /> and <SiteSettingsTab />. Lives outside d1Schemas
 * because the AdminEditor generic field renderer cannot host the batch flow.
 *
 * Props:
 *   onAuthExpired?: () => void
 *   onForbidden?: () => void
 */
export default function GalleryTab({ onAuthExpired, onForbidden }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const [activeTab, setActiveTab] = useState(() => readTabFromUrl())
  const [pendingCount, setPendingCount] = useState(0)

  const refreshStats = useCallback(async () => {
    try {
      const stats = await getSubmissionStats()
      if (stats && typeof stats.pending === 'number') {
        setPendingCount((prev) => (prev === stats.pending ? prev : stats.pending))
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        return // surface via main tab listing on next interaction
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStats()
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      refreshStats()
    }, STATS_POLL_MS)
    return () => clearInterval(interval)
  }, [refreshStats])

  function selectTab(next) {
    if (next === 'trusted') return
    setActiveTab(next)
    writeTabToUrl(next)
  }

  const [existingItems, setExistingItems] = useState([])
  const [eventOptions, setEventOptions] = useState([])
  const [pendingItems, setPendingItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  function handleAuthError(err) {
    if (err instanceof ApiError) {
      if (err.status === 401) onAuthExpired?.()
      else if (err.status === 403) onForbidden?.()
    }
  }

  async function refreshExisting() {
    try {
      const res = await adminListGallery()
      const items = Array.isArray(res?.items) ? res.items : []
      setExistingItems(items.map(adaptGalleryRow).filter(Boolean))
    } catch (err) {
      handleAuthError(err)
      setLoadError(err?.message ?? String(err))
    }
  }

  useEffect(() => {
    // `loading` initializes to true via useState; no setLoading(true) here —
    // the react-hooks/set-state-in-effect lint rejects sync setState in effect
    // bodies, and the redundant reset isn't needed (effect runs once on mount).
    let cancelled = false
    Promise.all([
      adminListGallery().catch((err) => {
        if (!cancelled) handleAuthError(err)
        throw err
      }),
      adminListEvents().catch(() => ({ items: [] })),
    ])
      .then(([gallery, events]) => {
        if (cancelled) return
        const items = Array.isArray(gallery?.items) ? gallery.items : []
        setExistingItems(items.map(adaptGalleryRow).filter(Boolean))
        const evItems = Array.isArray(events?.items) ? events.items : []
        setEventOptions(
          evItems.map((e) => ({
            id: e.id,
            slug: e.slug,
            title: e.title_zh || e.title_en || e.slug,
          })),
        )
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err?.message ?? String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke blob URLs on unmount.
  // Mirror pendingItems into a ref so the unmount cleanup sees the LATEST list,
  // not the empty array captured at mount.
  const pendingRef = useRef(pendingItems)
  useEffect(() => {
    pendingRef.current = pendingItems
  }, [pendingItems])
  useEffect(() => {
    return () => {
      // jsdom does not always implement URL.revokeObjectURL — guard accordingly.
      if (typeof URL?.revokeObjectURL !== 'function') return
      pendingRef.current.forEach((p) => {
        if (p.objectUrl) URL.revokeObjectURL(p.objectUrl)
      })
    }
  }, [])

  function addFiles(fileList) {
    if (!fileList) return
    const arr = Array.from(fileList)
    const fresh = arr
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => makePendingFromFile(f))
    if (fresh.length === 0) return
    setPendingItems((prev) => [...prev, ...fresh])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }
  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() {
    setDragOver(false)
  }
  function onPickClick() {
    fileInputRef.current?.click()
  }
  function onFileChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function patchPending(id, patch) {
    setPendingItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }

  function setSource(id, next) {
    patchPending(id, {
      source: next,
      ...(next === 'event' ? { album: '' } : { eventId: '' }),
    })
  }

  function removePending(id) {
    setPendingItems((prev) => {
      const removed = prev.find((p) => p.id === id)
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  async function uploadOne(p) {
    const slug = p.source === 'event'
      ? eventOptions.find((e) => String(e.id) === String(p.eventId))?.slug
      : (p.album || '').toLowerCase().replace(/\s+/g, '-')
    const meta = await uploadImage(p.file, 'gallery', slug || undefined)
    if (!meta?.url) throw new Error('upload returned no url')
    const payload = {
      image_url: meta.url,
      caption: p.caption ? p.caption : null,
      taken_at: p.takenAt ? isoDateToUnixSeconds(p.takenAt) : null,
      sort_order: 0,
    }
    if (p.source === 'event') {
      const eid = Number(p.eventId)
      if (!Number.isFinite(eid) || eid <= 0) {
        throw new Error('event_id required when source=event')
      }
      payload.event_id = eid
    } else {
      const album = (p.album || '').trim()
      if (!album) throw new Error('album required when source=album')
      payload.album = album
    }
    return createGalleryItem(payload)
  }

  async function submitOne(p) {
    patchPending(p.id, { status: 'uploading', errorMessage: null })
    try {
      await uploadOne(p)
      // Move to existing list
      setPendingItems((prev) => prev.filter((x) => x.id !== p.id))
      if (p.objectUrl) URL.revokeObjectURL(p.objectUrl)
      await refreshExisting()
    } catch (err) {
      handleAuthError(err)
      patchPending(p.id, {
        status: 'error',
        errorMessage:
          err instanceof ApiError ? `${err.status} ${err.code ?? ''}` : String(err?.message ?? err),
      })
    }
  }

  async function submitAll() {
    if (submitting) return
    setSubmitting(true)
    const eligible = pendingItems.filter((p) => p.status !== 'success')
    await Promise.all(eligible.map((p) => submitOne(p)))
    setSubmitting(false)
  }

  async function confirmDelete(id) {
    try {
      await deleteGalleryItem(id)
      setExistingItems((prev) => prev.filter((it) => it.id !== id))
      setConfirmingDeleteId(null)
    } catch (err) {
      handleAuthError(err)
    }
  }

  const sortedExisting = useMemo(() => {
    return [...existingItems].sort(
      (a, b) =>
        (b.takenAt ?? b.createdAt ?? 0) - (a.takenAt ?? a.createdAt ?? 0),
    )
  }, [existingItems])

  return (
    <section className="gallery-admin" aria-label={t('admin.gallery.tabTitle') || '相册'}>
      <div className="gallery-admin__subtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'published'}
          className={`gallery-admin__subtab${activeTab === 'published' ? ' gallery-admin__subtab--active' : ''}`}
          onClick={() => selectTab('published')}
          data-testid="subtab-published"
        >
          {t('admin.gallery.subtab.published')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          className={`gallery-admin__subtab${activeTab === 'pending' ? ' gallery-admin__subtab--active' : ''}`}
          onClick={() => selectTab('pending')}
          data-testid="subtab-pending"
        >
          {t('admin.gallery.subtab.pending')}
          {pendingCount > 0 ? (
            <span className="gallery-admin__badge" data-testid="subtab-pending-badge">
              {pendingCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="gallery-admin__subtab gallery-admin__subtab--disabled"
          disabled
          data-testid="subtab-trusted"
        >
          {t('admin.gallery.subtab.trusted')}
        </button>
      </div>

      {activeTab === 'pending' ? (
        <PendingQueue
          onAuthExpired={onAuthExpired}
          onForbidden={onForbidden}
          onStatsChanged={refreshStats}
        />
      ) : (
      <>
      <div className="gallery-upload-zone" role="region" aria-label="批量上传">
        <div
          className={`gallery-dropzone${dragOver ? ' gallery-dropzone--drag-over' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <p>
            拖拽照片到此处，或{' '}
            <button
              type="button"
              className="gallery-dropzone__pick"
              onClick={onPickClick}
            >
              点击选择文件
            </button>
          </p>
          <p className="gallery-dropzone__hint">
            支持 JPG / PNG / WEBP，单张最大 20MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={onFileChange}
            data-testid="gallery-file-input"
          />
        </div>
      </div>

      {pendingItems.length > 0 && (
        <div className="gallery-pending">
          <div className="gallery-pending__header">
            <span>{pendingItems.length} 张待上传</span>
            <button
              type="button"
              className="gallery-pending__submit"
              onClick={submitAll}
              disabled={submitting}
            >
              全部提交
            </button>
          </div>
          <ul className="gallery-pending__list">
            {pendingItems.map((p) => (
              <li key={p.id} className="gallery-pending-item">
                <img
                  src={p.objectUrl}
                  alt=""
                  className="gallery-pending-item__preview"
                />
                <div className="gallery-pending-item__form">
                  <div
                    className="gallery-pending-item__source-toggle"
                    role="group"
                  >
                    <label>
                      <input
                        type="radio"
                        name={`source-${p.id}`}
                        value="event"
                        checked={p.source === 'event'}
                        onChange={() => setSource(p.id, 'event')}
                      />
                      关联活动
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`source-${p.id}`}
                        value="album"
                        checked={p.source === 'album'}
                        onChange={() => setSource(p.id, 'album')}
                      />
                      自由相册
                    </label>
                  </div>
                  {p.source === 'event' ? (
                    <select
                      className="admin-field-select"
                      aria-label="选择活动"
                      value={p.eventId}
                      onChange={(e) => patchPending(p.id, { eventId: e.target.value })}
                    >
                      <option value="">-- 选择活动 --</option>
                      {eventOptions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="admin-field-input"
                      placeholder="相册名称"
                      value={p.album}
                      onChange={(e) => patchPending(p.id, { album: e.target.value })}
                    />
                  )}
                  <input
                    type="text"
                    className="admin-field-input"
                    placeholder="图片说明（可选）"
                    value={p.caption}
                    onChange={(e) => patchPending(p.id, { caption: e.target.value })}
                  />
                  <input
                    type="date"
                    className="admin-field-input"
                    aria-label="拍摄日期（可选）"
                    value={p.takenAt}
                    onChange={(e) => patchPending(p.id, { takenAt: e.target.value })}
                  />
                  <div className="gallery-pending-item__actions">
                    <span
                      className={`gallery-pending-item__status gallery-pending-item__status--${p.status}`}
                    >
                      {p.status === 'idle' && ''}
                      {p.status === 'uploading' && '上传中…'}
                      {p.status === 'success' && '已上传'}
                      {p.status === 'error' && (
                        <>
                          上传失败
                          <button
                            type="button"
                            className="gallery-pending-item__retry"
                            onClick={() => submitOne(p)}
                          >
                            重试
                          </button>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      className="gallery-pending-item__remove"
                      aria-label="移除"
                      onClick={() => removePending(p.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="gallery-existing">
        <h3 className="gallery-existing__title">已上传照片</h3>
        {loading && <p>加载中…</p>}
        {loadError && <p className="gallery-existing__error">加载失败：{loadError}</p>}
        {!loading && sortedExisting.length === 0 && !loadError && (
          <p className="gallery-existing__empty">还没有照片</p>
        )}
        <ul className="gallery-existing__grid">
          {sortedExisting.map((it) => (
            <li key={it.id} className="gallery-existing__cell">
              <img
                src={it.imageUrl}
                alt={it.caption || ''}
                className="gallery-existing__img"
                loading="lazy"
              />
              <div className="gallery-existing__meta">
                <span className="gallery-existing__date">
                  {unixSecondsToIsoDate(it.takenAt)}
                </span>
                <span className="gallery-existing__group">
                  {it.eventTitleZh || it.album || ''}
                </span>
              </div>
              {confirmingDeleteId === it.id ? (
                <div className="gallery-existing__confirm">
                  <span>删除这张照片？</span>
                  <button
                    type="button"
                    className="gallery-existing__confirm-yes"
                    onClick={() => confirmDelete(it.id)}
                  >
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="gallery-existing__confirm-no"
                    onClick={() => setConfirmingDeleteId(null)}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="gallery-existing__delete"
                  aria-label="删除照片"
                  onClick={() => setConfirmingDeleteId(it.id)}
                >
                  删除
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      </>
      )}
    </section>
  )
}
