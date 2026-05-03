import { useSyncExternalStore, useMemo } from 'react'
import Hero from '../components/Hero/Hero.jsx'
import HeroPeekCarousel from '../components/HeroPeekCarousel/HeroPeekCarousel.jsx'
import PlatformTileRow from '../components/PlatformTileRow/PlatformTileRow.jsx'
import StatNumber from '../components/StatNumber/StatNumber.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import { pickFeaturedPosts } from '../lib/posts.js'
import site from '../data/site.json'
import posts from '../data/posts.json'
import social from '../data/social.json'
import './Home.css'

const STAT_MEMBER_COUNT = 900
const STAT_EVENT_COUNT = 30

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
      <PlatformTileRow social={social} />
    </main>
  )
}
