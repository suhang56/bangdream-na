import './TypeBadge.css'

const LABELS = {
  concert: 'Concert',
  fanmeet: 'Fan Meet',
  con: 'Convention',
}

export default function TypeBadge({ type }) {
  const known = Object.prototype.hasOwnProperty.call(LABELS, type)
  const cls = known ? `type-badge type-badge--${type}` : 'type-badge type-badge--unknown'
  const label = known ? LABELS[type] : String(type ?? '')
  return (
    <span className={cls} data-type={type}>
      {label}
    </span>
  )
}
