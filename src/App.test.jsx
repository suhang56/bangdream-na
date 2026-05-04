import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'
import site from './data/site.json'
import { _resetForTests, setLanguage } from './lib/uiLanguage.js'
import * as api from './lib/api.js'

describe('<App />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    window.history.replaceState(null, '', '/')
    vi.spyOn(api, 'fetchMe').mockResolvedValue(null)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders Navbar + Home + Footer at "/"', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityNameZh }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /primary/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })

  it('renders Events page when initial pathname is /events', () => {
    window.history.replaceState(null, '', '/events')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('renders Members page when initial pathname is /members', () => {
    window.history.replaceState(null, '', '/members')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Members' }),
    ).toBeInTheDocument()
  })

  it('renders News page when initial pathname is /news', () => {
    window.history.replaceState(null, '', '/news')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /news|新闻/i }),
    ).toBeInTheDocument()
  })

  it('renders About page when initial pathname is /about', () => {
    window.history.replaceState(null, '', '/about')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityNameZh }),
    ).toBeInTheDocument()
  })

  it('renders Admin without public Navbar/Footer when pathname is /admin', async () => {
    window.history.replaceState(null, '', '/admin')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    // Admin OAuth login is shown after fetchMe resolves null
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
    // Public-site navbar (with primary nav role) is NOT in DOM on /admin
    expect(screen.queryByRole('navigation', { name: /primary/i })).toBeNull()
    // Footer copy ("not affiliated") is NOT in DOM on /admin
    expect(screen.queryByText(/not affiliated/i)).toBeNull()
  })
})
