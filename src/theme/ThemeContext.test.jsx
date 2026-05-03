import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider } from './ThemeContext.jsx'
import { STORAGE_KEY } from './themeContextValue.js'
import { useTheme } from './useTheme.js'
import { themes } from './themes.js'

function Probe() {
  const { themeKey, theme, setThemeKey } = useTheme()
  return (
    <div>
      <span data-testid="key">{themeKey}</span>
      <span data-testid="name">{theme.name}</span>
      <button type="button" onClick={() => setThemeKey('roselia')}>roselia</button>
      <button type="button" onClick={() => setThemeKey('popipa')}>popipa</button>
      <button type="button" onClick={() => setThemeKey('not-real')}>bad</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('style')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to neutral when no stored value', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('neutral')
    expect(screen.getByTestId('name').textContent).toBe('Neutral')
  })

  it('reads valid theme from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, 'roselia')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('roselia')
  })

  it('falls back to neutral when stored key is invalid (edge: corrupted)', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-real-band')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('neutral')
  })

  it('falls back to neutral when stored value is junk JSON (edge: corrupted)', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ broken json !!')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('neutral')
  })

  it('falls back to neutral when localStorage.getItem throws (edge: private mode)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError')
      })
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('neutral')
    spy.mockRestore()
  })

  it('applies CSS custom props to :root on mount', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      themes.neutral.tokens['--color-primary'],
    )
  })

  it('updates :root vars on setThemeKey', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    act(() => {
      screen.getByText('roselia').click()
    })
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      themes.roselia.tokens['--color-primary'],
    )
  })

  it('persists theme to localStorage on change', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    act(() => {
      screen.getByText('popipa').click()
    })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('popipa')
  })

  it('silently swallows localStorage.setItem throw (edge: private mode)', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ThemeProvider><Probe /></ThemeProvider>)
    act(() => {
      screen.getByText('roselia').click()
    })
    expect(screen.getByTestId('key').textContent).toBe('roselia')
    expect(errSpy).not.toHaveBeenCalled()
    spy.mockRestore()
    errSpy.mockRestore()
  })

  it('rejects setThemeKey with invalid key, falls back to neutral (edge)', () => {
    window.localStorage.setItem(STORAGE_KEY, 'roselia')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('key').textContent).toBe('roselia')
    act(() => {
      screen.getByText('bad').click()
    })
    expect(screen.getByTestId('key').textContent).toBe('neutral')
  })

  it('setThemeKey to current value does not change reference (immutable check)', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    const before = screen.getByTestId('key').textContent
    const roseliaBtn = screen.getByRole('button', { name: 'roselia' })
    act(() => {
      roseliaBtn.click()
    })
    act(() => {
      roseliaBtn.click()
    })
    expect(screen.getByTestId('key').textContent).toBe('roselia')
    expect(before).toBe('neutral')
  })

  it('useTheme throws outside provider (defensive)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/useTheme must be used inside/)
    errSpy.mockRestore()
  })
})
