import ComingSoonCard from '../components/ComingSoonCard/ComingSoonCard.jsx'

export default function Members() {
  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Members</h1>
        <p className="section-subtitle">
          Profiles, chapters, and oshi badges — coming with Phase 3.
        </p>
        <div className="coming-soon-grid">
          <ComingSoonCard
            title="Member Directory"
            eta="Phase 3"
            description="Searchable profiles with oshi tags, regions, and convention plans."
          />
          <ComingSoonCard
            title="City Chapters"
            eta="Phase 3"
            description="Local chapter pages for major NA metros, with chapter leads and meetup feeds."
          />
        </div>
      </div>
    </main>
  )
}
