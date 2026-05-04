import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import CommentItem from './CommentItem.jsx'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Renders the threaded list. Pure presentation — fetch + state lives in the
 * parent <Comments/> wrapper.
 *
 * Props:
 *   items: CommentOut[] (parent rows; each has nested .replies[])
 *   currentUser
 *   onReply, onDelete  (forwarded to CommentItem)
 *   activeReplyId?: number | null    — id of comment that has an open reply form
 *   renderReplyForm?: (parentId) => ReactNode
 */
export default function CommentList({
  items,
  currentUser,
  onReply,
  onDelete,
  activeReplyId = null,
  renderReplyForm,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="comment-list__empty" role="status">
        {t('comments.empty')}
      </p>
    )
  }

  return (
    <ul className="comment-list" data-testid="comment-list">
      {items.map((item) => (
        <li key={item.id} className="comment-list__entry">
          <CommentItem
            comment={item}
            currentUser={currentUser}
            onReply={onReply}
            onDelete={onDelete}
          />
          {activeReplyId === item.id && renderReplyForm
            ? renderReplyForm(item.id)
            : null}
          {Array.isArray(item.replies) && item.replies.length > 0 ? (
            <ul className="comment-list comment-list--replies">
              {item.replies.map((reply) => (
                <li key={reply.id} className="comment-list__entry">
                  <CommentItem
                    comment={reply}
                    isReply
                    currentUser={currentUser}
                    onDelete={onDelete}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
