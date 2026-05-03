import { useState, useId } from 'react'
import './AdminLogin.css'

export const TOKEN_STORAGE_KEY = 'bangdream-na:gh_token'

export default function AdminLogin({ onLogin, expiredBanner }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()
  const errorId = useId()

  function submit(e) {
    e?.preventDefault?.()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Please paste a Personal Access Token.')
      return
    }
    setError('')
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
    } catch {
      setError('Could not store token in this browser.')
      return
    }
    setValue('')
    onLogin?.(trimmed)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-box">
        <h1 className="admin-login-title">Admin Panel</h1>
        <p className="admin-login-sub">Enter your GitHub Personal Access Token to continue.</p>

        {expiredBanner && (
          <div className="admin-login-banner" role="status" aria-live="polite">
            Your token expired or was revoked. Please sign in again.
          </div>
        )}

        {error && (
          <div className="admin-login-error" id={errorId} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <label className="admin-login-label" htmlFor={inputId}>
            GitHub Personal Access Token
          </label>
          <input
            id={inputId}
            className="admin-login-input"
            type="password"
            autoComplete="off"
            spellCheck="false"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(e) }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            autoFocus
          />
          <button type="submit" className="admin-login-button">Sign In</button>
        </form>

        <details className="admin-login-help">
          <summary>How to get a token?</summary>
          <ol>
            <li>Go to GitHub &rarr; Settings &rarr; Developer settings.</li>
            <li>Personal access tokens (classic) &rarr; Generate new token.</li>
            <li>
              Check the <strong>repo</strong> scope (full control of private repos &mdash;
              required because the admin commits and uploads files).
            </li>
            <li>Copy the token (starts with <code>ghp_</code>) and paste it above.</li>
            <li>The token is stored in your browser&apos;s sessionStorage and cleared when you close the tab.</li>
            <li>
              Rotate immediately if exposed: GitHub Settings &rarr; Developer settings &rarr; Tokens
              &rarr; Delete.
            </li>
          </ol>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-login-link"
          >
            Open GitHub Tokens page
          </a>
        </details>
      </div>
    </div>
  )
}
