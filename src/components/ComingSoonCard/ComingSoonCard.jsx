import './ComingSoonCard.css'

export default function ComingSoonCard({ title, description, eta, icon }) {
  return (
    <div
      className="coming-soon-card"
      role="article"
      aria-label={eta ? `${title} — coming in ${eta}` : title}
    >
      <div className="coming-soon-top">
        <div className="coming-soon-title-row">
          {icon ? <span className="coming-soon-icon" aria-hidden="true">{icon}</span> : null}
          <h3 className="coming-soon-title">{title}</h3>
        </div>
        {eta ? <span className="coming-soon-badge">{eta}</span> : null}
      </div>
      {description ? <p className="coming-soon-desc">{description}</p> : null}
    </div>
  )
}
