import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import {
  ApiError,
  adminListSettings,
  getAdminSetting,
  putAdminSetting,
  testAdminWebhook,
} from '../../lib/api.js'

const WEBHOOK_KEY = 'webhook.comment.url'
const SITE_PREFIX = 'site.'

// Default keys the admin sees even when the row doesn't exist yet, so the
// UI is discoverable rather than empty.
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
 * Admin "Settings" tab. Combines the comment-webhook URL config with
 * inline editors for `site.*` settings rows.
 *
 * Props:
 *   onAuthExpired?: () => void
 *   onForbidden?: () => void
 */
export default function AdminSettings({ onAuthExpired, onForbidden }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('')
  const [savingStatus, setSavingStatus] = useState('idle')
  const [savingError, setSavingError] = useState(null)
  const [testStatus, setTestStatus] = useState('idle')
  const [testError, setTestError] = useState(null)

  // Site settings — keyed by full key (e.g. 'site.communityName').
  const [siteValues, setSiteValues] = useState(() => {
    const seed = {}
    for (const k of SITE_KEY_TEMPLATE) seed[k] = ''
    return seed
  })
  const [siteSaveStatus, setSiteSaveStatus] = useState({}) // key → 'saving'|'saved'|'error'
  const [siteError, setSiteError] = useState(null)

  function handleAuthError(err) {
    if (err instanceof ApiError) {
      if (err.status === 401) onAuthExpired?.()
      else if (err.status === 403) onForbidden?.()
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getAdminSetting(WEBHOOK_KEY),
      adminListSettings(SITE_PREFIX),
    ])
      .then(([webhookRow, siteList]) => {
        if (cancelled) return
        setValue(webhookRow?.value ?? '')
        const next = {}
        for (const k of SITE_KEY_TEMPLATE) next[k] = ''
        const items = Array.isArray(siteList?.items) ? siteList.items : []
        for (const row of items) {
          if (typeof row?.key === 'string') next[row.key] = row.value ?? ''
        }
        setSiteValues(next)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        handleAuthError(err)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // onAuthExpired/onForbidden are stable callbacks from parent (useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (savingStatus === 'saving') return
    setSavingStatus('saving')
    setSavingError(null)
    try {
      await putAdminSetting(WEBHOOK_KEY, value)
      setSavingStatus('saved')
      window.setTimeout(() => {
        setSavingStatus((cur) => (cur === 'saved' ? 'idle' : cur))
      }, 3000)
    } catch (err) {
      setSavingStatus('error')
      handleAuthError(err)
      setSavingError(t('admin.settings.webhookSaveFailed'))
    }
  }

  async function handleTest() {
    if (testStatus === 'testing') return
    setTestStatus('testing')
    setTestError(null)
    try {
      await testAdminWebhook()
      setTestStatus('sent')
      window.setTimeout(() => {
        setTestStatus((cur) => (cur === 'sent' ? 'idle' : cur))
      }, 3000)
    } catch (err) {
      setTestStatus('error')
      handleAuthError(err)
      setTestError(t('admin.settings.webhookTestFail'))
    }
  }

  async function handleSaveSite(key) {
    setSiteError(null)
    setSiteSaveStatus((cur) => ({ ...cur, [key]: 'saving' }))
    try {
      await putAdminSetting(key, siteValues[key] ?? '')
      setSiteSaveStatus((cur) => ({ ...cur, [key]: 'saved' }))
      window.setTimeout(() => {
        setSiteSaveStatus((cur) =>
          cur[key] === 'saved' ? { ...cur, [key]: 'idle' } : cur,
        )
      }, 3000)
    } catch (err) {
      setSiteSaveStatus((cur) => ({ ...cur, [key]: 'error' }))
      handleAuthError(err)
      setSiteError(t('admin.settings.siteSaveFailed') || 'Save failed / 保存失败')
    }
  }

  return (
    <section className="admin-settings" aria-labelledby="admin-settings-title">
      <header className="admin-settings__header">
        <h2 id="admin-settings-title" className="admin-settings__title">
          {t('admin.settings.tabTitle')}
        </h2>
      </header>
      <form className="admin-settings__form" onSubmit={handleSave}>
        <label className="admin-settings__label" htmlFor="webhook-url-input">
          {t('admin.settings.webhook')}
        </label>
        <input
          id="webhook-url-input"
          type="url"
          className="admin-settings__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
          disabled={loading || savingStatus === 'saving'}
          autoComplete="off"
          spellCheck="false"
        />
        <p className="admin-settings__hint">
          {t('admin.settings.webhookHint')}
        </p>
        <div className="admin-settings__actions">
          <button
            type="submit"
            className="admin-settings__btn"
            disabled={loading || savingStatus === 'saving'}
          >
            {savingStatus === 'saving'
              ? t('admin.settings.webhookSaving')
              : t('admin.settings.webhookSave')}
          </button>
          <button
            type="button"
            className="admin-settings__btn admin-settings__btn--secondary"
            onClick={handleTest}
            disabled={loading || testStatus === 'testing' || value.trim().length === 0}
          >
            {testStatus === 'testing'
              ? t('admin.settings.webhookTesting')
              : t('admin.settings.webhookTest')}
          </button>
          {savingStatus === 'saved' ? (
            <span className="admin-settings__status admin-settings__status--ok">
              {t('admin.settings.webhookSaved')}
            </span>
          ) : null}
          {testStatus === 'sent' ? (
            <span className="admin-settings__status admin-settings__status--ok">
              {t('admin.settings.webhookTestSuccess')}
            </span>
          ) : null}
        </div>
        {savingError ? (
          <p className="admin-settings__error" role="alert">
            {savingError}
          </p>
        ) : null}
        {testError ? (
          <p className="admin-settings__error" role="alert">
            {testError}
          </p>
        ) : null}
      </form>

      <section
        className="admin-settings__form admin-settings__site"
        aria-labelledby="admin-site-settings-title"
      >
        <h3
          id="admin-site-settings-title"
          className="admin-settings__label"
          style={{ marginTop: '2rem' }}
        >
          {t('admin.settings.siteHeading') || '站点信息 / Site metadata'}
        </h3>
        <p className="admin-settings__hint">
          {t('admin.settings.siteHint') ||
            '社区名称、Discord 邀请等。每行一个 key,保存后立即生效 (15s 缓存)。'}
        </p>
        {SITE_KEY_TEMPLATE.map((key) => {
          const status = siteSaveStatus[key]
          return (
            <div key={key} className="admin-settings__row" style={{ marginBottom: '0.5rem' }}>
              <label className="admin-settings__label" htmlFor={`site-${key}`}>
                <code>{key}</code>
              </label>
              <input
                id={`site-${key}`}
                type="text"
                className="admin-settings__input"
                value={siteValues[key] ?? ''}
                onChange={(e) =>
                  setSiteValues((cur) => ({ ...cur, [key]: e.target.value }))
                }
                disabled={loading || status === 'saving'}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="admin-settings__btn"
                onClick={() => handleSaveSite(key)}
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
          )
        })}
        {siteError ? (
          <p className="admin-settings__error" role="alert">
            {siteError}
          </p>
        ) : null}
      </section>
    </section>
  )
}
