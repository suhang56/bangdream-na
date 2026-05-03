import MemberCard from '../MemberCard/MemberCard.jsx'
import './MemberGrid.css'

export default function MemberGrid({
  members,
  emptyMessage = 'No members match your filters.',
}) {
  if (!members || members.length === 0) {
    return (
      <p className="member-grid-empty" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="member-grid">
      {members.map((m) => (
        <li key={m.id} className="member-grid-item">
          <MemberCard member={m} />
        </li>
      ))}
    </ul>
  )
}
