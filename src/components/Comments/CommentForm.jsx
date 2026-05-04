import { useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import { ApiError, loginUrl, postComment } from '../../lib/api.js'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

const MAX_BODY = 4000

/**
 * Comment composer.
 *
 * Props:
 *   targetKind: 'news' | 'event'
 *   targetId: number
 *   parentId?: number | null   — when present, this is a reply form
 *   currentUser?: { id, role } | null
 *   onPosted: (newComment) => void  — caller updates list state
 *   onCancel?: () => void  — only meaningful for inline reply forms
 *   isReply?: boolean       — affects placeholder + cancel button
 */
export default function CommentForm({
  targetKind,
  targetId,
  parentId = null,
  currentUser = null,
  onPosted,
  onCancel,
  isReply = false,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!currentUser) {
    return (
      <div className="comment-form comment-form--anon">
        <p className="comment-form__login-prompt">
          {t('comments.loginToComment')}
        </p>
        <a className="comment-form__login-btn" href={loginUrl()}>
          {t('comments.signIn')}
        </a>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    const trimmed = body.trim()
    if (trimmed.length === 0) {
      setError(t('comments.empty.field'))
      return
    }
    if (trimmed.length > MAX_BODY) {
      setError(t('comments.tooLong'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await postComment({
        targetKind,
        targetId,
        body: trimmed,
        parentId: parentId ?? undefined,
      })
      setBody('')
      onPosted?.(created)
      // For reply forms, auto-close after success
      if (isReply) onCancel?.()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429 || err.code === 'rate_limited') {
          setError(t('comments.rateLimited'))
        } else if (err.status === 400) {
          setError(t('comments.tooLong'))
        } else if (err.status === 401) {
          setError(t('comments.loginToComment'))
        } else {
          setError(t('comments.error'))
        }
      } else {
        setError(t('comments.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className={`comment-form ${isReply ? 'comment-form--reply' : ''}`}
      onSubmit={handleSubmit}
    >
      <textarea
        className="comment-form__textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          isReply
            ? t('comments.replyPlaceholder')
            : t('comments.placeholder')
        }
        rows={isReply ? 2 : 4}
        maxLength={MAX_BODY}
        disabled={submitting}
        aria-label={t('comments.placeholder')}
      />
      {error ? (
        <p className="comment-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="comment-form__actions">
        <button
          type="submit"
          className="comment-form__submit"
          disabled={submitting || body.trim().length === 0}
        >
          {submitting ? t('comments.submitting') : t('comments.submit')}
        </button>
        {isReply && onCancel ? (
          <button
            type="button"
            className="comment-form__cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('comments.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  )
}
