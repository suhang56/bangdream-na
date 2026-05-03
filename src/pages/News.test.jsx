import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

vi.mock('../data/news.json', () => ({
  default: [
    {
      id: 'news-a',
      title: 'Announcement Alpha',
      date: '2026-04-01',
      tag: 'announcement',
      summary: 'Alpha summary line.',
      body: 'Alpha body.',
      image: 'https://cdn.example.com/a.jpg',
    },
    {
      id: 'news-b',
      title: 'Event Beta',
      date: '2026-03-01',
      tag: 'event',
      summary: 'Beta summary line.',
      body: 'Beta body.',
    },
  ],
}))

describe('<News /> parent shell', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    _resetForTests()
  })

  it('renders the desktop track at desktop viewport (default jsdom width 1024)', async () => {
    window.matchMedia = (q) => ({
      matches: false, // not mobile
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(
      screen.getByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
    // desktop track has the sidebar searchbox
    expect(screen.getAllByRole('searchbox').length).toBeGreaterThan(0)
  })

  it('renders the mobile track at mobile viewport', async () => {
    window.matchMedia = (q) => ({
      matches: q.includes('max-width'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })
    vi.resetModules()
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(
      screen.getByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
    // mobile track has chip-based filter, NOT a sidebar searchbox by default
    expect(screen.getByRole('tab', { name: /^all$/i })).toBeInTheDocument()
  })

  it('news=[] empty path renders empty state via desktop track', async () => {
    window.matchMedia = (q) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })
    vi.doMock('../data/news.json', () => ({ default: [] }))
    vi.resetModules()
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
    vi.doUnmock('../data/news.json')
  })
})
