import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  fetchEvents,
  submitGalleryPhoto,
} from '../lib/api.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import './GallerySubmit.css'

const MAX_BYTES = 8 * 1024 * 1024
const NICKNAME_MAX = 32
const CAPTION_MAX = 200
const EVENT_LABEL_MAX = 80
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
// HC3: combobox sentinel is the literal string '__custom__' -- never null,
// undefined, or empty string. '' = no-selection placeholder.
const CUSTOM_SENTINEL = '__custom__'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function truncateTitle(s, n) {
  if (typeof s !== 'string') return ''
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function todayPlusOneISO() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function inferErrorMessage(err) {
  if (!(err instanceof ApiError)) {
    return t('gallerySubmit.error.network')
  }
  if (err.status === 429) return t('gallerySubmit.error.rateLimited')
  if (err.status === 413) return t('gallerySubmit.error.tooLarge')
  if (err.status === 415) return t('gallerySubmit.error.formatMismatch')
  if (err.status === 400) {
    if (err.code === 'event_not_found') return t('gallerySubmit.error.eventMissing')
    if (err.code === 'image_dimensions_invalid') return t('gallerySubmit.error.dimensions')
    return err.code === 'bad_request'
      ? t('gallerySubmit.error.server')
      : t('gallerySubmit.error.server')
  }
  return t('gallerySubmit.error.server')
}

export default function GallerySubmit() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [nickname, setNickname] = useState('')
  const [caption, setCaption] = useState('')
  const [events, setEvents] = useState([])
  // eventValue: '' | stringified id | '__custom__'
  const [eventValue, setEventValue] = useState('')
  const [eventLabel, setEventLabel] = useState('')
  const [eventError, setEventError] = useState(null)
  const [takenOn, setTakenOn] = useState('')
  const [terms, setTerms] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [nickError, setNickError] = useState(null)
  const [captionError, setCaptionError] = useState(null)
  const [globalError, setGlobalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const previewUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchEvents({ scope: 'upcoming', limit: 50 })
      .then((res) => {
        if (cancelled) return
        const items = Array.isArray(res?.items) ? res.items : []
        setEvents(items)
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current && typeof URL?.revokeObjectURL === 'function') {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  function validateAndSetFile(next) {
    if (!next) {
      setFile(null)
      setPreviewUrl(null)
      setFileError(null)
      return
    }
    if (!ALLOWED_MIMES.includes(next.type)) {
      setFile(null)
      setPreviewUrl(null)
      setFileError(t('gallerySubmit.error.badType'))
      return
    }
    if (next.size > MAX_BYTES) {
      setFile(null)
      setPreviewUrl(null)
      setFileError(t('gallerySubmit.error.tooLarge'))
      return
    }
    setFileError(null)
    if (previewUrlRef.current && typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const url = typeof URL?.createObjectURL === 'function' ? URL.createObjectURL(next) : null
    previewUrlRef.current = url
    setPreviewUrl(url)
    setFile(next)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) validateAndSetFile(f)
  }
  function onDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave() {
    setDragOver(false)
  }
  function onPickClick() {
    fileInputRef.current?.click()
  }
  function onFileChange(e) {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
    e.target.value = ''
  }
  function onDropzoneKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPickClick()
    }
  }
  function removeFile() {
    if (previewUrlRef.current && typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = null
    setFile(null)
    setPreviewUrl(null)
    setFileError(null)
  }

  function onNicknameChange(e) {
    const v = e.target.value
    setNickname(v)
    if (v.length > NICKNAME_MAX) {
      setNickError(t('gallerySubmit.error.nicknameLong'))
    } else {
      setNickError(null)
    }
  }
  function onCaptionChange(e) {
    const v = e.target.value
    setCaption(v)
    setCaptionError(v.length > CAPTION_MAX ? t('gallerySubmit.error.captionLong') : null)
  }

  function onEventChange(e) {
    const v = e.target.value
    setEventValue(v)
    // Clear free-form on switch-away so we don't ship stale text.
    if (v !== CUSTOM_SENTINEL) setEventLabel('')
    setEventError(null)
  }

  function resetForm() {
    removeFile()
    setNickname('')
    setCaption('')
    setEventValue('')
    setEventLabel('')
    setEventError(null)
    setTakenOn('')
    setTerms(false)
    setFileError(null)
    setNickError(null)
    setCaptionError(null)
    setGlobalError(null)
    setSuccess(false)
  }

  const nickTrimmed = nickname.trim()
  const eventLabelTrimmed = eventLabel.trim()
  const eventValid =
    (eventValue !== '' && eventValue !== CUSTOM_SENTINEL) ||
    (eventValue === CUSTOM_SENTINEL && eventLabelTrimmed.length > 0)

  const formValid =
    !!file &&
    !fileError &&
    nickTrimmed.length > 0 &&
    nickTrimmed.length <= NICKNAME_MAX &&
    !nickError &&
    caption.length <= CAPTION_MAX &&
    !captionError &&
    eventValid &&
    terms

  async function onSubmit(e) {
    e.preventDefault()
    if (submitting) return
    if (!file) {
      setFileError(t('gallerySubmit.error.badType'))
      return
    }
    if (nickTrimmed.length === 0) {
      setNickError(t('gallerySubmit.error.nicknameEmpty'))
      return
    }
    // HC4: client-side mutex/required enforcement mirrors server side.
    if (!eventValid) {
      setEventError(
        eventValue === CUSTOM_SENTINEL
          ? t('gallerySubmit.field.eventCustomEmpty')
          : t('gallerySubmit.field.eventRequired'),
      )
      return
    }
    if (!terms) {
      setGlobalError(t('gallerySubmit.error.termsRequired'))
      return
    }
    setSubmitting(true)
    setGlobalError(null)
    try {
      await submitGalleryPhoto({
        file,
        nickname: nickTrimmed,
        caption: caption.trim() || undefined,
        eventId: eventValue === CUSTOM_SENTINEL ? undefined : (eventValue || undefined),
        eventLabel:
          eventValue === CUSTOM_SENTINEL ? eventLabelTrimmed : undefined,
        takenOn: takenOn || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setGlobalError(inferErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="bf-gallery-submit">
        <section className="bf-page-hero">
          <div className="bf-container">
            <h1 className="bf-page-hero__title">{t('gallerySubmit.success.title')}</h1>
            <p className="bf-page-hero__subtitle">{t('gallerySubmit.success.body')}</p>
          </div>
        </section>
        <section className="bf-container gs-success">
          <div className="gs-success__card">
            <span className="gs-success__icon" aria-hidden="true">✓</span>
            <h2 className="gs-success__title">{t('gallerySubmit.success.title')}</h2>
            <p className="gs-success__body">{t('gallerySubmit.success.body')}</p>
            <div className="gs-success__buttons">
              <button
                type="button"
                className="bf-cta gs-cta"
                onClick={resetForm}
              >
                {t('gallerySubmit.button.again')}
              </button>
              <Link to="/gallery" className="bf-cta-2 gs-cta-2">
                {t('gallerySubmit.button.backGallery')}
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bf-gallery-submit">
      <section className="bf-page-hero">
        <div className="bf-container">
          <h1 className="bf-page-hero__title">{t('gallerySubmit.title')}</h1>
          <p className="bf-page-hero__subtitle">{t('gallerySubmit.subtitle')}</p>
        </div>
      </section>

      <section className="bf-container">
        <form className="gs-form" onSubmit={onSubmit} aria-label={t('gallerySubmit.title')}>
          {globalError ? (
            <div className="gs-global-error" role="alert">
              ⚠ {globalError}
            </div>
          ) : null}

          <div
            className={`gs-dropzone${dragOver ? ' gs-dropzone--over' : ''}${previewUrl ? ' gs-dropzone--filled' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={t('gallerySubmit.dropzone.idle')}
            onClick={previewUrl ? undefined : onPickClick}
            onKeyDown={previewUrl ? undefined : onDropzoneKey}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            data-testid="gs-dropzone"
          >
            {previewUrl ? (
              <div className="gs-preview">
                <img src={previewUrl} alt="" className="gs-preview__img" />
                <div className="gs-preview__meta">
                  <span className="gs-preview__name">{file?.name}</span>
                  <span className="gs-preview__size">
                    {(file?.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div className="gs-preview__actions">
                  <button
                    type="button"
                    className="gs-preview__btn"
                    onClick={onPickClick}
                    aria-label={t('gallerySubmit.dropzone.replace')}
                  >
                    {t('gallerySubmit.dropzone.replace')}
                  </button>
                  <button
                    type="button"
                    className="gs-preview__btn gs-preview__btn--danger"
                    onClick={removeFile}
                    aria-label={t('gallerySubmit.dropzone.remove')}
                  >
                    {t('gallerySubmit.dropzone.remove')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="gs-dropzone__line1">{t('gallerySubmit.dropzone.idle')}</p>
                <p className="gs-dropzone__line2">{t('gallerySubmit.dropzone.hint')}</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={onFileChange}
              data-testid="gs-file-input"
            />
          </div>
          {fileError ? (
            <p className="gs-field-error" role="alert">⚠ {fileError}</p>
          ) : null}

          <label className="gs-field">
            <span className="gs-field__label">
              {t('gallerySubmit.field.nickname')}{' '}
              <span className="gs-field__required" aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              className="gs-input"
              value={nickname}
              onChange={onNicknameChange}
              maxLength={NICKNAME_MAX + 4}
              placeholder={t('gallerySubmit.field.nicknamePlaceholder')}
              data-testid="gs-nickname"
              required
              aria-required="true"
            />
            {nickError ? (
              <span className="gs-field-error" role="alert">⚠ {nickError}</span>
            ) : null}
          </label>

          <label className="gs-field">
            <span className="gs-field__label">
              {t('gallerySubmit.field.event')}{' '}
              <span className="gs-field__required" aria-hidden="true">*</span>
            </span>
            <select
              className="gs-input gs-select"
              value={eventValue}
              onChange={onEventChange}
              aria-required="true"
              data-testid="gs-event"
            >
              <option value="">{t('gallerySubmit.field.eventNone')}</option>
              {events.map((ev) => (
                <option
                  key={ev.id}
                  value={String(ev.id)}
                  title={ev.title_zh || ev.title_en || ev.slug}
                >
                  {truncateTitle(ev.title_zh || ev.title_en || ev.slug, 40)}
                </option>
              ))}
              <option value={CUSTOM_SENTINEL}>
                {t('gallerySubmit.field.eventCustom')}
              </option>
            </select>
            {eventValue === CUSTOM_SENTINEL ? (
              <input
                type="text"
                className="gs-input gs-input--custom-event"
                value={eventLabel}
                onChange={(e) => {
                  setEventLabel(e.target.value)
                  setEventError(null)
                }}
                maxLength={EVENT_LABEL_MAX + 5}
                placeholder={t('gallerySubmit.field.eventCustomPlaceholder')}
                aria-label={t('gallerySubmit.field.eventCustomPlaceholder')}
                data-testid="gs-event-custom"
              />
            ) : null}
            {eventError ? (
              <span className="gs-field-error" role="alert">⚠ {eventError}</span>
            ) : null}
          </label>

          <label className="gs-field">
            <span className="gs-field__label">{t('gallerySubmit.field.takenOn')}</span>
            <input
              type="date"
              className="gs-input"
              value={takenOn}
              onChange={(e) => setTakenOn(e.target.value)}
              max={todayPlusOneISO()}
              data-testid="gs-taken-on"
            />
            <span className="gs-field__helper">
              {t('gallerySubmit.field.takenOnPlaceholder')}
            </span>
          </label>

          <label className="gs-field">
            <span className="gs-field__label">{t('gallerySubmit.field.caption')}</span>
            <textarea
              className="gs-textarea"
              rows={3}
              value={caption}
              onChange={onCaptionChange}
              maxLength={CAPTION_MAX + 10}
              placeholder={t('gallerySubmit.field.captionPlaceholder')}
              data-testid="gs-caption"
            />
            <span
              className={`gs-counter${caption.length > CAPTION_MAX ? ' gs-counter--over' : ''}`}
            >
              {caption.length} / {CAPTION_MAX}
            </span>
            {captionError ? (
              <span className="gs-field-error" role="alert">⚠ {captionError}</span>
            ) : null}
          </label>

          <label className="gs-terms">
            <input
              type="checkbox"
              className="gs-terms__box"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              data-testid="gs-terms"
            />
            <span className="gs-terms__label">{t('gallerySubmit.field.terms')}</span>
          </label>

          <button
            type="submit"
            className="bf-cta gs-submit"
            disabled={!formValid || submitting}
            data-testid="gs-submit"
          >
            {submitting
              ? t('gallerySubmit.button.submitting')
              : t('gallerySubmit.button.submit')}
          </button>
        </form>
      </section>
    </main>
  )
}
