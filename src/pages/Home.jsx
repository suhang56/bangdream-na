import { useSyncExternalStore, useMemo } from 'react'
import Hero from '../components/Hero/Hero.jsx'
import HeroCarousel from '../components/HeroCarousel/HeroCarousel.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import { groupEventsByTime } from '../lib/events.js'
import site from '../data/site.json'
import events from '../data/events.json'
import members from '../data/members.json'
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
  const { upcoming, past } = groupEventsByTime(events, now)
  const hasUpcoming = upcoming.length > 0

  return (
    <main>
      <Hero
        communityName={site.communityName}
        communityNameZh={site.communityNameZh}
        communityNameJp={site.communityNameJp}
        tagline={site.tagline}
        discordUrl={site.discordInvite}
      >
        {hasUpcoming ? (
          <HeroCarousel events={events} max={5} now={now} />
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
    </main>
  )
}
