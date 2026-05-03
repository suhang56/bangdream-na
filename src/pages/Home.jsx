import { useSyncExternalStore, useMemo } from 'react'
import Hero from '../components/Hero/Hero.jsx'
import HeroPeekCarousel from '../components/HeroPeekCarousel/HeroPeekCarousel.jsx'
import PlatformTileRow from '../components/PlatformTileRow/PlatformTileRow.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import { groupEventsByTime } from '../lib/events.js'
import { pickFeaturedPosts } from '../lib/posts.js'
import site from '../data/site.json'
import events from '../data/events.json'
import members from '../data/members.json'
import posts from '../data/posts.json'
import social from '../data/social.json'
import './Home.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function Home() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const now = useMemo(() => new Date(), [])
  const { past } = groupEventsByTime(events, now)
  const featured = useMemo(() => pickFeaturedPosts(posts, 6, now), [now])
  const hasPosts = featured.length > 0

  return (
    <main>
      <Hero
        communityName={site.communityName}
        communityNameZh={site.communityNameZh}
        communityNameJp={site.communityNameJp}
        tagline={t('tagline')}
      >
        {hasPosts ? (
          <HeroPeekCarousel posts={featured} />
        ) : (
          <div className="home-stat-tiles">
            <div className="home-stat-tile">
              <p className="home-stat-tile__num">{members.length}</p>
              <p className="home-stat-tile__label">
                {t('stat.membersInCommunity')}
              </p>
            </div>
            <div className="home-stat-tile">
              <p className="home-stat-tile__num">{past.length}</p>
              <p className="home-stat-tile__label">{t('stat.pastEvents')}</p>
            </div>
          </div>
        )}
      </Hero>
      <PlatformTileRow social={social} />
    </main>
  )
}
