import { createElement } from 'react'
import { getIllustration } from './illustrations/index.js'
import './AdminEmptyState.css'

/**
 * Generic empty-state card for admin list views.
 *
 * @param {object} props
 * @param {string} props.schemaKey - selects the illustration
 * @param {string} props.title - Chinese heading (e.g. '还没有活动')
 * @param {string} [props.hint] - Chinese sub-copy
 * @param {{ label: string, onClick: () => void } | null} [props.cta] - optional primary action
 */
export default function AdminEmptyState({ schemaKey, title, hint, cta }) {
  const illustration = getIllustration(schemaKey)
  return (
    <div className="admin-empty-state" role="status" aria-live="polite">
      <div className="admin-empty-state-art">
        {createElement(illustration)}
      </div>
      <h3 className="admin-empty-state-title">{title}</h3>
      {hint && <p className="admin-empty-state-hint">{hint}</p>}
      {cta && (
        <button
          type="button"
          className="admin-empty-state-cta"
          onClick={cta.onClick}
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}
