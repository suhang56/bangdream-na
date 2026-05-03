import { listSchemaKeys, getSchema } from '../../lib/adminSchemas.js'
import './AdminNav.css'

export default function AdminNav({ activeKey, onSelect, onLogout, openPR }) {
  const keys = listSchemaKeys()
  return (
    <aside className="admin-nav">
      <div className="admin-nav-logo">
        Admin
        <small>bangdream-na</small>
      </div>
      <nav aria-label="Admin sections">
        {keys.map((k) => {
          const schema = getSchema(k)
          return (
            <button
              key={k}
              type="button"
              className={k === activeKey ? 'active' : ''}
              onClick={() => onSelect?.(k)}
              aria-current={k === activeKey ? 'page' : undefined}
            >
              {schema.title}
            </button>
          )
        })}
      </nav>
      <div className="admin-nav-utilities">
        <a href="/" target="_blank" rel="noopener noreferrer">View Site ↗</a>
        {openPR ? (
          <a href={openPR.htmlUrl} target="_blank" rel="noopener noreferrer">
            Open PR #{openPR.number} ↗
          </a>
        ) : (
          <span className="disabled" title="A PR opens automatically on your next save.">No open PR</span>
        )}
      </div>
      <button type="button" className="admin-nav-logout" onClick={onLogout}>
        Sign out
      </button>
    </aside>
  )
}
