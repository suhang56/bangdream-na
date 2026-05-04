import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

// Two API rows that, after adapter, mirror the previous JSON fixture shape.
// API rows are snake_case + Unix-seconds dates.
const baseRows = [
  {
    slug: 'news-a',
    title_zh: 'Announcement Alpha',
    title_en: null,
    body_md: 'Alpha body.',
    category: 'announcement',
    hero_image_url: 'https://cdn.example.com/a.jpg',
    tags: [],
    published_at: Math.floor(Date.parse('2026-04-01T00:00:00Z') / 1000),
  },
  {
    slug: 'news-b',
    title_zh: 'Event Beta',
    title_en: null,
    body_md: 'Beta body.',
    category: 'event',
    hero_image_url: null,
    tags: [],
    published_at: Math.floor(Date.parse('2026-03-01T00:00:00Z') / 1000),
  },
]

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchNews: vi.fn(),
  }
})

import { fetchNews } from '../lib/api.js'

describe('<News /> parent shell', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchNews).mockReset()
    vi.mocked(fetchNews).mockResolvedValue({ items: baseRows, total: baseRows.length })
  })

  afterEach(() => {
    _resetForTests()
    cache.clear()
  })

  it('renders the desktop track at desktop viewport (default jsdom width 1024)', async () => {
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
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
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
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
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
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
    })
  })

  it('shows LoadingState while fetch is pending', async () => {
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
    let resolveFetch
    vi.mocked(fetchNews).mockImplementation(
      () => new Promise((r) => { resolveFetch = r }),
    )
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveFetch({ items: baseRows, total: baseRows.length })
    await waitFor(() => {
      expect(container.querySelector('.loading-state')).toBeNull()
    })
  })

  it('shows ErrorState with retry button on fetch reject', async () => {
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
    vi.mocked(fetchNews).mockRejectedValueOnce(new Error('network down'))
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    expect(retry).toBeInTheDocument()

    vi.mocked(fetchNews).mockResolvedValueOnce({ items: baseRows, total: baseRows.length })
    await userEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
  })
})
