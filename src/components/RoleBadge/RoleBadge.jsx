import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './RoleBadge.css'

const ROLE_KEYS = {
  organizer: 'role.organizer',
  member: 'role.member',
  alumnus: 'role.alumnus',
  'cover-band-lead': 'role.coverBandLead',
}

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function RoleBadge({ role, alumnus = false }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const isAlumnus = alumnus === true || role === 'alumnus'
  const effectiveKey = isAlumnus
    ? 'alumnus'
    : ROLE_KEYS[role]
      ? role
      : 'unknown'

  let label
  if (isAlumnus) {
    label = t('role.alumnus')
  } else if (ROLE_KEYS[role]) {
    label = t(ROLE_KEYS[role])
  } else {
    label = role ?? ''
  }

  return (
    <span
      className={`role-badge role-badge--${effectiveKey}`}
      aria-label={label ? t('roleBadge.aria', { label }) : undefined}
    >
      {label}
    </span>
  )
}
