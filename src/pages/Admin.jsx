import { useState, useEffect } from 'react'
import AdminLogin, { TOKEN_STORAGE_KEY } from '../components/AdminLogin/AdminLogin.jsx'
import AdminNav from '../components/AdminNav/AdminNav.jsx'
import AdminEditor from '../components/AdminEditor/AdminEditor.jsx'
import { listSchemaKeys } from '../lib/adminSchemas.js'
import './Admin.css'

const DEFAULT_VIEW = 'events'

export default function Admin() {
  const [token, setToken] = useState(() => {
    try {
      return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [expiredBanner, setExpiredBanner] = useState(false)
  const [activeKey, setActiveKey] = useState(DEFAULT_VIEW)
  const [openPR, setOpenPR] = useState(null)

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

  function handleLogin(t) {
    setExpiredBanner(false)
    setToken(t)
  }

  function handleLogout() {
    try { window.sessionStorage.removeItem(TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    setToken('')
    setOpenPR(null)
    setActiveKey(DEFAULT_VIEW)
  }

  function handleAuthExpired() {
    try { window.sessionStorage.removeItem(TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    setToken('')
    setOpenPR(null)
    setActiveKey(DEFAULT_VIEW)
    setExpiredBanner(true)
  }

  function handleSelect(key) {
    if (listSchemaKeys().includes(key)) setActiveKey(key)
  }

  function handleSavedPR(pr) {
    if (pr) setOpenPR({ number: pr.number, htmlUrl: pr.htmlUrl })
  }

  if (!token) {
    return <AdminLogin onLogin={handleLogin} expiredBanner={expiredBanner} />
  }

  return (
    <div className="admin-shell">
      <AdminNav
        activeKey={activeKey}
        onSelect={handleSelect}
        onLogout={handleLogout}
        openPR={openPR}
      />
      <main className="admin-content" key={activeKey}>
        <AdminEditor
          schemaKey={activeKey}
          token={token}
          onSavedPR={handleSavedPR}
          onAuthExpired={handleAuthExpired}
        />
      </main>
    </div>
  )
}

