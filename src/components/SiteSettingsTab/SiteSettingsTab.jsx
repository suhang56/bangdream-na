import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import {
  ApiError,
  adminListSettings,
  putAdminSetting,
} from '../../lib/api.js'

const SITE_PREFIX = 'site.'

// Default keys the admin sees even when the row doesn't exist yet, so the
// UI is discoverable rather than empty. Order here drives the form order.
const SITE_KEY_TEMPLATE = [
  'site.communityName',
  'site.communityNameZh',
  'site.communityNameJp',
  'site.discordInvite',
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Standalone admin tab for `site.*` key-value settings. Sibling to
 * <AdminSettings /> (webhook). Lives outside d1Schemas because the
 * AdminEditor dispatcher only supports row-CRUD via getD1Schema; KV is a
 * different paradigm and forcing it in would risk a PR-#79-style outage.
 *
 * Loads via GET /api/admin/settings?prefix=site. and saves each key via
 * PUT /api/admin/settings/:key.
 *
 * Props:
 *   onAuthExpired?: () => void
 *   onForbidden?: () => void
 */
export default function SiteSettingsTab({ onAuthExpired, onForbidden }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [values, setValues] = useState(() => {
    const seed = {}
    for (const k of SITE_KEY_TEMPLATE) seed[k] = ''
    return seed
  })
  // Per-key save status: idle | saving | saved | error
  const [saveStatus, setSaveStatus] = useState({})
  const [saveError, setSaveError] = useState(null)

  function handleAuthError(err) {
    if (err instanceof ApiError) {
      if (err.status === 401) onAuthExpired?.()
      else if (err.status === 403) onForbidden?.()
    }
  }

  useEffect(() => {
    let cancelled = false
    adminListSettings(SITE_PREFIX)
      .then((res) => {
        if (cancelled) return
        const next = {}
        for (const k of SITE_KEY_TEMPLATE) next[k] = ''
        const items = Array.isArray(res?.items) ? res.items : []
        for (const row of items) {
          if (typeof row?.key === 'string') next[row.key] = row.value ?? ''
        }
        setValues(next)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        handleAuthError(err)
        setLoadError(err?.message ?? 'load_failed')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // onAuthExpired/onForbidden are stable callbacks from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(key) {
    setSaveError(null)
    setSaveStatus((cur) => ({ ...cur, [key]: 'saving' }))
    try {
      await putAdminSetting(key, values[key] ?? '')
      setSaveStatus((cur) => ({ ...cur, [key]: 'saved' }))
      window.setTimeout(() => {
        setSaveStatus((cur) =>
          cur[key] === 'saved' ? { ...cur, [key]: 'idle' } : cur,
        )
      }, 3000)
    } catch (err) {
      setSaveStatus((cur) => ({ ...cur, [key]: 'error' }))
      handleAuthError(err)
      setSaveError(t('admin.siteSettings.saveFailed') || '保存失败 / Save failed')
    }
  }

  return (
    <section className="admin-settings" aria-labelledby="admin-site-settings-title">
      <header className="admin-settings__header">
        <h2 id="admin-site-settings-title" className="admin-settings__title">
          {t('admin.siteSettings.tabTitle') || '站点信息 / Site metadata'}
        </h2>
      </header>
      <p className="admin-settings__hint">
        {t('admin.siteSettings.hint') ||
          '社区名称、Discord 邀请等。每行一个 key,保存后立即生效 (15s 缓存).'}
      </p>
      {loadError ? (
        <p className="admin-settings__error" role="alert">
          {t('admin.siteSettings.loadFailed') || '加载失败 / Load failed'}
        </p>
      ) : null}
      <form
        className="admin-settings__form admin-site-settings"
        onSubmit={(e) => e.preventDefault()}
      >
        {SITE_KEY_TEMPLATE.map((key) => {
          const status = saveStatus[key]
          const inputId = `site-setting-${key.replace(/\./g, '-')}`
          return (
            <div key={key} className="admin-settings__row admin-site-settings__row">
              <label className="admin-settings__label" htmlFor={inputId}>
                <code>{key}</code>
              </label>
              <input
                id={inputId}
                type="text"
                className="admin-settings__input"
                value={values[key] ?? ''}
                onChange={(e) =>
                  setValues((cur) => ({ ...cur, [key]: e.target.value }))
                }
                disabled={loading || status === 'saving'}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="admin-settings__actions">
                <button
                  type="button"
                  className="admin-settings__btn"
                  onClick={() => handleSave(key)}
                  disabled={loading || status === 'saving'}
                >
                  {status === 'saving'
                    ? t('admin.settings.webhookSaving')
                    : t('admin.settings.webhookSave')}
                </button>
                {status === 'saved' ? (
                  <span className="admin-settings__status admin-settings__status--ok">
                    {t('admin.settings.webhookSaved')}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
        {saveError ? (
          <p className="admin-settings__error" role="alert">
            {saveError}
          </p>
        ) : null}
      </form>
    </section>
  )
}
