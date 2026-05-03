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

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
  }
})
