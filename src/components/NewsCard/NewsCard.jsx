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
  return firstPara.length > 220 ? firstPara.slice(0, 217) + '…' : firstPara
}

export default function NewsCard({ news }) {
  const date = formatDate(news?.date)
  const hasImage =
    typeof news?.image === 'string' && news.image.length > 0
  const categoryKey = Object.prototype.hasOwnProperty.call(
    CATEGORY_LABELS,
    news?.category,
  )
    ? news.category
    : 'announcement'
  const categoryLabel = CATEGORY_LABELS[categoryKey] ?? 'Announcement'
  const ariaLabel = date
    ? `${news?.title ?? ''}, ${date}`
    : news?.title ?? ''

  return (
    <article className="news-card" aria-label={ariaLabel}>
      <div
        className="news-card__thumb card-thumb-16-9"
        aria-hidden="true"
        style={hasImage ? { backgroundImage: `url(${news.image})` } : undefined}
      />
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
}
