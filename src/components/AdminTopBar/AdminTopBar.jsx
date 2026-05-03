import { deriveBreadcrumb } from './breadcrumb.js'
import { deriveSaveStatusLabel } from './saveStatus.js'
import './AdminTopBar.css'

/**
 * Sticky top bar inside the admin shell.
 *
 * @param {object} props
 * @param {string} props.schemaKey
 * @param {object|null} props.editing - null in list view; item or {__new:true} in edit/create
 * @param {{ status?: 'idle'|'saving'|'saved'|'error', prNumber?: number|null, prUrl?: string|null }} [props.saveStatus]
 * @param {{ number: number, htmlUrl: string } | null} [props.openPR]
 * @param {() => void} props.onSignOut
 */
export default function AdminTopBar({
  schemaKey,
  editing,
  saveStatus,
  openPR,
  onSignOut,
}) {
  const segments = deriveBreadcrumb(schemaKey, editing)
  const status = deriveSaveStatusLabel(saveStatus ?? { status: 'idle' })

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-stripe" aria-hidden="true" />
      <div className="admin-topbar-row">
        <nav aria-label="后台导航路径" className="admin-topbar-breadcrumb">
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1
            return (
              <span key={`${i}-${seg.label}`} className="admin-topbar-breadcrumb-segment">
                {i > 0 && <span aria-hidden="true" className="admin-topbar-breadcrumb-sep">/</span>}
                <span
                  className={`admin-topbar-breadcrumb-label${isLast ? ' is-last' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {seg.label}
                </span>
              </span>
            )
          })}
        </nav>

        <div className="admin-topbar-status-wrap">
          {status.variant !== 'idle' && (
            <span
              className={`admin-topbar-status admin-topbar-status-${status.variant}`}
              role="status"
              aria-live={status.a11yLive}
            >
              {status.label}
            </span>
          )}
        </div>

        <div className="admin-topbar-actions">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-topbar-link"
          >
            查看网站 ↗
          </a>
          {openPR ? (
            <a
              href={openPR.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-topbar-pr-pill"
            >
              PR #{openPR.number} ↗
            </a>
          ) : (
            <span className="admin-topbar-pr-empty">无待合并 PR</span>
          )}
          <button
            type="button"
            className="admin-topbar-signout"
            onClick={onSignOut}
          >
            登出
          </button>
        </div>
      </div>
    </header>
  )
}
