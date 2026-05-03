import Hero from '../components/Hero/Hero.jsx'
import ComingSoonCard from '../components/ComingSoonCard/ComingSoonCard.jsx'
import site from '../data/site.json'

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

export default function Home() {
  return (
    <main>
      <Hero
        communityName={site.communityName}
        communityNameZh={site.communityNameZh}
        tagline={site.tagline}
        discordUrl={site.discordInvite}
      />
      <section className="section" aria-labelledby="coming-soon-title">
        <div className="section-inner">
          <h2 id="coming-soon-title" className="section-title">
            Coming Soon
          </h2>
          <p className="section-subtitle">
            We&apos;re building out events tracking and member directories.
            Watch this space.
          </p>
          <div className="coming-soon-grid">
            <ComingSoonCard
              title="Events"
              eta="Phase 2"
              icon={<CalendarIcon />}
              description="A live feed of BanG Dream! concerts, conventions, and meetups across North America."
            />
            <ComingSoonCard
              title="Members"
              eta="Phase 3"
              icon={<UsersIcon />}
              description="Profiles, oshi badges, and city-by-city chapter directories for fans across NA."
            />
          </div>
        </div>
      </section>
    </main>
  )
}
