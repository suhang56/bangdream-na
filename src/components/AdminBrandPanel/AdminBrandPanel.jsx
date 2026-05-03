import './AdminBrandPanel.css'

/**
 * Sidebar brand panel for admin: panda-sigil + 后台 wordmark + bangdream-na subtitle.
 * Sigil stroke uses currentColor → tints to active band theme via CSS color.
 */
export default function AdminBrandPanel() {
  return (
    <div className="admin-brand-panel">
      <div className="admin-brand-panel-mark" aria-hidden="true">
        <svg
          viewBox="0 0 32 32"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="16" cy="16" r="11" />
          <circle cx="9" cy="9" r="3" fill="currentColor" stroke="none" />
          <circle cx="23" cy="9" r="3" fill="currentColor" stroke="none" />
          <circle cx="13" cy="15" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="19" cy="15" r="1.5" fill="currentColor" stroke="none" />
          <path d="M14 21 q2 2 4 0" />
        </svg>
      </div>
      <div className="admin-brand-panel-text">
        <span className="admin-brand-panel-title">后台</span>
        <span className="admin-brand-panel-sub">BD!NA 后台</span>
      </div>
    </div>
  )
}
