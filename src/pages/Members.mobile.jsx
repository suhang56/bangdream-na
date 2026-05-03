import MemberFilter from '../components/MemberFilter/MemberFilter.jsx'
import { t } from '../lib/uiLanguage.js'
import './Members.mobile.css'

/**
 * Mobile track for the Members page. Pure presentational — receives all state
 * via props from `Members.jsx`. No `useState`, no `useEffect`, no data fetching.
 *
 * Layout (per docs/m3-mobile-designs.md §1):
 *  - hero block (≤52px): h1 + 1-line subtitle
 *  - sticky filter strip: chip group + role radios + search
 *  - 2-col grid (always): 64-72px tile cards (avatar/monogram + name + city·oshi)
 *  - sticky bottom count pill: `{shown} / {total} 显示中`
 */
export default function MembersMobile({
  totalMembers,
  visibleMembers,
  availableBands,
  selectedBands,
  onBandsChange,
  selectedRole,
  onRoleChange,
  searchInput,
  onSearchChange,
  emptyMessage,
}) {
  const shown = visibleMembers.length
  const total = totalMembers
  const countLabel = t('members.countDisplayed', { shown, total })

  return (
    <main className="members-mobile">
      <header className="members-mobile-hero">
        <h1 className="members-mobile-hero-title">{t('nav.members')}</h1>
        <p className="members-mobile-hero-subtitle">{t('members.subtitle')}</p>
      </header>

      <section
        className="members-mobile-filter"
        aria-label={t('memberFilter.byRole')}
      >
        <MemberFilter
          bands={availableBands}
          selectedBands={selectedBands}
          onBandsChange={onBandsChange}
          selectedRole={selectedRole}
          onRoleChange={onRoleChange}
          searchValue={searchInput}
          onSearchChange={onSearchChange}
        />
      </section>

      {visibleMembers.length === 0 ? (
        <p className="members-mobile-empty" role="status">
          {emptyMessage}
        </p>
      ) : (
        <ul className="members-mobile-grid">
          {visibleMembers.map((m) => (
            <li key={m.id} className="members-mobile-grid-item">
              <MembersMobileCard member={m} />
            </li>
          ))}
        </ul>
      )}

      <div
        className="members-mobile-count"
        role="status"
        aria-live="polite"
      >
        {countLabel}
      </div>
    </main>
  )
}

function firstGrapheme(value) {
  if (typeof value !== 'string' || value.length === 0) return '?'
  // Pick the first user-visible grapheme so emoji + CJK render cleanly.
  const iter = value[Symbol.iterator]()
  const next = iter.next()
  return next.done ? value.charAt(0) : next.value
}

function MembersMobileCard({ member }) {
  const isAlumnus = member.alumnus === true || member.role === 'alumnus'
  const monogram = firstGrapheme(member.name)
  const metaParts = []
  if (typeof member.city === 'string' && member.city.trim() !== '') {
    metaParts.push(member.city)
  }
  if (
    typeof member.oshiCharacter === 'string' &&
    member.oshiCharacter.trim() !== ''
  ) {
    metaParts.push(member.oshiCharacter)
  }
  const metaText = metaParts.join(' · ')

  return (
    <article
      className={`members-mobile-card${isAlumnus ? ' members-mobile-card--alumnus' : ''}`}
      aria-label={member.name}
    >
      <div className="members-mobile-card-avatar" aria-hidden="true">
        {monogram}
      </div>
      <div className="members-mobile-card-body">
        <h3 className="members-mobile-card-name" title={member.name}>
          {member.name}
        </h3>
        {metaText !== '' && (
          <p className="members-mobile-card-meta" title={metaText}>
            {metaText}
          </p>
        )}
      </div>
    </article>
  )
}
