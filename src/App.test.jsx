import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'
import site from './data/site.json'

describe('<App />', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Reset URL between tests so BrowserRouter starts at /
    window.history.replaceState(null, '', '/')
  })

  it('renders Navbar + Home + Footer at "/"', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityName }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument()
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })

  it('renders Events page when initial pathname is /events', () => {
    window.history.replaceState(null, '', '/events')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
  })

  it('renders Members page when initial pathname is /members', () => {
    window.history.replaceState(null, '', '/members')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
  })
})
