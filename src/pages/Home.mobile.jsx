import { Link } from 'react-router-dom'
import Hero from '../components/Hero/Hero.jsx'
import HeroPeekCarousel from '../components/HeroPeekCarousel/HeroPeekCarousel.jsx'
import PlatformTileRow from '../components/PlatformTileRow/PlatformTileRow.jsx'
import NewsCard from '../components/NewsCard/NewsCard.jsx'
import EventCard from '../components/EventCard/EventCard.jsx'
import StatNumber from '../components/StatNumber/StatNumber.jsx'
import { t } from '../lib/uiLanguage.js'
import './Home.mobile.css'

const STAT_MEMBER_COUNT = 900
const STAT_EVENT_COUNT = 30

export default function HomeMobile({
  site,
  social,
  featured,
  hasPosts,
  latestNews,
  upcomingEvents,
}) {
  return (
    <main className="home-mobile">
      {hasPosts ? (
        <section className="home-mobile-carousel">
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
          <div className="home-mobile-stat-tiles">
            <div className="home-mobile-stat-tile">
              <p className="home-mobile-stat-tile__num">
                <StatNumber value={STAT_MEMBER_COUNT} suffix="+" />
              </p>
              <p className="home-mobile-stat-tile__label">
                {t('stat.membersInCommunity')}
              </p>
            </div>
            <div className="home-mobile-stat-tile">
              <p className="home-mobile-stat-tile__num">
                <StatNumber value={STAT_EVENT_COUNT} suffix="+" />
              </p>
              <p className="home-mobile-stat-tile__label">
                {t('stat.pastEvents')}
              </p>
            </div>
          </div>
        )}
      </Hero>

      <section
        className="home-mobile-section"
        aria-labelledby="home-news-heading"
      >
        <div className="home-mobile-section__header">
          <h2 className="home-mobile-section__title" id="home-news-heading">
            <span className="home-mobile-section__title-en">NEWS</span>
            <span className="home-mobile-section__title-zh">
              {t('home.newsHeading')}
            </span>
          </h2>
          <Link to="/news" className="home-mobile-section__more">
            {t('home.viewMore')} →
          </Link>
        </div>
        {latestNews.length > 0 ? (
          <ul className="home-mobile-section__list">
            {latestNews.map((n) => (
              <li key={n.id}>
                <NewsCard news={n} variant="compact" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-mobile-section__empty">{t('empty.noNews')}</p>
        )}
      </section>

      <section
        className="home-mobile-section"
        aria-labelledby="home-schedule-heading"
      >
        <div className="home-mobile-section__header">
          <h2 className="home-mobile-section__title" id="home-schedule-heading">
            <span className="home-mobile-section__title-en">SCHEDULE</span>
            <span className="home-mobile-section__title-zh">
              {t('home.scheduleHeading')}
            </span>
          </h2>
          <Link to="/events" className="home-mobile-section__more">
            {t('home.viewMore')} →
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <ul className="home-mobile-section__list">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <EventCard event={e} variant="compact" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-mobile-section__empty">{t('empty.noEvents')}</p>
        )}
      </section>

      <PlatformTileRow social={social} />
    </main>
  )
}
