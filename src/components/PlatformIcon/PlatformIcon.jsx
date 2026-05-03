import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../../lib/uiLanguage.js'
import './PlatformIcon.css'

function DiscordSvg() {
  return (
    <svg
      className="platform-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.605-.719 1.394-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.17 4.369a.07.07 0 0 0-.032.027C2.498 8.36 1.79 12.246 2.137 16.085a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.027.078.078 0 0 0 .084-.028 14.31 14.31 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.835 19.835 0 0 0 6.002-3.028.077.077 0 0 0 .032-.054c.4-4.397-.713-8.252-3.014-11.689a.061.061 0 0 0-.031-.028zM8.02 13.715c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.978 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  )
}

function QQSvg() {
  return (
    <svg
      className="platform-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5c-3.5 0-6 3-6 6.5 0 1.5.4 2.7 1 3.5l-1.4 2.7c-.3.5.1 1 .7.9l2.5-.5c.9.6 2 1 3.2 1s2.3-.4 3.2-1l2.5.5c.6.1 1-.4.7-.9L17 12.5c.6-.8 1-2 1-3.5 0-3.5-2.5-6.5-6-6.5z" />
      <circle cx="10" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 18v2.5M15 18v2.5" />
    </svg>
  )
}

function XiaohongshuSvg() {
  return (
    <svg
      className="platform-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M12 9.5l-1.2 2.4-2.6.4 1.9 1.8-.4 2.6 2.3-1.2 2.3 1.2-.4-2.6 1.9-1.8-2.6-.4z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function XSvg() {
  return (
    <svg
      className="platform-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function WechatSvg() {
  return (
    <svg
      className="platform-icon-svg"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4.5c-3.6 0-6.5 2.5-6.5 5.7 0 1.7.8 3.2 2.1 4.2L4 17l3-1.4c.6.2 1.3.3 2 .3M15 9c-3.3 0-6 2.2-6 5s2.7 5 6 5c.6 0 1.2-.1 1.8-.3l2.7 1.3-.5-2.4c1.1-.9 1.8-2.2 1.8-3.6 0-2.8-2.7-5-5.8-5z" />
      <circle cx="13" cy="14" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

const ICONS = {
  discord: DiscordSvg,
  qq: QQSvg,
  xiaohongshu: XiaohongshuSvg,
  x: XSvg,
  wechat: WechatSvg,
}

function isHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim())
}

export default function PlatformIcon({
  platform,
  label,
  url,
  qrImage,
  enabled,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const popoverId = useId()
  const Icon = ICONS[platform]

  const hasUrl = isHttpsUrl(url)
  const hasQr = typeof qrImage === 'string' && qrImage.length > 0
  const isActive = enabled === true && hasUrl
  const isQr = enabled === true && !hasUrl && hasQr
  const isDisabled = !isActive && !isQr

  useEffect(() => {
    if (!open) return undefined

    function onPointer(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const iconNode = Icon ? <Icon /> : null
  const safeLabel = typeof label === 'string' ? label : platform || ''

  if (isActive) {
    return (
      <a
        className="platform-icon platform-icon--active"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={safeLabel}
        data-platform={platform}
      >
        {iconNode}
        <span className="platform-icon-label">{safeLabel}</span>
      </a>
    )
  }

  if (isQr) {
    return (
      <div className="platform-icon-wrap">
        <button
          ref={triggerRef}
          type="button"
          className="platform-icon platform-icon--qr"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={safeLabel}
          data-platform={platform}
          onClick={() => setOpen((prev) => !prev)}
        >
          {iconNode}
          <span className="platform-icon-label">{safeLabel}</span>
        </button>
        {open ? (
          <div
            id={popoverId}
            ref={popoverRef}
            className="platform-icon-popover"
            role="dialog"
            aria-label={safeLabel + ' QR code'}
          >
            <img
              src={qrImage}
              alt={safeLabel + ' QR code'}
              width="200"
              height="200"
              className="platform-icon-qr-img"
            />
            <p className="platform-icon-qr-caption">
              {t('social.scanCaption', { label: safeLabel })}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <span
      className="platform-icon platform-icon--disabled"
      aria-disabled="true"
      title={t('btn.comingSoon')}
      data-platform={platform}
    >
      {iconNode}
      <span className="platform-icon-label">{safeLabel}</span>
    </span>
  )
}
