import { useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import NewsCard from '../components/NewsCard/NewsCard.jsx'
import { fetchNews } from '../lib/api.js'
import { adaptNewsList } from '../lib/apiAdapter.js'
import './News.css'

export default function News() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetchNews()
      .then((res) => {
        if (cancelled) return
        setItems(adaptNewsList(res))
        setTotal(typeof res?.total === 'number' ? res.total : 0)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setReloadKey((k) => k + 1)
  }

  if (status === 'loading') {
    return <LoadingState className="news-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="news-error" onRetry={retry} />
  }

  return (
    <>
      <section className="bf-page-hd">
        <div className="bf-container">
          <div>
            <span className="ph-tag">// 新闻流</span>
            <h1>新闻</h1>
          </div>
          <span className="ph-meta">{total} 条 · 北美邦现地报告 + 公告</span>
        </div>
      </section>
      <main className="bf-page-body">
        <div className="bf-container">
          <div className="bf-news-list">
            {items.map((item) => (
              <NewsCard key={item.id ?? item.slug} news={item} />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
