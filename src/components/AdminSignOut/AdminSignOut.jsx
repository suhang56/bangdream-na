import { useState } from 'react'
import './AdminSignOut.css'

/**
 * Sign-out button for the admin top bar.
 *
 * @param {object} props
 * @param {() => void} props.onSignOut
 * @param {boolean} [props.confirm] - when true, requires a confirmation tap before triggering
 * @param {string} [props.label] - override default Chinese label (default: 登出)
 */
export default function AdminSignOut({
  onSignOut,
  confirm = false,
  label = '登出',
}) {
  const [confirming, setConfirming] = useState(false)

  function handleClick() {
    if (!confirm) {
      onSignOut?.()
      return
    }
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    onSignOut?.()
  }

  function handleCancel() {
    setConfirming(false)
  }

  if (confirm && confirming) {
    return (
      <span className="admin-signout-confirm" role="group" aria-label="确认登出">
        <button
          type="button"
          className="admin-signout-btn admin-signout-btn-danger"
          onClick={handleClick}
        >
          确认登出
        </button>
        <button
          type="button"
          className="admin-signout-btn admin-signout-btn-cancel"
          onClick={handleCancel}
        >
          取消
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      className="admin-signout-btn"
      onClick={handleClick}
    >
      {label}
    </button>
  )
}
