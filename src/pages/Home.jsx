import { useSyncExternalStore, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Hero from '../components/Hero/Hero.jsx'
import HeroPeekCarousel from '../components/HeroPeekCarousel/HeroPeekCarousel.jsx'
import PlatformTileRow from '../components/PlatformTileRow/PlatformTileRow.jsx'
import NewsCard from '../components/NewsCard/NewsCard.jsx'
import EventCard from '../components/EventCard/EventCard.jsx'
import StatNumber from '../components/StatNumber/StatNumber.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import { pickFeaturedPosts } from '../lib/posts.js'
import { sortNewsByDate } from '../lib/news.js'
import { groupEventsByTime, sortEventsByDate } from '../lib/events.js'
import site from '../data/site.json'
import posts from '../data/posts.json'
import news from '../data/news.json'
import events from '../data/events.json'
import social from '../data/social.json'
import './Home.css'

const STAT_MEMBER_COUNT = 900
const STAT_EVENT_COUNT = 30
const HOME_NEWS_LIMIT = 3
const HOME_SCHEDULE_LIMIT = 3

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function Home() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const now = useMemo(() => new Date(), [])
  const featured = useMemo(() => pickFeaturedPosts(posts, 6, now), [now])
  const hasPosts = featured.length > 0

  const latestNews = useMemo(
    () => sortNewsByDate(news, 'desc').slice(0, HOME_NEWS_LIMIT),
    [],
  )
  const upcomingEvents = useMemo(() => {
    const { upcoming } = groupEventsByTime(events, now)
    return sortEventsByDate(upcoming, 'asc').slice(0, HOME_SCHEDULE_LIMIT)
  }, [now])

  return (
    <main>
      {hasPosts ? (
        <section className="home-carousel-section">
          <HeroPeekCarousel posts={featured} />
        </section>
      ) : null}
      <Hero
        communityName={site.communityName}
        communityNameZh={site.communityNameZh}
        communityNameJp={site.communityNameJp}
        tagline={t('tagline')}
      >
        {hasPosts ? null : (
          <div className="home-stat-tiles">
            <div className="home-stat-tile">
              <p className="home-stat-tile__num">
                <StatNumber value={STAT_MEMBER_COUNT} suffix="+" />
              </p>
              <p className="home-stat-tile__label">
                {t('stat.membersInCommunity')}
              </p>
            </div>
            <div className="home-stat-tile">
              <p className="home-stat-tile__num">
                <StatNumber value={STAT_EVENT_COUNT} suffix="+" />
              </p>
              <p className="home-stat-tile__label">{t('stat.pastEvents')}</p>
            </div>
          </div>
        )}
      </Hero>

      <section className="home-section" aria-labelledby="home-news-heading">
        <div className="home-section__header">
          <h2 className="home-section__title" id="home-news-heading">
            <span className="home-section__title-en">NEWS</span>
            <span className="home-section__title-zh">新闻</span>
          </h2>
          <Link to="/news" className="home-section__more">
            查看更多 →
          </Link>
        </div>
        {latestNews.length > 0 ? (
          <ul className="home-section__grid">
            {latestNews.map((n) => (
              <li key={n.id}>
                <NewsCard news={n} variant="compact" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-section__empty">还没有新闻发布。</p>
        )}
      </section>

      <section className="home-section" aria-labelledby="home-schedule-heading">
        <div className="home-section__header">
          <h2 className="home-section__title" id="home-schedule-heading">
            <span className="home-section__title-en">SCHEDULE</span>
            <span className="home-section__title-zh">活动</span>
          </h2>
          <Link to="/events" className="home-section__more">
            查看更多 →
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <ul className="home-section__grid">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <EventCard event={e} variant="compact" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-section__empty">暂无即将举办的活动。</p>
        )}
      </section>

      <PlatformTileRow social={social} />
    </main>
  )
}
