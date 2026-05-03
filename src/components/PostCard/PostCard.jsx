import { useState } from 'react'
import { t } from '../../lib/uiLanguage.js'
import './PostCard.css'

function isHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim())
}

function firstChar(s) {
  if (typeof s !== 'string') return ''
  const trimmed = s.trim()
  if (trimmed.length === 0) return ''
  return Array.from(trimmed)[0] || ''
}

function letterFor(post) {
  const fromTitle = firstChar(post?.title)
  if (fromTitle.length > 0) return fromTitle
  const fromId = firstChar(post?.id)
  if (fromId.length > 0) return fromId
  return '?'
}

function PostCardLetterFallback({ post }) {
  return (
    <div
      className="post-card__letter"
      role="img"
      aria-label={typeof post?.title === 'string' && post.title.length > 0 ? post.title : ''}
    >
      <span className="post-card__letter-char">{letterFor(post)}</span>
    </div>
  )
}

export default function PostCard({ post, position = 1, variant = 'center' }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (!post || typeof post !== 'object') return null

  const hasImage =
    typeof post.image === 'string' && post.image.trim().length > 0 && !imageFailed
  const hasTitle =
    typeof post.title === 'string' && post.title.trim().length > 0
  const hasUrl = isHttpsUrl(post.url)
  const isSide = variant === 'side'

  const article = (
    <article
      className={
        'post-card card-thumb-16-9 post-card--' + (isSide ? 'side' : 'center')
      }
      data-post-id={post.id}
      aria-hidden={isSide ? 'true' : undefined}
    >
      {hasImage ? (
        <img
          src={post.image}
          alt={hasTitle ? post.title : ''}
          loading="lazy"
          decoding="async"
          className="post-card__img"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <PostCardLetterFallback post={post} />
      )}
      {hasTitle ? (
        <div className="post-card__overlay">
          <h3 className="post-card__title">{post.title}</h3>
        </div>
      ) : null}
    </article>
  )

  if (hasUrl && !isSide) {
    const ariaLabel = hasTitle
      ? post.title
      : t('btn.openPost', { n: position })
    return (
      <a
        className="post-card-link"
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
      >
        {article}
      </a>
    )
  }

  return article
}
