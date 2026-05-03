import { useEffect, useId, useRef, useState } from 'react'
import { themes, themeOrder } from '../../theme/themes.js'
import { useTheme } from '../../theme/useTheme.js'
import './ThemeSwitcher.css'

function PaletteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8" cy="9" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function ThemeSwitcher() {
  const { themeKey, theme, setThemeKey } = useTheme()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const popoverId = useId()

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

  function handleSelect(key) {
    setThemeKey(key)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="theme-switcher">
      <button
        ref={triggerRef}
        type="button"
        className="theme-switcher-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label="Choose theme"
        onClick={() => setOpen((prev) => !prev)}
      >
        <PaletteIcon />
      </button>
      {open ? (
        <div
          id={popoverId}
          ref={popoverRef}
          className="theme-switcher-popover"
          role="dialog"
          aria-label="Theme picker"
        >
          <div className="theme-switcher-grid">
            {themeOrder.map((key) => {
              const t = themes[key]
              const isActive = key === themeKey
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    'theme-swatch' + (isActive ? ' theme-swatch--active' : '')
                  }
                  style={{ background: t.tokens['--gradient-hero'] }}
                  aria-label={`${t.name} theme`}
                  aria-pressed={isActive}
                  onClick={() => handleSelect(key)}
                />
              )
            })}
          </div>
          <div className="theme-switcher-label">{theme.name}</div>
        </div>
      ) : null}
    </div>
  )
}
