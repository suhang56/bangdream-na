import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import Comments from '../components/Comments/Comments.jsx'
import { fetchNewsBySlug } from '../lib/api.js'
import { adaptNewsRow } from '../lib/apiAdapter.js'
import { formatDate } from '../lib/dateFormat.js'
import './NewsDetail.css'

const CATEGORY_LABELS = {
  announcement: 'Announcement',
  event: 'Event',
  community: 'Community',
  release: 'Release',
}

function renderBody(body) {
  if (typeof body !== 'string' || body.trim() === '') return null
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim() !== '')
  return paragraphs.map((p, i) => {
    const lines = p.split(/\n/)
    return (
      <p key={i} className="nd-paragraph">
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
  const { id } = useParams()
  const decodedId = useMemo(() => {
    try {
      return typeof id === 'string' ? decodeURIComponent(id) : ''
    } catch {
      return id ?? ''
    }
  }, [id])

  const [item, setItem] = useState(null)
  const [rawId, setRawId] = useState(null)
  // Status derived from (decodedId, fetchOutcome). No decodedId => 'notfound'
  // immediately; otherwise null => 'loading', else echoes fetchOutcome
  // ('ready' | 'notfound' | 'error').
  const [fetchOutcome, setFetchOutcome] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const status = !decodedId
    ? 'notfound'
    : fetchOutcome === null
      ? 'loading'
      : fetchOutcome

  useEffect(() => {
    let cancelled = false
    if (!decodedId) return undefined
    fetchNewsBySlug(decodedId)
      .then((row) => {
        if (cancelled) return
        if (row === null) {
          setItem(null)
          setRawId(null)
          setFetchOutcome('notfound')
          return
        }
        setItem(adaptNewsRow(row))
        setRawId(typeof row.id === 'number' ? row.id : null)
        setFetchOutcome('ready')
      })
      .catch(() => {
        if (cancelled) return
        setFetchOutcome('error')
      })
    return () => {
      cancelled = true
    }
  }, [decodedId, reloadKey])

  function retry() {
    setFetchOutcome(null)
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') {
    return <LoadingState className="loading-state" />
  }
  if (status === 'error') {
    return <ErrorState className="news-detail-error" onRetry={retry} />
  }

  if (status === 'notfound' || !item) {
    return (
      <section className="bf-page-hd">
        <div className="bf-container">
          <Link to="/news" className="nd-back">← 返回新闻列表</Link>
          <h1>未找到这条新闻</h1>
          <p className="nd-missing">可能链接已失效，或者这条新闻已被删除。</p>
        </div>
      </section>
    )
  }

  const date = formatDate(item.date)
  const rawCategory = item.category ?? item.tag
  const categoryKey = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, rawCategory)
    ? rawCategory
    : 'announcement'
  const categoryLabel = CATEGORY_LABELS[categoryKey] ?? 'Announcement'
  const hasImage = typeof item.image === 'string' && item.image.length > 0

  return (
    <>
      <section className="bf-page-hd bf-page-hd--detail">
        <div className="bf-container">
          <Link to="/news" className="nd-back">← 返回新闻列表</Link>
          <div>
            <span className="ph-tag">{categoryLabel}</span>
            <h1>{item.title ?? ''}</h1>
          </div>
          {date ? (
            <span className="ph-meta">
              <time dateTime={item.date}>{date}</time>
            </span>
          ) : null}
        </div>
      </section>
      <main className="bf-page-body">
        <div className="bf-container bf-container--narrow">
          {hasImage ? (
            <img
              src={item.image}
              alt={item.title ?? ''}
              className="nd-hero-img"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <div className="bf-news-detail-body">
            {renderBody(item.body)}
          </div>
          {typeof rawId === 'number' ? (
            <Comments targetKind="news" targetId={rawId} />
          ) : null}
        </div>
      </main>
    </>
  )
}
