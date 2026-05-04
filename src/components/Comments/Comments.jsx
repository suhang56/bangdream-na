import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import LoadingState from '../LoadingState/LoadingState.jsx'
import ErrorState from '../ErrorState/ErrorState.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import {
  ApiError,
  deleteComment,
  fetchComments,
  fetchMe,
} from '../../lib/api.js'
import CommentForm from './CommentForm.jsx'
import CommentList from './CommentList.jsx'
import './Comments.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Top-level comments widget. Fetches the thread + current user on mount,
 * owns the items state, and wires the form / list / reply / delete actions.
 *
 * Props:
 *   targetKind: 'news' | 'event'
 *   targetId: number (the D1 row id)
 */
export default function Comments({ targetKind, targetId }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const validTarget =
    typeof targetId === 'number' && Number.isFinite(targetId) && targetId > 0
  const [status, setStatus] = useState(validTarget ? 'loading' : 'ready')
  const [items, setItems] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!validTarget) return undefined
    let cancelled = false
    Promise.all([
      fetchComments({ targetKind, targetId }).catch(() => null),
      fetchMe().catch(() => null),
    ])
      .then(([list, me]) => {
        if (cancelled) return
        if (!list) {
          setStatus('error')
          return
        }
        setItems(Array.isArray(list.items) ? list.items : [])
        setCurrentUser(me?.user ?? null)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [targetKind, targetId, reloadKey, validTarget])

  const retry = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  const handlePosted = useCallback(
    (created) => {
      if (!created || typeof created.id !== 'number') return
      // Build the row shape the list expects (server returns nested .user but no .replies array yet).
      const normalized = {
        ...created,
        replies: [],
      }
      if (created.parent_id) {
        setItems((prev) =>
          prev.map((row) =>
            row.id === created.parent_id
              ? { ...row, replies: [...(row.replies ?? []), normalized] }
              : row,
          ),
        )
      } else {
        setItems((prev) => [...prev, normalized])
      }
      setActiveReplyId(null)
    },
    [],
  )

  const handleReply = useCallback((parentId) => {
    setActiveReplyId((cur) => (cur === parentId ? null : parentId))
  }, [])

  const handleCancelReply = useCallback(() => {
    setActiveReplyId(null)
  }, [])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteComment(id)
    } catch (err) {
      if (err instanceof ApiError) throw err
      throw err
    }
    setItems((prev) => softDelete(prev, id))
  }, [])

  const renderReplyForm = useCallback(
    (parentId) => (
      <div className="comments__reply-form">
        <CommentForm
          targetKind={targetKind}
          targetId={targetId}
          parentId={parentId}
          currentUser={currentUser}
          onPosted={handlePosted}
          onCancel={handleCancelReply}
          isReply
        />
      </div>
    ),
    [
      targetKind,
      targetId,
      currentUser,
      handlePosted,
      handleCancelReply,
    ],
  )

  return (
    <section className="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="comments__title">
        {t('comments.title')}
      </h2>
      {status === 'loading' ? (
        <LoadingState className="comments__loading" />
      ) : null}
      {status === 'error' ? (
        <ErrorState
          className="comments__error"
          onRetry={retry}
          message={t('comments.loadFailed')}
        />
      ) : null}
      {status === 'ready' ? (
        <>
          <CommentList
            items={items}
            currentUser={currentUser}
            onReply={handleReply}
            onDelete={handleDelete}
            activeReplyId={activeReplyId}
            renderReplyForm={renderReplyForm}
          />
          <CommentForm
            targetKind={targetKind}
            targetId={targetId}
            currentUser={currentUser}
            onPosted={handlePosted}
          />
        </>
      ) : null}
    </section>
  )
}

function softDelete(list, id) {
  return list.map((row) => {
    if (row.id === id) {
      return {
        ...row,
        deleted: 1,
        body: t('comments.deleted'),
        user: null,
      }
    }
    if (Array.isArray(row.replies) && row.replies.length > 0) {
      return {
        ...row,
        replies: row.replies.map((reply) =>
          reply.id === id
            ? { ...reply, deleted: 1, body: t('comments.deleted'), user: null }
            : reply,
        ),
      }
    }
    return row
  })
}
