import { useState, useEffect } from 'react'
import AdminLogin, { TOKEN_STORAGE_KEY } from '../components/AdminLogin/AdminLogin.jsx'
import './Admin.css'

export default function Admin() {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [expiredBanner, setExpiredBanner] = useState(false)

  useEffect(() => {
    if (!token) return
    function onStorage(e) {
      if (e.key === TOKEN_STORAGE_KEY && !e.newValue) {
        setToken('')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [token])

  if (!token) {
    return <AdminLogin onLogin={(t) => { setExpiredBanner(false); setToken(t) }} expiredBanner={expiredBanner} />
  }

  return (
    <div className="admin-shell">
      <main className="admin-content">
        <h1>Admin Panel</h1>
        <p>Setup pending — components wired in next commit batch.</p>
        <button
          type="button"
          className="admin-shell-logout"
          onClick={() => {
            window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
            setToken('')
          }}
        >
          Sign out
        </button>
      </main>
    </div>
  )
}
