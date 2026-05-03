import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { next as carouselNext, prev as carouselPrev } from '../../lib/carousel.js'
import { groupEventsByTime, sortEventsByDate } from '../../lib/events.js'
import { formatDate } from '../../lib/dateFormat.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import TypeBadge from '../TypeBadge/TypeBadge.jsx'
import './HeroCarousel.css'

const DEFAULT_INTERVAL_MS = 6000

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function ChevronLeft() {
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function getReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function HeroCarousel({
  events,
  max = 5,
  intervalMs = DEFAULT_INTERVAL_MS,
  now,
}) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const stableNow = now ?? new Date()
  const { upcoming } = groupEventsByTime(
    Array.isArray(events) ? events : [],
    stableNow,
  )
  const slides = sortEventsByDate(upcoming, 'asc').slice(0, max)
  const length = slides.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const rootRef = useRef(null)
  const reducedMotion = getReducedMotion()

  // Keep index in range when slides change
  useEffect(() => {
    if (currentIndex >= length && length > 0) {
      setCurrentIndex(0)
    }
  }, [length, currentIndex])

  // Auto-advance
  useEffect(() => {
    if (length <= 1) return undefined
    if (paused) return undefined
    if (reducedMotion) return undefined
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
    }
  }

  const slide = slides[currentIndex] ?? slides[0]
  const dateStr = formatDate(slide?.date)

  return (
    <div
      ref={rootRef}
      className="hero-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured upcoming events"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKey}
      tabIndex={0}
    >
      <div
        className="hero-carousel__slide card-thumb-16-9"
        style={
          slide?.image
            ? { backgroundImage: `url(${slide.image})` }
            : undefined
        }
        aria-live="polite"
      >
        <div className="hero-carousel__overlay" aria-hidden="true" />
        <div className="hero-carousel__type">
          <TypeBadge type={slide?.type} />
        </div>
        <div className="hero-carousel__caption">
          {dateStr ? (
            <p className="hero-carousel__meta">
              <time dateTime={slide.date}>{dateStr}</time>
              {slide?.location ? (
                <span className="hero-carousel__location">
                  {' · '}
                  {slide.location}
                </span>
              ) : null}
            </p>
          ) : null}
          <h3 className="hero-carousel__title">{slide?.title ?? ''}</h3>
        </div>
      </div>
      {length > 1 ? (
        <>
          <button
            type="button"
            className="hero-carousel__nav hero-carousel__nav--prev"
            aria-label={t('btn.prevEvent')}
            onClick={() =>
              setCurrentIndex((idx) => carouselPrev(idx, length))
            }
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="hero-carousel__nav hero-carousel__nav--next"
            aria-label={t('btn.nextEvent')}
            onClick={() =>
              setCurrentIndex((idx) => carouselNext(idx, length))
            }
          >
            <ChevronRight />
          </button>
          <div className="hero-carousel__dots" role="tablist">
            {slides.map((s, i) => (
              <button
                type="button"
                key={s.id ?? i}
                className={
                  'hero-carousel__dot' +
                  (i === currentIndex ? ' hero-carousel__dot--active' : '')
                }
                role="tab"
                aria-label={t('btn.goToSlide', { n: i + 1 })}
                aria-selected={i === currentIndex}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
