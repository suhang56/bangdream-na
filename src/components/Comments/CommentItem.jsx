import { useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import { formatDate } from '../../lib/dateFormat.js'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Single comment row. Renders avatar + display name + body + actions.
 * Reply / delete buttons appear when allowed (logged-in for reply,
 * author OR admin for delete). Soft-deleted comments render the
 * placeholder body and hide actions.
 *
 * Props:
 *   comment: { id, parent_id, body, deleted, created_at, user }
 *   isReply?: boolean  — visual indent
 *   currentUser?: { id, role } | null
 *   onReply?: (parentId) => void
 *   onDelete?: (id) => Promise<void>  — caller handles state mutation
 */
export default function CommentItem({
  comment,
  isReply = false,
  currentUser = null,
  onReply,
  onDelete,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const isDeleted = comment?.deleted === 1
  const author = comment?.user
  const displayName = author?.display_name || author?.github_login || ''
  const avatar = author?.avatar_url || null

  const canReply = !isDeleted && !!currentUser && !isReply
  const canDelete =
    !isDeleted &&
    !!currentUser &&
    (currentUser.id === author?.id || currentUser.role === 'admin')

  async function handleDelete() {
    if (!onDelete || deleting) return
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm(t('comments.confirmDelete'))
      if (!ok) return
    }
    setDeleting(true)
    setError(null)
    try {
      await onDelete(comment.id)
    } catch {
      setError(t('comments.error'))
    } finally {
      setDeleting(false)
    }
  }

  const dateStr = formatDate(
    typeof comment?.created_at === 'number'
      ? new Date(comment.created_at * 1000).toISOString()
      : comment?.created_at,
  )

  return (
    <article
      className={`comment-item ${isReply ? 'comment-item--reply' : ''}`}
      data-testid={`comment-item-${comment?.id ?? 'unknown'}`}
    >
      <div className="comment-item__avatar" aria-hidden="true">
        {avatar ? (
          <img src={avatar} alt="" loading="lazy" />
        ) : (
          <span className="comment-item__avatar-fallback">
            {(displayName.slice(0, 1) || '·').toUpperCase()}
          </span>
        )}
      </div>
      <div className="comment-item__main">
        <header className="comment-item__header">
          <span className="comment-item__author">
            {isDeleted ? '—' : displayName || '—'}
          </span>
          {dateStr ? (
            <time className="comment-item__time">{dateStr}</time>
          ) : null}
        </header>
        <div
          className={`comment-item__body ${isDeleted ? 'comment-item__body--deleted' : ''}`}
        >
          {comment?.body ?? ''}
        </div>
        {!isDeleted ? (
          <div className="comment-item__actions">
            {canReply ? (
              <button
                type="button"
                className="comment-item__action"
                onClick={() => onReply?.(comment.id)}
              >
                {t('comments.reply')}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className="comment-item__action comment-item__action--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t('comments.deleting') : t('comments.delete')}
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="comment-item__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  )
}
