import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import {
  ApiError,
  getAdminSetting,
  putAdminSetting,
  testAdminWebhook,
} from '../../lib/api.js'

const WEBHOOK_KEY = 'webhook.comment.url'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

/**
 * Admin "Settings" tab. Currently exposes the comment-webhook URL config
 * + a Test button that fires a sample payload via the Worker.
 *
 * Props:
 *   onAuthExpired?: () => void
 *   onForbidden?: () => void
 */
export default function AdminSettings({ onAuthExpired, onForbidden }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('')
  const [savingStatus, setSavingStatus] = useState('idle') // idle|saving|saved|error
  const [savingError, setSavingError] = useState(null)
  const [testStatus, setTestStatus] = useState('idle') // idle|testing|sent|error
  const [testError, setTestError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getAdminSetting(WEBHOOK_KEY)
      .then((row) => {
        if (cancelled) return
        setValue(row?.value ?? '')
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          if (err.status === 401) onAuthExpired?.()
          else if (err.status === 403) onForbidden?.()
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onAuthExpired, onForbidden])

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
      if (err instanceof ApiError) {
        if (err.status === 401) onAuthExpired?.()
        else if (err.status === 403) onForbidden?.()
      }
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
      if (err instanceof ApiError) {
        if (err.status === 401) onAuthExpired?.()
        else if (err.status === 403) onForbidden?.()
      }
      setTestError(t('admin.settings.webhookTestFail'))
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
    </section>
  )
}
