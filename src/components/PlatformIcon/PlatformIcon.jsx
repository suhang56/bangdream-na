import { useEffect, useId, useRef, useState } from 'react'
import { t } from '../../lib/uiLanguage.js'
import {
  DiscordSvg,
  QQSvg,
  XiaohongshuSvg,
  XSvg,
  WechatSvg,
} from './icons.jsx'
import './PlatformIcon.css'

function PlatformGlyph({ platform }) {
  switch (platform) {
    case 'discord':
      return <DiscordSvg />
    case 'qq':
      return <QQSvg />
    case 'xiaohongshu':
      return <XiaohongshuSvg />
    case 'x':
      return <XSvg />
    case 'wechat':
      return <WechatSvg />
    default:
      return null
  }
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

  const hasUrl = isHttpsUrl(url)
  const hasQr = typeof qrImage === 'string' && qrImage.length > 0
  const isActive = enabled === true && hasUrl
  const isQr = enabled === true && !hasUrl && hasQr

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
        <PlatformGlyph platform={platform} />
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
          <PlatformGlyph platform={platform} />
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
      <PlatformGlyph platform={platform} />
      <span className="platform-icon-label">{safeLabel}</span>
    </span>
  )
}
