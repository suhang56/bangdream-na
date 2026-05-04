import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import HomeMobile from './Home.mobile.jsx'
import HomeDesktop from './Home.desktop.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchNews, fetchEvents } from '../lib/api.js'
import { adaptNewsList, adaptEventList } from '../lib/apiAdapter.js'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'
import { pickFeaturedPosts } from '../lib/posts.js'
import { sortNewsByDate } from '../lib/news.js'
import { groupEventsByTime, sortEventsByDate } from '../lib/events.js'
import site from '../data/site.json'
import posts from '../data/posts.json'
import social from '../data/social.json'

const HOME_NEWS_LIMIT = 3
const HOME_SCHEDULE_LIMIT = 3
const FEATURED_POST_LIMIT = 6

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function Home() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const now = useMemo(() => new Date(), [])
  const [news, setNews] = useState([])
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchNews({ limit: HOME_NEWS_LIMIT }),
      fetchEvents({ scope: 'upcoming', limit: HOME_SCHEDULE_LIMIT }),
    ])
      .then(([newsRes, eventsRes]) => {
        if (cancelled) return
        setNews(adaptNewsList(newsRes))
        setEvents(adaptEventList(eventsRes))
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

  const featured = useMemo(
    () => pickFeaturedPosts(posts, FEATURED_POST_LIMIT, now),
    [now],
  )
  const hasPosts = featured.length > 0
  const latestNews = useMemo(
    () => sortNewsByDate(news, 'desc').slice(0, HOME_NEWS_LIMIT),
    [news],
  )
  const upcomingEvents = useMemo(() => {
    const { upcoming } = groupEventsByTime(events, now)
    return sortEventsByDate(upcoming, 'asc').slice(0, HOME_SCHEDULE_LIMIT)
  }, [events, now])

  if (status === 'loading') {
    return <LoadingState className="home-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="home-error" onRetry={retry} />
  }

  const layoutProps = {
    site,
    social,
    featured,
    hasPosts,
    latestNews,
    upcomingEvents,
  }

  return (
    <>
      <Mobile>
        <HomeMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <HomeDesktop {...layoutProps} />
      </Desktop>
    </>
  )
}
