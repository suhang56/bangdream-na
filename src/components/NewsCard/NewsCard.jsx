import { Link } from 'react-router-dom'
import { formatDate } from '../../lib/dateFormat.js'
import './NewsCard.css'

const CATEGORY_LABELS = {
  announcement: 'Announcement',
  event: 'Event',
  community: 'Community',
  release: 'Release',
}

function excerpt(body) {
  if (typeof body !== 'string') return ''
  const trimmed = body.trim()
  const firstPara = trimmed.split(/\n\n/)[0] || ''
  const oneLine = firstPara.replace(/\n+/g, ' ')
  return oneLine.length > 90 ? oneLine.slice(0, 87) + '…' : oneLine
}

export default function NewsCard({ news, variant = 'default' }) {
  const isCompact = variant === 'compact'
  const date = formatDate(news?.date)
  const hasImage =
    typeof news?.image === 'string' && news.image.length > 0
  const rawCategory = news?.category ?? news?.tag
  const categoryKey = Object.prototype.hasOwnProperty.call(
    CATEGORY_LABELS,
    rawCategory,
  )
    ? rawCategory
    : 'announcement'
  const categoryLabel = CATEGORY_LABELS[categoryKey] ?? 'Announcement'
  const ariaLabel = date
    ? `${news?.title ?? ''}, ${date}`
    : news?.title ?? ''

  const id = typeof news?.id === 'string' ? news.id : ''
  const linkable = id.length > 0

  const cardInner = (
    <article className={`news-card${isCompact ? ' news-card--compact' : ''}`} aria-label={ariaLabel}>
      <div
        className="news-card__thumb card-thumb-16-9"
        aria-hidden="true"
        style={hasImage ? { backgroundImage: `url(${news.image})` } : undefined}
      >
        {!hasImage && isCompact ? (
          <span className="news-card__placeholder-glyph" aria-hidden="true">◈</span>
        ) : null}
      </div>
      <div className="news-card__body">
        <div className="news-card__meta">
          <span
            className={`news-card__category news-card__category--${categoryKey}`}
            data-category={categoryKey}
          >
            {categoryLabel}
          </span>
          {date ? (
            <time className="news-card__date" dateTime={news.date}>
              {date}
            </time>
          ) : null}
        </div>
        <h3 className="news-card__title">{news?.title ?? ''}</h3>
        {news?.body ? (
          <p className="news-card__excerpt">{excerpt(news.body)}</p>
        ) : null}
      </div>
    </article>
  )

  if (linkable) {
    return (
      <Link to={`/news/${encodeURIComponent(id)}`} className="news-card-link">
        {cardInner}
      </Link>
    )
  }
  return cardInner
}
