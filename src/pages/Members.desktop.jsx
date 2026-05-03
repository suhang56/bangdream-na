import MemberFilter from '../components/MemberFilter/MemberFilter.jsx'
import MemberGrid from '../components/MemberGrid/MemberGrid.jsx'
import { t } from '../lib/uiLanguage.js'
import './Members.desktop.css'

/**
 * Desktop track for the Members page. Pure presentational — receives all state
 * via props from `Members.jsx`. No `useState`, no `useEffect`, no data fetching.
 */
export default function MembersDesktop({
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
  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.members')}</h1>
        <p className="section-subtitle">{t('members.subtitle')}</p>
        <MemberFilter
          bands={availableBands}
          selectedBands={selectedBands}
          onBandsChange={onBandsChange}
          selectedRole={selectedRole}
          onRoleChange={onRoleChange}
          searchValue={searchInput}
          onSearchChange={onSearchChange}
        />
        <MemberGrid members={visibleMembers} emptyMessage={emptyMessage} />
      </div>
    </main>
  )
}
