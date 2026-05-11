import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './PendingRow.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function relativeTime(submittedAt) {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - submittedAt
  if (diff < 60) return `${diff} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export default function PendingRow({
  item,
  onApprove,
  onReject,
  approving,
  rejecting,
  error,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return (
    <li className="pending-row" data-testid={`pending-row-${item.id}`}>
      <div className="pending-row__thumb-wrap">
        <img
          src={item.thumbnail_url}
          alt=""
          loading="lazy"
          className="pending-row__thumb"
        />
      </div>
      <div className="pending-row__meta">
        <div className="pending-row__nickname">{item.nickname}</div>
        {item.caption ? (
          <div className="pending-row__caption">{item.caption}</div>
        ) : null}
        <div className="pending-row__meta-line">
          <span className="pending-row__event">
            {item.event?.slug ?? t('admin.gallery.review.eventDash')}
          </span>
          <span className="pending-row__sep">·</span>
          <span className="pending-row__time">{relativeTime(item.submitted_at)}</span>
        </div>
        {error ? (
          <div className="pending-row__error" role="alert">⚠ {error}</div>
        ) : null}
      </div>
      <div className="pending-row__actions">
        <button
          type="button"
          className="pending-row__btn pending-row__btn--approve"
          onClick={() => onApprove(item)}
          disabled={approving || rejecting}
          data-testid={`pending-approve-${item.id}`}
        >
          {approving
            ? t('admin.gallery.review.approving')
            : t('admin.gallery.review.approve')}
        </button>
        <button
          type="button"
          className="pending-row__btn pending-row__btn--reject"
          onClick={() => onReject(item)}
          disabled={approving || rejecting}
          data-testid={`pending-reject-${item.id}`}
        >
          {rejecting
            ? t('admin.gallery.review.rejecting')
            : t('admin.gallery.review.reject')}
        </button>
      </div>
    </li>
  )
}
