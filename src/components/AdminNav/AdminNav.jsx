import { listSchemaKeys, getSchema } from '../../lib/adminSchemas.js'
import AdminBrandPanel from '../AdminBrandPanel/AdminBrandPanel.jsx'
import AdminSignOut from '../AdminSignOut/AdminSignOut.jsx'
import './AdminNav.css'

/**
 * Sidebar nav.
 *
 * @param {object} props
 * @param {string} props.activeKey
 * @param {(key: string) => void} props.onSelect
 * @param {() => void} props.onSignOut
 * @param {Array<{ key: string, title: string }>} [props.items]
 *   When provided, overrides the legacy schema-list iteration.
 */
export default function AdminNav({ activeKey, onSelect, onSignOut, items }) {
  const navItems =
    Array.isArray(items) && items.length > 0
      ? items
      : listSchemaKeys().map((k) => ({ key: k, title: getSchema(k).title }))

  return (
    <aside className="admin-nav">
      <AdminBrandPanel />
      <nav aria-label="后台分区">
        {navItems.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={entry.key === activeKey ? 'active' : ''}
            onClick={() => onSelect?.(entry.key)}
            aria-current={entry.key === activeKey ? 'page' : undefined}
          >
            <span aria-hidden="true" className="admin-nav-glyph">◆</span>
            <span className="admin-nav-label">{entry.title}</span>
          </button>
        ))}
      </nav>
      <div className="admin-nav-footer">
        <AdminSignOut onSignOut={onSignOut} />
      </div>
    </aside>
  )
}
