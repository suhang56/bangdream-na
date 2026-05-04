import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import MembersMobile from './Members.mobile.jsx'
import MembersDesktop from './Members.desktop.jsx'
import LoadingState from '../components/LoadingState/LoadingState.jsx'
import ErrorState from '../components/ErrorState/ErrorState.jsx'
import { fetchMembers } from '../lib/api.js'
import { adaptMemberList } from '../lib/apiAdapter.js'
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
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchMembers()
      .then((res) => {
        if (cancelled) return
        setMembers(adaptMemberList(res))
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setStatus('loading')
    setReloadKey((k) => k + 1)
  }

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
          members
            .map((m) => m.oshiBand)
            .filter((b) => typeof b === 'string' && b.trim() !== ''),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [members],
  )

  const visibleMembers = useMemo(
    () =>
      sortMembersByName(
        filterMembers(members, {
          bands: selectedBands,
          role: selectedRole,
          search: debouncedSearch,
        }),
      ),
    [members, selectedBands, selectedRole, debouncedSearch],
  )

  if (status === 'loading') {
    return <LoadingState className="members-loading" />
  }
  if (status === 'error') {
    return <ErrorState className="members-error" onRetry={retry} />
  }

  const rosterEmpty = members.length === 0
  const emptyMessage = rosterEmpty ? t('empty.noMembers') : t('empty.noMembersMatch')

  const layoutProps = {
    totalMembers: members.length,
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
