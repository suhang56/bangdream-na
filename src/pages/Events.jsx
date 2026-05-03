import ComingSoonCard from '../components/ComingSoonCard/ComingSoonCard.jsx'

export default function Events() {
  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Events</h1>
        <p className="section-subtitle">
          Concerts, conventions, and meetups — coming with Phase 2.
        </p>
        <div className="coming-soon-grid">
          <ComingSoonCard
            title="Concert Calendar"
            eta="Phase 2"
            description="Curated upcoming shows from BanG Dream! seiyuu and partner acts touring NA."
          />
          <ComingSoonCard
            title="Convention Map"
            eta="Phase 2"
            description="Anime cons with BanG Dream! programming, panels, or community meetups."
          />
        </div>
      </div>
    </main>
  )
}
