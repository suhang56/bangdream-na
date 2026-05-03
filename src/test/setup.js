import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

// jsdom does not implement HTMLDialogElement.showModal/close; provide a
// minimal shim so components using native <dialog> can be tested.
if (
  typeof window !== 'undefined' &&
  typeof window.HTMLDialogElement !== 'undefined' &&
  typeof window.HTMLDialogElement.prototype.showModal !== 'function'
) {
  const proto = window.HTMLDialogElement.prototype
  proto.showModal = function showModal() {
    this.setAttribute('open', '')
    this._isModal = true
    if (!this._escapeHandler) {
      this._escapeHandler = (e) => {
        if (e.key === 'Escape' && this.open) {
          e.preventDefault()
          this.close()
        }
      }
      document.addEventListener('keydown', this._escapeHandler)
    }
  }
  proto.show = function show() {
    this.setAttribute('open', '')
  }
  proto.close = function close(returnValue) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    if (typeof returnValue === 'string') this.returnValue = returnValue
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler)
      this._escapeHandler = null
    }
    this.dispatchEvent(new window.Event('close'))
  }
}

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  }
})
