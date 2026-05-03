import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  next as carouselNext,
  prev as carouselPrev,
} from '../../lib/carousel.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import PostCard from '../PostCard/PostCard.jsx'
import './HeroPeekCarousel.css'

const DEFAULT_INTERVAL_MS = 6000

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function getReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export default function HeroPeekCarousel({
  posts,
  intervalMs = DEFAULT_INTERVAL_MS,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const slides = Array.isArray(posts) ? posts : []
  const length = slides.length

  const [rawIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = getReducedMotion()
  const touchTimerRef = useRef(null)

  const currentIndex = length > 0 ? rawIndex % length : 0

  // Auto-advance
  useEffect(() => {
    if (length <= 1) return undefined
    if (paused) return undefined
    if (reducedMotion) return undefined
    if (typeof intervalMs !== 'number' || intervalMs <= 0) return undefined
    const id = setInterval(() => {
      setCurrentIndex((idx) => carouselNext(idx, length))
    }, intervalMs)
    return () => clearInterval(id)
  }, [length, paused, reducedMotion, intervalMs])

  // Pause when document hidden
  useEffect(() => {
    function onVis() {
      setPaused(document.hidden)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Cleanup any pending touch unpause timer on unmount
  useEffect(() => {
    return () => {
      if (touchTimerRef.current !== null) {
        clearTimeout(touchTimerRef.current)
      }
    }
  }, [])

  if (length === 0) return null

  function go(nextIdx) {
    setCurrentIndex(((nextIdx % length) + length) % length)
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setCurrentIndex((idx) => carouselPrev(idx, length))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setCurrentIndex((idx) => carouselNext(idx, length))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCurrentIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCurrentIndex(length - 1)
    }
  }

  function onTouchStart() {
    setPaused(true)
    if (touchTimerRef.current !== null) {
      clearTimeout(touchTimerRef.current)
    }
    touchTimerRef.current = setTimeout(() => {
      setPaused(false)
      touchTimerRef.current = null
    }, 5000)
  }

  // Single-post simple render — no peeks, arrows, thumbs, auto-rotate, region.
  if (length === 1) {
    return (
      <figure className="hero-peek hero-peek--solo">
        <PostCard post={slides[0]} position={1} variant="center" />
      </figure>
    )
  }

  const prevIdx = (currentIndex - 1 + length) % length
  const nextIdx = (currentIndex + 1) % length
  const center = slides[currentIndex]
  const liveText = t('btn.goToPost', { n: currentIndex + 1 })

  return (
    <section
      className="hero-peek"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('peek.label')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onKeyDown={onKey}
      tabIndex={0}
      data-reduced-motion={reducedMotion ? 'true' : undefined}
    >
      <div className="hero-peek__viewport">
        <div className="hero-peek__slot hero-peek__slot--left" aria-hidden="true">
          <PostCard post={slides[prevIdx]} position={prevIdx + 1} variant="side" />
        </div>
        <div className="hero-peek__slot hero-peek__slot--center" aria-live="polite">
          <PostCard post={center} position={currentIndex + 1} variant="center" />
          <span className="visually-hidden">{liveText}</span>
        </div>
        <div className="hero-peek__slot hero-peek__slot--right" aria-hidden="true">
          <PostCard post={slides[nextIdx]} position={nextIdx + 1} variant="side" />
        </div>
        <button
          type="button"
          className="hero-peek__nav hero-peek__nav--prev"
          aria-label={t('btn.prevPost')}
          onClick={() =>
            setCurrentIndex((idx) => carouselPrev(idx, length))
          }
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          className="hero-peek__nav hero-peek__nav--next"
          aria-label={t('btn.nextPost')}
          onClick={() =>
            setCurrentIndex((idx) => carouselNext(idx, length))
          }
        >
          <ChevronRight />
        </button>
      </div>
      <ul className="hero-peek__thumbs" role="tablist">
        {slides.map((s, i) => (
          <li key={s.id ?? i}>
            <button
              type="button"
              role="tab"
              className={
                'hero-peek__thumb' +
                (i === currentIndex ? ' hero-peek__thumb--active' : '')
              }
              aria-label={t('btn.goToPost', { n: i + 1 })}
              aria-selected={i === currentIndex}
              tabIndex={i === currentIndex ? 0 : -1}
              onClick={() => go(i)}
            >
              {typeof s.image === 'string' && s.image.length > 0 ? (
                <img
                  src={s.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="hero-peek__thumb-img"
                />
              ) : (
                <span className="hero-peek__thumb-letter">
                  {(s.title?.[0] || s.id?.[0] || '?').toString()}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
