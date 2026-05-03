import { useEffect, useId, useRef, useState } from 'react'
import { getPlatformLabel, t } from '../../lib/uiLanguage.js'
import {
  DiscordSvg,
  QQSvg,
  XiaohongshuSvg,
  XSvg,
  WechatSvg,
  ForumSvg,
} from '../PlatformIcon/icons.jsx'
import './PlatformTileRow.css'

const TILE_ICON_PROPS = { size: 28, className: 'platform-tile__icon' }

function PlatformTileGlyph({ platform }) {
  switch (platform) {
    case 'discord':
      return <DiscordSvg {...TILE_ICON_PROPS} />
    case 'qq':
      return <QQSvg {...TILE_ICON_PROPS} />
    case 'xiaohongshu':
      return <XiaohongshuSvg {...TILE_ICON_PROPS} />
    case 'x':
      return <XSvg {...TILE_ICON_PROPS} />
    case 'wechat':
      return <WechatSvg {...TILE_ICON_PROPS} />
    case 'forum':
      return <ForumSvg {...TILE_ICON_PROPS} />
    default:
      return null
  }
}

function isHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url.trim())
}

function PlatformTile({ entry }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const popoverId = useId()

  const platform = entry.platform
  const label = getPlatformLabel(platform, entry.label)
  const hasUrl = isHttpsUrl(entry.url)
  const hasQr = typeof entry.qrImage === 'string' && entry.qrImage.length > 0
  const isActive = entry.enabled === true && hasUrl
  const isQr = entry.enabled === true && !hasUrl && hasQr

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

  if (isActive) {
    return (
      <a
        className="platform-tile platform-tile--active"
        data-platform={platform}
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
      >
        <PlatformTileGlyph platform={platform} />
        <span className="platform-tile__label">{label}</span>
      </a>
    )
  }

  if (isQr) {
    return (
      <div className="platform-tile-wrap">
        <button
          ref={triggerRef}
          type="button"
          className="platform-tile platform-tile--qr"
          data-platform={platform}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={label}
          onClick={() => setOpen((prev) => !prev)}
        >
          <PlatformTileGlyph platform={platform} />
          <span className="platform-tile__label">{label}</span>
        </button>
        {open ? (
          <div
            id={popoverId}
            ref={popoverRef}
            className="platform-tile__popover"
            role="dialog"
            aria-label={label + ' QR code'}
          >
            <img
              src={entry.qrImage}
              alt={label + ' QR code'}
              width="200"
              height="200"
              className="platform-tile__qr-img"
            />
            <p className="platform-tile__qr-caption">
              {t('social.scanCaption', { label })}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <span
      className="platform-tile platform-tile--disabled"
      data-platform={platform}
      aria-disabled="true"
      title={t('btn.comingSoon')}
    >
      <PlatformTileGlyph platform={platform} />
      <span className="platform-tile__label">{label}</span>
    </span>
  )
}

export default function PlatformTileRow({ social }) {
  if (!Array.isArray(social) || social.length === 0) return null
  return (
    <section
      className="platform-tile-row"
      aria-labelledby="platform-tile-row-heading"
    >
      <h2 id="platform-tile-row-heading" className="visually-hidden">
        {t('platforms.heading')}
      </h2>
      <div className="platform-tile-row__track">
        {social.map((entry) => (
          <PlatformTile key={entry.platform} entry={entry} />
        ))}
      </div>
    </section>
  )
}
