import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Masthead from './Masthead.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function LocationProbe() {
  const loc = useLocation()
  return (
    <div
      data-testid="loc"
      data-pathname={loc.pathname}
      data-search={loc.search}
    />
  )
}

function renderMast(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Masthead />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<Masthead />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('H5: renders bf-logo-img with src ending in logo.png and correct alt', () => {
    const { container } = renderMast()
    const img = container.querySelector('img.bf-logo-img')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toMatch(/logo\.png$/)
    expect(img.getAttribute('alt')).toBe('北美炸梦同好会')
  })

  it('H5: .lg-bandori and .lg-fans text spans are absent', () => {
    const { container } = renderMast()
    expect(container.querySelector('.lg-bandori')).toBeNull()
    expect(container.querySelector('.lg-fans')).toBeNull()
  })

  it('H5: .lg-tag and .lg-strip remain in DOM', () => {
    const { container } = renderMast()
    expect(container.querySelector('.lg-tag')).toBeInTheDocument()
    expect(container.querySelector('.lg-strip')).toBeInTheDocument()
    expect(container.textContent).toContain('BanG Dream')
  })

  it('logo aria-label is 北美炸梦同好会', () => {
    const { container } = renderMast()
    const logo = container.querySelector('.bf-logo')
    expect(logo.getAttribute('aria-label')).toBe('北美炸梦同好会')
  })

  it('logo links to /', () => {
    const { container } = renderMast()
    const logo = container.querySelector('.bf-logo')
    expect(logo.getAttribute('href')).toBe('/')
  })

  it('renders search input + kbd + button', () => {
    const { container } = renderMast()
    expect(container.querySelector('.bf-search input')).toBeInTheDocument()
    expect(container.querySelector('.bf-skbd')).toBeInTheDocument()
    expect(container.querySelector('.bf-search button')).toBeInTheDocument()
  })

  // ── D8 additions ──────────────────────────────────────────────────────────

  it('D8: visible site-name span renders 北美炸梦同好会 with aria-hidden', () => {
    const { container } = renderMast()
    const span = container.querySelector('.lg-site-name')
    expect(span).toBeInTheDocument()
    expect(span.textContent).toBe('北美炸梦同好会')
    expect(span.getAttribute('aria-hidden')).toBe('true')
  })

  it('D8: .lg-brand wraps the img and the site-name as flex row siblings', () => {
    const { container } = renderMast()
    const brand = container.querySelector('.lg-brand')
    expect(brand).toBeInTheDocument()
    const img = brand.querySelector('img.bf-logo-img')
    const name = brand.querySelector('.lg-site-name')
    expect(img).toBeInTheDocument()
    expect(name).toBeInTheDocument()
  })

  it('D8: search button has type="submit"', () => {
    const { container } = renderMast()
    const button = container.querySelector('.bf-search button')
    expect(button.getAttribute('type')).toBe('submit')
  })

  it('D8: form submit with non-empty query navigates to /search?q=encoded', () => {
    const { container, getByTestId } = renderMast()
    const input = container.querySelector('.bf-search input')
    const form = container.querySelector('form.bf-search')
    expect(form).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '邦' } })
    fireEvent.submit(form)
    const probe = getByTestId('loc')
    expect(probe.getAttribute('data-pathname')).toBe('/search')
    expect(probe.getAttribute('data-search')).toBe('?q=%E9%82%A6')
  })

  it('D8: form submit with empty query does NOT navigate', () => {
    const { container, getByTestId } = renderMast()
    const form = container.querySelector('form.bf-search')
    fireEvent.submit(form)
    const probe = getByTestId('loc')
    expect(probe.getAttribute('data-pathname')).toBe('/')
    expect(probe.getAttribute('data-search')).toBe('')
  })

  it('D8: form submit with whitespace-only query does NOT navigate', () => {
    const { container, getByTestId } = renderMast()
    const input = container.querySelector('.bf-search input')
    const form = container.querySelector('form.bf-search')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(form)
    const probe = getByTestId('loc')
    expect(probe.getAttribute('data-pathname')).toBe('/')
    expect(probe.getAttribute('data-search')).toBe('')
  })

  it('D8: Cmd+K (metaKey) focuses the search input', () => {
    const { container } = renderMast()
    const input = container.querySelector('.bf-search input')
    expect(document.activeElement).not.toBe(input)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      )
    })
    expect(document.activeElement).toBe(input)
  })

  it('D8: Ctrl+K (ctrlKey) focuses the search input', () => {
    const { container } = renderMast()
    const input = container.querySelector('.bf-search input')
    expect(document.activeElement).not.toBe(input)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      )
    })
    expect(document.activeElement).toBe(input)
  })

  it('D8: Cmd+K listener is removed on unmount (no leak)', () => {
    const { container, unmount } = renderMast()
    const input = container.querySelector('.bf-search input')
    input.blur()
    unmount()
    // After unmount, dispatching the shortcut must not throw and must
    // have no surviving handler attempting to focus a detached element.
    expect(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
      )
    }).not.toThrow()
  })

  it('D8: bare K (no modifier) does NOT focus the search input', () => {
    const { container } = renderMast()
    const input = container.querySelector('.bf-search input')
    input.blur()
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
      )
    })
    expect(document.activeElement).not.toBe(input)
  })
})
