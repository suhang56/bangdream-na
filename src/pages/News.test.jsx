import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

const baseRows = [
  {
    id: 1,
    slug: 'news-a',
    title_zh: 'Announcement Alpha',
    title_en: null,
    body_md: 'Alpha body.',
    category: 'announcement',
    hero_image_url: 'https://cdn.example.com/a.jpg',
    tags: [],
    published_at: Math.floor(Date.parse('2026-04-01T00:00:00Z') / 1000),
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 2,
    slug: 'news-b',
    title_zh: 'Event Beta',
    title_en: null,
    body_md: 'Beta body.',
    category: 'event',
    hero_image_url: null,
    tags: [],
    published_at: Math.floor(Date.parse('2026-03-01T00:00:00Z') / 1000),
    created_at: 0,
    updated_at: 0,
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

describe('<News /> bf-design single component', () => {
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

  it('renders bf-page-hd section with h1 heading', async () => {
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.bf-page-hd')).not.toBeNull()
  })

  it('renders ph-tag kicker text', async () => {
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.ph-tag')).not.toBeNull()
  })

  it('renders ph-meta with item count', async () => {
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await screen.findByRole('heading', { level: 1 })
    const meta = container.querySelector('.ph-meta')
    expect(meta).not.toBeNull()
    expect(meta.textContent).toMatch(/2/)
  })

  it('renders bf-news-list grid container', async () => {
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      expect(container.querySelector('.bf-news-list')).not.toBeNull()
    })
  })

  it('renders a news-card for each item', async () => {
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(container.querySelectorAll('.news-card').length).toBe(2)
    })
  })

  // Edge 1: empty list
  it('renders bf-news-list with 0 cards on empty response', async () => {
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      expect(container.querySelectorAll('.news-card').length).toBe(0)
    })
  })

  // Edge 2: missing image — no crash
  it('renders card without image when hero_image_url is null', async () => {
    const rowNoImg = { ...baseRows[0], slug: 'no-img', hero_image_url: null }
    vi.mocked(fetchNews).mockResolvedValue({ items: [rowNoImg], total: 1 })
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(container.querySelector('.news-card')).not.toBeNull()
    })
    expect(container.querySelector('img')).toBeNull()
  })

  // Edge 3: long title — no crash
  it('renders card with 200-char title without crash', async () => {
    const longTitle = 'A'.repeat(200)
    const rowLong = { ...baseRows[0], slug: 'long', title_zh: longTitle }
    vi.mocked(fetchNews).mockResolvedValue({ items: [rowLong], total: 1 })
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })
  })

  // Edge 4: malformed date
  it('renders card with null published_at without crash', async () => {
    const rowBadDate = { ...baseRows[0], slug: 'baddate', published_at: null }
    vi.mocked(fetchNews).mockResolvedValue({ items: [rowBadDate], total: 1 })
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(container.querySelector('.news-card')).not.toBeNull()
    })
    expect(container.querySelector('time')).toBeNull()
  })

  // Edge 5: missing slug — card not linkable
  it('renders card without Link when slug is empty', async () => {
    const rowNoSlug = { ...baseRows[0], slug: '' }
    vi.mocked(fetchNews).mockResolvedValue({ items: [rowNoSlug], total: 1 })
    const { default: News } = await import('./News.jsx')
    const { container } = renderWithProviders(<News />, { route: '/news' })
    await waitFor(() => {
      expect(container.querySelector('.news-card')).not.toBeNull()
    })
    expect(container.querySelector('.news-card-link')).toBeNull()
  })

  // Edge 6: fetch error retry
  it('shows ErrorState and recovers after retry', async () => {
    vi.mocked(fetchNews).mockRejectedValueOnce(new Error('network down'))
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    vi.mocked(fetchNews).mockResolvedValueOnce({ items: baseRows, total: baseRows.length })
    await userEvent.click(retry)
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(2)
    })
  })

  it('shows LoadingState while fetch is pending', async () => {
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
})
