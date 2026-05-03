import { useSyncExternalStore, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDate } from '../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'
import news from '../data/news.json'
import './NewsDetail.css'

const CATEGORY_LABELS = {
  announcement: 'Announcement',
  event: 'Event',
  community: 'Community',
  release: 'Release',
}

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function renderBody(body) {
  if (typeof body !== 'string' || body.trim() === '') return null
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim() !== '')
  return paragraphs.map((p, i) => {
    const lines = p.split(/\n/)
    return (
      <p key={i} className="news-detail__paragraph">
        {lines.map((line, j) => (
          <span key={j}>
            {line}
            {j < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    )
  })
}

export default function NewsDetail() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const { id } = useParams()
  const decodedId = useMemo(() => {
    try {
      return typeof id === 'string' ? decodeURIComponent(id) : ''
    } catch {
      return id ?? ''
    }
  }, [id])

  const item = useMemo(
    () => news.find((n) => n?.id === decodedId) ?? null,
    [decodedId],
  )

  if (!item) {
    return (
      <main className="news-detail">
        <div className="news-detail__inner">
          <Link to="/news" className="news-detail__back">
            ← 返回新闻列表
          </Link>
          <h1 className="news-detail__title">未找到这条新闻</h1>
          <p className="news-detail__missing">
            可能链接已失效，或者这条新闻已被删除。
          </p>
        </div>
      </main>
    )
  }

  const date = formatDate(item.date)
  const rawCategory = item.category ?? item.tag
  const categoryKey = Object.prototype.hasOwnProperty.call(
    CATEGORY_LABELS,
    rawCategory,
  )
    ? rawCategory
    : 'announcement'
  const categoryLabel = CATEGORY_LABELS[categoryKey] ?? 'Announcement'
  const hasImage = typeof item.image === 'string' && item.image.length > 0

  return (
    <main className="news-detail">
      <div className="news-detail__inner">
        <Link to="/news" className="news-detail__back">
          ← 返回新闻列表
        </Link>
        {hasImage ? (
          <figure className="news-detail__hero">
            <img
              src={item.image}
              alt={item.title ?? ''}
              className="news-detail__hero-img"
              loading="eager"
              decoding="async"
            />
          </figure>
        ) : null}
        <div className="news-detail__meta">
          <span
            className={`news-detail__category news-detail__category--${categoryKey}`}
          >
            {categoryLabel}
          </span>
          {date ? (
            <time className="news-detail__date" dateTime={item.date}>
              {date}
            </time>
          ) : null}
        </div>
        <h1 className="news-detail__title">{item.title ?? ''}</h1>
        <div className="news-detail__body">{renderBody(item.body)}</div>
      </div>
    </main>
  )
}
