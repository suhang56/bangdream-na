import { useEffect, useMemo, useState } from 'react'
import membersData from '../data/members.json'
import MemberFilter from '../components/MemberFilter/MemberFilter.jsx'
import MemberGrid from '../components/MemberGrid/MemberGrid.jsx'
import { filterMembers, sortMembersByName } from '../lib/members.js'
import './Members.css'

const SEARCH_DEBOUNCE_MS = 200

export default function Members() {
  const [selectedBands, setSelectedBands] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const availableBands = useMemo(
    () =>
      Array.from(
        new Set(
          membersData.map((m) => m.oshiBand).filter((b) => typeof b === 'string' && b.trim() !== ''),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [],
  )

  const visibleMembers = useMemo(
    () =>
      sortMembersByName(
        filterMembers(membersData, {
          bands: selectedBands,
          role: selectedRole,
          search: debouncedSearch,
        }),
      ),
    [selectedBands, selectedRole, debouncedSearch],
  )

  const rosterEmpty = membersData.length === 0
  const emptyMessage = rosterEmpty
    ? 'Members coming soon — be the first to join via Discord.'
    : 'No members match your filters.'

  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Members</h1>
        <p className="section-subtitle">
          Organizers, members, and cover bands across the BanG Dream! NA community.
        </p>
        <MemberFilter
          bands={availableBands}
          selectedBands={selectedBands}
          onBandsChange={setSelectedBands}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
        />
        <MemberGrid members={visibleMembers} emptyMessage={emptyMessage} />
      </div>
    </main>
  )
}
