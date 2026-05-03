import './RoleBadge.css'

const ROLE_LABELS = {
  organizer: 'Organizer',
  member: 'Member',
  alumnus: 'Alumnus',
  'cover-band-lead': 'Cover Band Lead',
}

export default function RoleBadge({ role, alumnus = false }) {
  const isAlumnus = alumnus === true || role === 'alumnus'
  const effectiveKey = isAlumnus
    ? 'alumnus'
    : ROLE_LABELS[role]
      ? role
      : 'unknown'

  const label = isAlumnus
    ? ROLE_LABELS.alumnus
    : (ROLE_LABELS[role] ?? (role ?? ''))

  return (
    <span
      className={`role-badge role-badge--${effectiveKey}`}
      aria-label={label ? `Role: ${label}` : undefined}
    >
      {label}
    </span>
  )
}
