import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  ApiError,
  approveSubmission,
  listPendingSubmissions,
  rejectSubmission,
} from '../../lib/api.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import PendingRow from './PendingRow.jsx'
import RejectModal from './RejectModal.jsx'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function PendingQueue({ onAuthExpired, onForbidden, onStatsChanged }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionState, setActionState] = useState({}) // { [id]: 'approving' | 'rejecting' | 'error' }
  const [rowErrors, setRowErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const toastTimerRef = useRef(null)

  const handleAuthError = useCallback(
    (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) onAuthExpired?.()
        else if (err.status === 403) onForbidden?.()
      }
    },
    [onAuthExpired, onForbidden],
  )

  const refresh = useCallback(async () => {
    try {
      const res = await listPendingSubmissions({ status: 'pending', limit: 50 })
      setItems(Array.isArray(res?.items) ? res.items : [])
      setLoadError(null)
    } catch (err) {
      handleAuthError(err)
      setLoadError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }, [handleAuthError])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message) {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }

  async function handleApprove(item) {
    setActionState((s) => ({ ...s, [item.id]: 'approving' }))
    setRowErrors((s) => ({ ...s, [item.id]: null }))
    try {
      await approveSubmission(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      showToast(t('admin.gallery.review.toastApproved'))
      onStatsChanged?.()
    } catch (err) {
      handleAuthError(err)
      setRowErrors((s) => ({
        ...s,
        [item.id]:
          err instanceof ApiError ? `${err.status} ${err.code ?? ''}` : String(err?.message ?? err),
      }))
    } finally {
      setActionState((s) => {
        const next = { ...s }
        delete next[item.id]
        return next
      })
    }
  }

  function openReject(item) {
    setRejectTarget(item)
  }

  async function confirmReject(reason) {
    const target = rejectTarget
    if (!target) return
    setActionState((s) => ({ ...s, [target.id]: 'rejecting' }))
    setRowErrors((s) => ({ ...s, [target.id]: null }))
    try {
      await rejectSubmission(target.id, reason)
      setItems((prev) => prev.filter((i) => i.id !== target.id))
      showToast(t('admin.gallery.review.toastRejected'))
      setRejectTarget(null)
      onStatsChanged?.()
    } catch (err) {
      handleAuthError(err)
      setRowErrors((s) => ({
        ...s,
        [target.id]:
          err instanceof ApiError ? `${err.status} ${err.code ?? ''}` : String(err?.message ?? err),
      }))
    } finally {
      setActionState((s) => {
        const next = { ...s }
        delete next[target.id]
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="gallery-pending-queue gallery-pending-queue--loading" data-testid="pending-queue">
        <p>{t('admin.gallery.review.loading')}</p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="gallery-pending-queue gallery-pending-queue--error" data-testid="pending-queue">
        <p className="gallery-existing__error">
          {t('admin.gallery.review.error', { message: loadError })}
        </p>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="gallery-pending-queue gallery-pending-queue--empty" data-testid="pending-queue">
        <p className="bf-helper">{t('admin.gallery.review.empty')}</p>
        <p className="gallery-existing__empty">{t('admin.gallery.review.emptyHint')}</p>
      </div>
    )
  }
  return (
    <div className="gallery-pending-queue" data-testid="pending-queue">
      {toast ? (
        <div className="gallery-pending-queue__toast" role="status">{toast}</div>
      ) : null}
      <ul className="gallery-pending-queue__list">
        {items.map((item) => (
          <PendingRow
            key={item.id}
            item={item}
            onApprove={handleApprove}
            onReject={openReject}
            approving={actionState[item.id] === 'approving'}
            rejecting={actionState[item.id] === 'rejecting'}
            error={rowErrors[item.id]}
          />
        ))}
      </ul>
      <RejectModal
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        submitting={rejectTarget && actionState[rejectTarget.id] === 'rejecting'}
      />
    </div>
  )
}
