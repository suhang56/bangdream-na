import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchNews: vi.fn(),
    fetchEvents: vi.fn(),
    fetchMembers: vi.fn(),
  }
})

import { fetchNews, fetchEvents, fetchMembers } from '../lib/api.js'

const newsRow = (over = {}) => ({
  id: 1,
  slug: 'news-a',
  title_zh: 'BanG Dream! 公告',
  title_en: 'Announcement',
  body_md: '正文。',
  category: 'announcement',
  hero_image_url: null,
  tags: [],
  published_at: 0,
  created_at: 0,
  updated_at: 0,
  ...over,
})

const eventRow = (over = {}) => ({
  id: 2,
  slug: 'event-a',
  title_zh: 'BanG Dream Live LA',
  title_en: null,
  description_md: '现地报告',
  hero_image_url: null,
  start_at: 0,
  end_at: null,
  venue: 'Greek Theatre',
  city: 'Los Angeles',
  scope: 'upcoming',
  ticket_url: '',
  band_theme: 'poppin',
  ...over,
})

const memberRow = (over = {}) => ({
  id: 3,
  external_id: 'mem-a',
  display_name: 'Banbanban',
  city: 'Seattle',
  oshi_character: 'Kasumi',
  oshi_band: 'poppin',
  avatar_url: null,
  expedition_member: 0,
  role: 'member',
  created_at: 0,
  updated_at: 0,
  ...over,
})

describe('<Search />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchNews).mockReset()
    vi.mocked(fetchEvents).mockReset()
    vi.mocked(fetchMembers).mockReset()
  })
  afterEach(() => {
    cache.clear()
  })

  it('renders empty-state when ?q= is missing — does NOT fire fetches', async () => {
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, { route: '/search' })
    expect(container.querySelector('.bf-search-empty')).toBeInTheDocument()
    expect(vi.mocked(fetchNews)).not.toHaveBeenCalled()
    expect(vi.mocked(fetchEvents)).not.toHaveBeenCalled()
    expect(vi.mocked(fetchMembers)).not.toHaveBeenCalled()
  })

  it('renders empty-state when ?q= is whitespace only — does NOT fire fetches', async () => {
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=%20%20',
    })
    expect(container.querySelector('.bf-search-empty')).toBeInTheDocument()
    expect(vi.mocked(fetchNews)).not.toHaveBeenCalled()
  })

  it('non-empty q fires news/events/members fetches', async () => {
    vi.mocked(fetchNews).mockResolvedValue({ items: [newsRow()], total: 1 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [eventRow()], total: 1 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [memberRow()] })
    const { default: Search } = await import('./Search.jsx')
    renderWithProviders(<Search />, { route: '/search?q=bang' })
    await waitFor(() => {
      expect(vi.mocked(fetchNews)).toHaveBeenCalled()
      expect(vi.mocked(fetchEvents)).toHaveBeenCalled()
      expect(vi.mocked(fetchMembers)).toHaveBeenCalled()
    })
  })

  it('groups results into 3 sections after resolution', async () => {
    vi.mocked(fetchNews).mockResolvedValue({ items: [newsRow()], total: 1 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [eventRow()], total: 1 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [memberRow({ display_name: 'BangFan' })] })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=bang',
    })
    await waitFor(() => {
      const sections = container.querySelectorAll('.bf-search-section')
      expect(sections.length).toBe(3)
    })
  })

  it('substring match is case-insensitive on news + events + members', async () => {
    vi.mocked(fetchNews).mockResolvedValue({
      items: [
        newsRow({ slug: 'a', title_zh: 'BanG Hello' }),
        newsRow({ slug: 'b', title_zh: 'No match' }),
      ],
      total: 2,
    })
    vi.mocked(fetchEvents).mockResolvedValue({
      items: [eventRow({ slug: 'a', title_zh: 'banG Live' })],
      total: 1,
    })
    vi.mocked(fetchMembers).mockResolvedValue({
      items: [memberRow({ display_name: 'BangBoy' })],
    })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=BANG',
    })
    await waitFor(() => {
      const hits = container.querySelectorAll('.bf-search-result')
      expect(hits.length).toBe(3)
    })
    expect(container.textContent).toContain('BanG Hello')
    expect(container.textContent).not.toContain('No match')
  })

  it('caps each section at 8 results', async () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      newsRow({ slug: `n${i}`, title_zh: `Bang ${i}` }),
    )
    vi.mocked(fetchNews).mockResolvedValue({ items: many, total: many.length })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [] })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=bang',
    })
    await waitFor(() => {
      const newsSection = container.querySelector(
        '.bf-search-section[data-kind="news"]',
      )
      expect(newsSection).not.toBeNull()
      const hits = newsSection.querySelectorAll('.bf-search-result')
      expect(hits.length).toBe(8)
    })
  })

  it('renders error state when all 3 fetches reject', async () => {
    vi.mocked(fetchNews).mockRejectedValue(new Error('down'))
    vi.mocked(fetchEvents).mockRejectedValue(new Error('down'))
    vi.mocked(fetchMembers).mockRejectedValue(new Error('down'))
    const { default: Search } = await import('./Search.jsx')
    renderWithProviders(<Search />, { route: '/search?q=bang' })
    await screen.findByRole('alert')
  })

  it('renders loading state while fetches are pending', async () => {
    let resolveNews
    vi.mocked(fetchNews).mockImplementation(
      () => new Promise((r) => { resolveNews = r }),
    )
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [] })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=bang',
    })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveNews({ items: [], total: 0 })
    await waitFor(() => {
      expect(container.querySelector('.loading-state')).toBeNull()
    })
  })

  it('renders no-result state when q is non-empty but all sections are empty', async () => {
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [] })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=zzznomatch',
    })
    await waitFor(() => {
      expect(container.querySelector('.bf-search-noresult')).not.toBeNull()
    })
  })

  it('partial single fetch reject does not break entire page (other sections still render)', async () => {
    vi.mocked(fetchNews).mockResolvedValue({
      items: [newsRow({ title_zh: 'BangShow' })],
      total: 1,
    })
    vi.mocked(fetchEvents).mockRejectedValue(new Error('events down'))
    vi.mocked(fetchMembers).mockResolvedValue({ items: [] })
    const { default: Search } = await import('./Search.jsx')
    const { container } = renderWithProviders(<Search />, {
      route: '/search?q=bang',
    })
    await waitFor(() => {
      const hits = container.querySelectorAll('.bf-search-result')
      expect(hits.length).toBeGreaterThan(0)
    })
    expect(container.textContent).toContain('BangShow')
  })

  it('reads ?q= from the location and renders the query echo', async () => {
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [] })
    const { default: Search } = await import('./Search.jsx')
    const encoded = encodeURIComponent('邦多利')
    const { container } = renderWithProviders(<Search />, {
      route: `/search?q=${encoded}`,
    })
    await waitFor(() => {
      expect(container.textContent).toContain('邦多利')
    })
  })
})
