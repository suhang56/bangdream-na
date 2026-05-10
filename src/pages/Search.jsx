import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchNews, fetchEvents, fetchMembers } from '../lib/api.js'
import {
  adaptNewsList,
  adaptEventList,
  adaptMemberList,
} from '../lib/apiAdapter.js'
import './Search.css'

// Per-section cap. Search runs as a client-side filter over the small public
// list endpoints (news/events/members); a future PR can move the filter into
// the worker at /api/search?q= for full-corpus coverage.
const SECTION_LIMIT = 8

function lower(v) {
  return typeof v === 'string' ? v.toLowerCase() : ''
}

function matchesNews(item, q) {
  const ql = q.toLowerCase()
  return (
    lower(item.title).includes(ql) ||
    lower(item.body).includes(ql) ||
    lower(item.summary).includes(ql) ||
    lower(item.tag).includes(ql)
  )
}

function matchesEvent(item, q) {
  const ql = q.toLowerCase()
  return (
    lower(item.title).includes(ql) ||
    lower(item.description).includes(ql) ||
    lower(item.location).includes(ql)
  )
}

function matchesMember(item, q) {
  const ql = q.toLowerCase()
  return (
    lower(item.name).includes(ql) ||
    lower(item.city).includes(ql) ||
    lower(item.oshiBand).includes(ql) ||
    lower(item.oshiCharacter).includes(ql)
  )
}

function NewsResult({ item }) {
  return (
    <Link
      to={`/news/${encodeURIComponent(item.id)}`}
      className="bf-search-result"
    >
      <span className="rs-kind">新闻</span>
      <span className="rs-title">{item.title || '—'}</span>
      {item.summary ? <span className="rs-meta">{item.summary}</span> : null}
    </Link>
  )
}

function EventResult({ item }) {
  return (
    <Link
      to={`/events/${encodeURIComponent(item.id)}`}
      className="bf-search-result"
    >
      <span className="rs-kind">活动</span>
      <span className="rs-title">{item.title || '—'}</span>
      {item.location ? <span className="rs-meta">{item.location}</span> : null}
    </Link>
  )
}

function MemberResult({ item }) {
  return (
    <Link to="/members" className="bf-search-result">
      <span className="rs-kind">成员</span>
      <span className="rs-title">{item.name || '—'}</span>
      {item.city || item.oshiBand ? (
        <span className="rs-meta">
          {[item.city, item.oshiBand].filter(Boolean).join(' · ')}
        </span>
      ) : null}
    </Link>
  )
}

export default function Search() {
  const [params] = useSearchParams()
  const rawQ = params.get('q') ?? ''
  const q = rawQ.trim()
  const hasQuery = q.length > 0

  const [news, setNews] = useState([])
  const [events, setEvents] = useState([])
  const [members, setMembers] = useState([])
  // Status is derived from (hasQuery, fetchOutcome). 'idle' when no query;
  // 'loading' until all 3 fetches settle; 'error' if every fetch rejected;
  // 'ready' otherwise. Initialized synchronously so we don't need a
  // setState-in-effect just to mark loading.
  const [fetchOutcome, setFetchOutcome] = useState(null) // null | 'ready' | 'error'
  const [reloadKey, setReloadKey] = useState(0)
  const status = !hasQuery
    ? 'idle'
    : fetchOutcome === null
      ? 'loading'
      : fetchOutcome

  useEffect(() => {
    if (!hasQuery) {
      return undefined
    }
    let cancelled = false
    const newsP = fetchNews().catch(() => null)
    const eventsP = fetchEvents().catch(() => null)
    const membersP = fetchMembers().catch(() => null)

    Promise.all([newsP, eventsP, membersP]).then(([nRes, eRes, mRes]) => {
      if (cancelled) return
      const allFailed = nRes === null && eRes === null && mRes === null
      if (allFailed) {
        setFetchOutcome('error')
        return
      }
      setNews(nRes !== null ? adaptNewsList(nRes) : [])
      setEvents(eRes !== null ? adaptEventList(eRes) : [])
      setMembers(mRes !== null ? adaptMemberList(mRes) : [])
      setFetchOutcome('ready')
    })

    return () => {
      cancelled = true
    }
  }, [q, hasQuery, reloadKey])

  function retry() {
    setFetchOutcome(null)
    setReloadKey((k) => k + 1)
  }

  const filteredNews = useMemo(
    () =>
      hasQuery
        ? news.filter((n) => matchesNews(n, q)).slice(0, SECTION_LIMIT)
        : [],
    [news, q, hasQuery],
  )
  const filteredEvents = useMemo(
    () =>
      hasQuery
        ? events.filter((e) => matchesEvent(e, q)).slice(0, SECTION_LIMIT)
        : [],
    [events, q, hasQuery],
  )
  const filteredMembers = useMemo(
    () =>
      hasQuery
        ? members.filter((m) => matchesMember(m, q)).slice(0, SECTION_LIMIT)
        : [],
    [members, q, hasQuery],
  )

  const totalHits =
    filteredNews.length + filteredEvents.length + filteredMembers.length

  return (
    <>
      <section className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// 搜索</span>
            <h1>搜索</h1>
          </div>
          {hasQuery ? (
            <span className="ph-meta">
              查询「{q}」· 共 {totalHits} 条结果
            </span>
          ) : (
            <span className="ph-meta">输入关键词后回车开始搜索</span>
          )}
        </div>
      </section>
      <main className="bf-page-body">
        <div className="bf-container">
          {!hasQuery ? (
            <div className="bf-search-empty">
              <p>输入关键词开始搜索 — 新闻 / 活动 / 成员</p>
              <p className="bf-search-empty-hint">
                Cmd+K (macOS) / Ctrl+K (Windows) 可以直接聚焦顶部搜索框。
              </p>
            </div>
          ) : status === 'loading' ? (
            <LoadingState className="search-loading" />
          ) : status === 'error' ? (
            <ErrorState className="search-error" onRetry={retry} />
          ) : totalHits === 0 ? (
            <div className="bf-search-noresult">
              <p>没有找到匹配「{q}」的内容。</p>
              <p className="bf-search-empty-hint">
                可以试试更短的关键词，或者去 <Link to="/news">新闻</Link>、
                <Link to="/events">活动</Link>、
                <Link to="/members">成员</Link> 里浏览。
              </p>
            </div>
          ) : (
            <div className="bf-search-results">
              <section className="bf-search-section" data-kind="news">
                <h2>新闻 · {filteredNews.length}</h2>
                {filteredNews.length === 0 ? (
                  <p className="bf-search-empty-hint">无匹配新闻。</p>
                ) : (
                  <div className="bf-search-list">
                    {filteredNews.map((item) => (
                      <NewsResult key={`news-${item.id}`} item={item} />
                    ))}
                  </div>
                )}
              </section>
              <section className="bf-search-section" data-kind="events">
                <h2>活动 · {filteredEvents.length}</h2>
                {filteredEvents.length === 0 ? (
                  <p className="bf-search-empty-hint">无匹配活动。</p>
                ) : (
                  <div className="bf-search-list">
                    {filteredEvents.map((item) => (
                      <EventResult key={`event-${item.id}`} item={item} />
                    ))}
                  </div>
                )}
              </section>
              <section className="bf-search-section" data-kind="members">
                <h2>成员 · {filteredMembers.length}</h2>
                {filteredMembers.length === 0 ? (
                  <p className="bf-search-empty-hint">无匹配成员。</p>
                ) : (
                  <div className="bf-search-list">
                    {filteredMembers.map((item) => (
                      <MemberResult key={`member-${item.id}`} item={item} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
