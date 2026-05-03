import './AdminBrandPanel.css'

/**
 * Sidebar brand panel for admin: site logo + 后台 wordmark + BD!NA 后台 subline.
 * Reuses the public-site `/logo.png` (Hero + Navbar use the same asset).
 */
export default function AdminBrandPanel() {
  return (
    <div className="admin-brand-panel">
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className="admin-brand-panel-mark"
        width="32"
        height="32"
      />
      <div className="admin-brand-panel-text">
        <span className="admin-brand-panel-title">后台</span>
        <span className="admin-brand-panel-sub">BD!NA 后台</span>
      </div>
    </div>
  )
}
