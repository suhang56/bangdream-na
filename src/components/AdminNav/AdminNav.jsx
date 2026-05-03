import { listSchemaKeys, getSchema } from '../../lib/adminSchemas.js'
import AdminBrandPanel from '../AdminBrandPanel/AdminBrandPanel.jsx'
import './AdminNav.css'

export default function AdminNav({ activeKey, onSelect }) {
  const keys = listSchemaKeys()
  return (
    <aside className="admin-nav">
      <AdminBrandPanel />
      <nav aria-label="后台分区">
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
              <span aria-hidden="true" className="admin-nav-glyph">◆</span>
              <span className="admin-nav-label">{schema.title}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
