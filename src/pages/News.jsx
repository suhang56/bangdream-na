import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import NewsMobile from './News.mobile.jsx'
import NewsDesktop from './News.desktop.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchNews } from '../lib/api.js'
import { adaptNewsList } from '../lib/apiAdapter.js'
import { filterNews, sortNewsByDate } from '../lib/news.js'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'
import './News.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

const EMPTY_FILTER_STATE = Object.freeze({
  categories: null,
  from: '',
  to: '',
  keyword: '',
})

function makeEmptyState() {
  return { categories: new Set(), from: '', to: '', keyword: '' }
}

export default function News() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [filterState, setFilterState] = useState(makeEmptyState)
  const [news, setNews] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchNews()
      .then((res) => {
        if (cancelled) return
        setNews(adaptNewsList(res))
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
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

  const visible = useMemo(
    () => sortNewsByDate(filterNews(news, filterState)),
    [filterState, news],
  )

  if (status === 'loading') {
    return <LoadingState className="news-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="news-error" onRetry={retry} />
  }

  const totalCount = news.length
  const layoutProps = {
    news,
    visible,
    filterState,
    onChange: setFilterState,
    onClear: () => setFilterState(makeEmptyState()),
    totalCount,
  }

  return (
    <>
      <Mobile>
        <NewsMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <NewsDesktop {...layoutProps} />
      </Desktop>
    </>
  )
}

export { EMPTY_FILTER_STATE }
