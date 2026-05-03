import { Link } from 'react-router-dom'
import Hero from '../components/Hero/Hero.jsx'
import HeroPeekCarousel from '../components/HeroPeekCarousel/HeroPeekCarousel.jsx'
import PlatformTileRow from '../components/PlatformTileRow/PlatformTileRow.jsx'
import NewsCard from '../components/NewsCard/NewsCard.jsx'
import EventCard from '../components/EventCard/EventCard.jsx'
import StatNumber from '../components/StatNumber/StatNumber.jsx'
import { t } from '../lib/uiLanguage.js'
import './Home.desktop.css'

const STAT_MEMBER_COUNT = 900
const STAT_EVENT_COUNT = 30

export default function HomeDesktop({
  site,
  social,
  featured,
  hasPosts,
  latestNews,
  upcomingEvents,
}) {
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
            <span className="home-section__title-zh">{t('home.newsHeading')}</span>
          </h2>
          <Link to="/news" className="home-section__more">
            {t('home.viewMore')} →
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
          <p className="home-section__empty">{t('empty.noNews')}</p>
        )}
      </section>

      <section className="home-section" aria-labelledby="home-schedule-heading">
        <div className="home-section__header">
          <h2 className="home-section__title" id="home-schedule-heading">
            <span className="home-section__title-en">SCHEDULE</span>
            <span className="home-section__title-zh">{t('home.scheduleHeading')}</span>
          </h2>
          <Link to="/events" className="home-section__more">
            {t('home.viewMore')} →
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
          <p className="home-section__empty">{t('empty.noEvents')}</p>
        )}
      </section>

      <PlatformTileRow social={social} />
    </main>
  )
}
