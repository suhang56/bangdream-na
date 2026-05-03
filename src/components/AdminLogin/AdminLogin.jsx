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
      setError('请粘贴 Personal Access Token。')
      return
    }
    setError('')
    try {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, trimmed)
    } catch {
      setError('无法在当前浏览器存储 Token。')
      return
    }
    setValue('')
    onLogin?.(trimmed)
  }

  return (
    <div className="admin-login">
      <div className="admin-login-box">
        <h1 className="admin-login-title">BD!NA 后台</h1>
        <p className="admin-login-sub">输入 GitHub Personal Access Token 以继续。</p>

        {expiredBanner && (
          <div className="admin-login-banner" role="status" aria-live="polite">
            Token 已过期或被撤销，请重新登录。
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
          <button type="submit" className="admin-login-button">登录</button>
        </form>

        <details className="admin-login-help">
          <summary>如何获取 Token？</summary>
          <ol>
            <li>进入 GitHub &rarr; Settings &rarr; Developer settings。</li>
            <li>选择 Personal access tokens (classic) &rarr; Generate new token。</li>
            <li>
              勾选 <strong>repo</strong> 权限范围（完整的私有仓库访问权限 &mdash;
              后台需要提交内容并上传文件）。
            </li>
            <li>复制 Token（以 <code>ghp_</code> 开头）并粘贴到上方输入框。</li>
            <li>Token 仅保存在当前浏览器的 sessionStorage 中，关闭标签页后清除。</li>
            <li>
              如发现泄露请立即在 GitHub Settings &rarr; Developer settings &rarr; Tokens
              中删除并重新生成。
            </li>
          </ol>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-login-link"
          >
            打开 GitHub Tokens 页面 ↗
          </a>
        </details>
      </div>
    </div>
  )
}
