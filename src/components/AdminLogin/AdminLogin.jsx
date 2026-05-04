import { loginUrl } from '../../lib/api.js'
import './AdminLogin.css'

// Kept exported for backwards compatibility with any external imports during R4.
// Cookie-based sessions don't use localStorage; this constant is now a no-op marker.
export const TOKEN_STORAGE_KEY = 'bangdream-na:gh_token'

export default function AdminLogin({ expiredBanner, forbiddenBanner }) {
  function handleLogin() {
    window.location.assign(loginUrl())
  }

  return (
    <div className="admin-login">
      <div className="admin-login-box">
        <h1 className="admin-login-title">BD!NA 后台</h1>
        <p className="admin-login-sub">使用 GitHub 账号登录以继续。</p>

        {expiredBanner && (
          <div className="admin-login-banner" role="status" aria-live="polite">
            登录已过期,请重新登录。
          </div>
        )}

        {forbiddenBanner && (
          <div className="admin-login-banner" role="status" aria-live="polite">
            当前账号没有管理员权限。请联系管理员获取权限,或切换其他账号。
          </div>
        )}

        <button
          type="button"
          className="admin-login-button"
          onClick={handleLogin}
          autoFocus
        >
          使用 GitHub 登录
        </button>

        <details className="admin-login-help">
          <summary>关于登录</summary>
          <ul>
            <li>本站使用 GitHub OAuth 登录,无需粘贴 token。</li>
            <li>登录信息以 HttpOnly 安全 Cookie 形式保存,7 天有效。</li>
            <li>仅授权账号可以编辑内容;其他账号登录后只能浏览。</li>
            <li>如需退出,点击右上角的「登出」按钮。</li>
          </ul>
        </details>
      </div>
    </div>
  )
}
