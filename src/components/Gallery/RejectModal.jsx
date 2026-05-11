import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './RejectModal.css'

const REASON_OPTIONS = [
  { value: 'community', labelKey: 'admin.gallery.review.reject.reason.community' },
  { value: 'duplicate', labelKey: 'admin.gallery.review.reject.reason.duplicate' },
  { value: 'quality', labelKey: 'admin.gallery.review.reject.reason.quality' },
  { value: 'privacy', labelKey: 'admin.gallery.review.reject.reason.privacy' },
  { value: 'other', labelKey: 'admin.gallery.review.reject.reason.other' },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function RejectModal({ open, onCancel, onConfirm, submitting }) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState('')
  const overlayRef = useRef(null)
  const firstBtnRef = useRef(null)

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(null)
      setCustom('')
    } else if (firstBtnRef.current) {
      firstBtnRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (!open) return
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const customRequired = selected === 'other'
  const customValid = !customRequired || (custom.trim().length >= 1 && custom.trim().length <= 200)
  const confirmEnabled = selected !== null && customValid && !submitting

  function getReasonText() {
    if (!selected) return ''
    if (selected === 'other') return `其他: ${custom.trim()}`
    const opt = REASON_OPTIONS.find((o) => o.value === selected)
    return t(opt.labelKey)
  }

  function handleConfirm() {
    if (!confirmEnabled) return
    onConfirm(getReasonText())
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onCancel()
  }

  return (
    <div
      className="reject-modal__overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-heading"
    >
      <div className="reject-modal__card">
        <h2 id="reject-modal-heading" className="reject-modal__heading">
          {t('admin.gallery.review.reject.heading')}
        </h2>
        <p className="reject-modal__sub">
          {t('admin.gallery.review.reject.subhead')}
        </p>
        <fieldset className="reject-modal__reasons">
          <legend className="sr-only">
            {t('admin.gallery.review.reject.subhead')}
          </legend>
          {REASON_OPTIONS.map((opt, idx) => (
            <label key={opt.value} className="reject-modal__reason">
              <input
                ref={idx === 0 ? firstBtnRef : null}
                type="radio"
                name="reject-reason"
                value={opt.value}
                checked={selected === opt.value}
                onChange={() => setSelected(opt.value)}
                data-testid={`rm-reason-${opt.value}`}
              />
              <span>{t(opt.labelKey)}</span>
            </label>
          ))}
        </fieldset>
        {selected === 'other' ? (
          <textarea
            className="reject-modal__custom"
            placeholder={t('admin.gallery.review.reject.customPlaceholder')}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            rows={3}
            maxLength={200}
            data-testid="rm-custom"
          />
        ) : null}
        <div className="reject-modal__footer">
          <button
            type="button"
            className="reject-modal__btn reject-modal__btn--cancel"
            onClick={onCancel}
            data-testid="rm-cancel"
          >
            {t('admin.gallery.review.reject.cancel')}
          </button>
          <button
            type="button"
            className="reject-modal__btn reject-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!confirmEnabled}
            data-testid="rm-confirm"
          >
            {submitting
              ? t('admin.gallery.review.rejecting')
              : t('admin.gallery.review.reject.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
