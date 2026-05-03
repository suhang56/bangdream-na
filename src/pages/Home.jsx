import { useSyncExternalStore, useMemo } from 'react'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import HomeMobile from './Home.mobile.jsx'
import HomeDesktop from './Home.desktop.jsx'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'
import { pickFeaturedPosts } from '../lib/posts.js'
import { sortNewsByDate } from '../lib/news.js'
import { groupEventsByTime, sortEventsByDate } from '../lib/events.js'
import site from '../data/site.json'
import posts from '../data/posts.json'
import news from '../data/news.json'
import events from '../data/events.json'
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
  const featured = useMemo(
    () => pickFeaturedPosts(posts, FEATURED_POST_LIMIT, now),
    [now],
  )
  const hasPosts = featured.length > 0
  const latestNews = useMemo(
    () => sortNewsByDate(news, 'desc').slice(0, HOME_NEWS_LIMIT),
    [],
  )
  const upcomingEvents = useMemo(() => {
    const { upcoming } = groupEventsByTime(events, now)
    return sortEventsByDate(upcoming, 'asc').slice(0, HOME_SCHEDULE_LIMIT)
  }, [now])

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
