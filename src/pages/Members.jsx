import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import membersData from '../data/members.json'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import MembersMobile from './Members.mobile.jsx'
import MembersDesktop from './Members.desktop.jsx'
import { filterMembers, sortMembersByName } from '../lib/members.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'

const SEARCH_DEBOUNCE_MS = 200

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Members shell — owns ALL hooks and state. Renders both mobile + desktop
 * tracks; `<Mobile>` / `<Desktop>` wrappers from `useBreakpoint` mount only
 * the matching one. Tracks are pure presentational (no useState, no useEffect,
 * no data fetching).
 */
export default function Members() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [selectedBands, setSelectedBands] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [searchInput])

  const availableBands = useMemo(
    () =>
      Array.from(
        new Set(
          membersData
            .map((m) => m.oshiBand)
            .filter((b) => typeof b === 'string' && b.trim() !== ''),
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
  const emptyMessage = rosterEmpty ? t('empty.noMembers') : t('empty.noMembersMatch')

  const layoutProps = {
    totalMembers: membersData.length,
    visibleMembers,
    availableBands,
    selectedBands,
    onBandsChange: setSelectedBands,
    selectedRole,
    onRoleChange: setSelectedRole,
    searchInput,
    onSearchChange: setSearchInput,
    emptyMessage,
  }

  return (
    <>
      <Mobile>
        <MembersMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <MembersDesktop {...layoutProps} />
      </Desktop>
    </>
  )
}
