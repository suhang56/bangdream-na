import { useEffect, useRef, useState } from 'react'
import './StatNumber.css'

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export default function StatNumber({
  value,
  suffix = '',
  durationMs = 1400,
  className = '',
}) {
  const safeTarget =
    typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : 0
  const [display, setDisplay] = useState(0)
  const reducedMotion = useRef(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    reducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reducedMotion.current) {
      setDisplay(safeTarget)
      return undefined
    }

    if (startedRef.current) return undefined
    startedRef.current = true

    const start = performance.now()
    let raf = 0

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = easeOutCubic(progress)
      setDisplay(Math.floor(eased * safeTarget))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(safeTarget)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [safeTarget, durationMs])

  return (
    <span
      className={'stat-number ' + className}
      aria-label={String(safeTarget) + suffix}
    >
      <span aria-hidden="true">{display}</span>
      <span aria-hidden="true">{suffix}</span>
    </span>
  )
}
