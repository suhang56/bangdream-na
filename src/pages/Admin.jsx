import { useState, useEffect, useCallback } from 'react'
import AdminLogin from '../components/AdminLogin/AdminLogin.jsx'
import AdminNav from '../components/AdminNav/AdminNav.jsx'
import AdminTopBar from '../components/AdminTopBar/AdminTopBar.jsx'
import AdminEditor from '../components/AdminEditor/AdminEditor.jsx'
import AdminSettings from '../components/AdminSettings/AdminSettings.jsx'
import SiteSettingsTab from '../components/SiteSettingsTab/SiteSettingsTab.jsx'
import GalleryTab from '../components/Gallery/GalleryTab.jsx'
import { listD1SchemaKeys, getD1Schema } from '../lib/admin/d1Schemas.js'
import { fetchMe, logout, ApiError } from '../lib/api.js'
import { t } from '../lib/uiLanguage.js'
import '../components/AdminSettings/AdminSettings.css'
import './Admin.css'

const DEFAULT_VIEW = 'news'
const SETTINGS_KEY = '__settings__'
const SITE_SETTINGS_KEY = '__site_settings__'
const GALLERY_KEY = '__gallery__'
const SAVED_BANNER_TIMEOUT_MS = 5000

const AUTH_STATES = Object.freeze({
  CHECKING: 'checking',
  ANON: 'anon',
  MEMBER: 'member',
  ADMIN: 'admin',
})

function navItems() {
  const schemas = listD1SchemaKeys().map((k) => ({
    key: k,
    title: getD1Schema(k).title,
  }))
  return [
    ...schemas,
    {
      key: GALLERY_KEY,
      title: t('admin.gallery.tabTitle') || '相册',
    },
    {
      key: SITE_SETTINGS_KEY,
      title: t('admin.siteSettings.tabTitle') || '站点信息',
    },
    { key: SETTINGS_KEY, title: t('admin.settings.tabTitle') },
  ]
}

function isValidNavKey(key) {
  if (
    key === SETTINGS_KEY ||
    key === SITE_SETTINGS_KEY ||
    key === GALLERY_KEY
  ) {
    return true
  }
  return listD1SchemaKeys().includes(key)
}

export default function Admin() {
  const [authState, setAuthState] = useState(AUTH_STATES.CHECKING)
  const [user, setUser] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [expiredBanner, setExpiredBanner] = useState(false)
  const [forbiddenBanner, setForbiddenBanner] = useState(false)
  const [activeKey, setActiveKey] = useState(DEFAULT_VIEW)
  const [saveStatus, setSaveStatus] = useState({ status: 'idle' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const result = await fetchMe()
        if (cancelled) return
        if (!result || !result.user) {
          setUser(null)
          setAuthState(AUTH_STATES.ANON)
          return
        }
        setUser(result.user)
        if (result.user.role === 'admin') {
          setAuthState(AUTH_STATES.ADMIN)
          setForbiddenBanner(false)
        } else {
          setAuthState(AUTH_STATES.MEMBER)
        }
      } catch (err) {
        if (cancelled) return
        setUser(null)
        if (err instanceof ApiError) {
          setAuthError(`登录检查失败 (${err.status})`)
        } else {
          setAuthError('网络错误,无法检查登录状态')
        }
        setAuthState(AUTH_STATES.ANON)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-clear "saved" pill after a few seconds
  useEffect(() => {
    if (saveStatus.status !== 'saved') return undefined
    const t = setTimeout(() => {
      setSaveStatus((cur) => (cur.status === 'saved' ? { status: 'idle' } : cur))
    }, SAVED_BANNER_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [saveStatus])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      // ignore — we'll re-check anyway
    }
    setUser(null)
    setAuthState(AUTH_STATES.ANON)
    setExpiredBanner(false)
    setForbiddenBanner(false)
    setActiveKey(DEFAULT_VIEW)
    setSaveStatus({ status: 'idle' })
  }, [])

  const handleAuthExpired = useCallback(async () => {
    setExpiredBanner(true)
    setForbiddenBanner(false)
    setUser(null)
    setAuthState(AUTH_STATES.ANON)
    setSaveStatus({ status: 'idle' })
    // Best-effort logout to clear the cookie server-side
    try {
      await logout()
    } catch {
      /* ignore */
    }
  }, [])

  const handleForbidden = useCallback(() => {
    setForbiddenBanner(true)
    setAuthState(AUTH_STATES.MEMBER)
  }, [])

  function handleSelect(key) {
    if (!isValidNavKey(key)) return
    setActiveKey(key)
    setSaveStatus({ status: 'idle' })
  }

  if (authState === AUTH_STATES.CHECKING) {
    return (
      <div className="admin-shell">
        <main className="admin-content" aria-busy="true">
          <p className="admin-editor-loading">加载中…</p>
        </main>
      </div>
    )
  }

  if (authState === AUTH_STATES.ANON) {
    return (
      <>
        {authError && (
          <div className="admin-login-banner" role="alert">
            {authError}
          </div>
        )}
        <AdminLogin
          expiredBanner={expiredBanner}
          forbiddenBanner={forbiddenBanner}
        />
      </>
    )
  }

  if (authState === AUTH_STATES.MEMBER) {
    return (
      <div className="admin-shell admin-shell-member">
        <main className="admin-content">
          <section className="admin-editor">
            <header className="admin-editor-header">
              <h2>需要管理员权限</h2>
            </header>
            <p>当前账号 ({user?.github_login}) 没有编辑权限。</p>
            <p>请联系管理员获取权限,或切换至授权账号。</p>
            <button
              type="button"
              className="admin-editor-btn"
              onClick={handleLogout}
            >
              登出
            </button>
          </section>
        </main>
      </div>
    )
  }

  // ADMIN
  const showSettings = activeKey === SETTINGS_KEY
  const showSiteSettings = activeKey === SITE_SETTINGS_KEY
  const showGallery = activeKey === GALLERY_KEY
  const showEditor = !showSettings && !showSiteSettings && !showGallery
  return (
    <div className="admin-shell">
      <AdminNav
        activeKey={activeKey}
        onSelect={handleSelect}
        onSignOut={handleLogout}
        items={navItems()}
      />
      <div className="admin-main-column">
        <AdminTopBar
          schemaKey={showEditor ? activeKey : null}
          editing={null}
          saveStatus={saveStatus}
          openPR={null}
        />
        <main className="admin-content" key={activeKey}>
          {showSettings ? (
            <AdminSettings
              onAuthExpired={handleAuthExpired}
              onForbidden={handleForbidden}
            />
          ) : showSiteSettings ? (
            <SiteSettingsTab
              onAuthExpired={handleAuthExpired}
              onForbidden={handleForbidden}
            />
          ) : showGallery ? (
            <GalleryTab
              onAuthExpired={handleAuthExpired}
              onForbidden={handleForbidden}
            />
          ) : (
            <AdminEditor
              schemaKey={activeKey}
              onAuthExpired={handleAuthExpired}
              onForbidden={handleForbidden}
              onSaveStatus={setSaveStatus}
            />
          )}
        </main>
      </div>
    </div>
  )
}
