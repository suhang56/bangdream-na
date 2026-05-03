import { useState, useEffect } from 'react'
import AdminLogin, { TOKEN_STORAGE_KEY } from '../components/AdminLogin/AdminLogin.jsx'
import AdminNav from '../components/AdminNav/AdminNav.jsx'
import AdminTopBar from '../components/AdminTopBar/AdminTopBar.jsx'
import AdminEditor from '../components/AdminEditor/AdminEditor.jsx'
import { listSchemaKeys } from '../lib/adminSchemas.js'
import './Admin.css'

const DEFAULT_VIEW = 'events'
const SAVED_BANNER_TIMEOUT_MS = 5000

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
  const [saveStatus, setSaveStatus] = useState({ status: 'idle' })

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

  // Auto-clear "saved" pill after a few seconds so it doesn't persist forever.
  useEffect(() => {
    if (saveStatus.status !== 'saved') return undefined
    const t = setTimeout(() => {
      setSaveStatus((cur) => (cur.status === 'saved' ? { status: 'idle' } : cur))
    }, SAVED_BANNER_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [saveStatus])

  function handleLogin(t) {
    setExpiredBanner(false)
    setToken(t)
  }

  function handleLogout() {
    try { window.sessionStorage.removeItem(TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    setToken('')
    setOpenPR(null)
    setActiveKey(DEFAULT_VIEW)
    setSaveStatus({ status: 'idle' })
  }

  function handleAuthExpired() {
    try { window.sessionStorage.removeItem(TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    setToken('')
    setOpenPR(null)
    setActiveKey(DEFAULT_VIEW)
    setExpiredBanner(true)
    setSaveStatus({ status: 'idle' })
  }

  function handleSelect(key) {
    if (!listSchemaKeys().includes(key)) return
    setActiveKey(key)
    setSaveStatus({ status: 'idle' })
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
        onSignOut={handleLogout}
      />
      <div className="admin-main-column">
        <AdminTopBar
          schemaKey={activeKey}
          editing={null}
          saveStatus={saveStatus}
          openPR={openPR}
        />
        <main className="admin-content" key={activeKey}>
          <AdminEditor
            schemaKey={activeKey}
            token={token}
            onSavedPR={handleSavedPR}
            onAuthExpired={handleAuthExpired}
            onSaveStatus={setSaveStatus}
          />
        </main>
      </div>
    </div>
  )
}
