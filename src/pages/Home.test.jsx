import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { useIsMobile } from '../lib/useBreakpoint.js'
import Home from './Home.jsx'
import site from '../data/site.json'
import posts from '../data/posts.json'
import { _resetForTests, setLanguage, t } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchNews: vi.fn(),
    fetchEvents: vi.fn(),
  }
})

import { fetchNews, fetchEvents } from '../lib/api.js'

describe('<Home /> (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.mocked(useIsMobile).mockReset()
    cache.clear()
    vi.mocked(fetchNews).mockReset()
    vi.mocked(fetchEvents).mockReset()
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
  })

  afterEach(() => {
    cache.clear()
  })

  describe('desktop track', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(false)
    })

    it('renders Chinese H1 (canonical)', async () => {
      renderWithProviders(<Home />, { route: '/' })
      expect(
        await screen.findByRole('heading', { level: 1, name: site.communityNameZh }),
      ).toBeInTheDocument()
    })

    it('renders Japanese name', async () => {
      renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(screen.getByText(site.communityNameJp)).toBeInTheDocument()
    })

    it('renders English name as sister line', async () => {
      renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(screen.getByText(site.communityName)).toBeInTheDocument()
    })

    it('renders tagline from i18n (en)', async () => {
      renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(screen.getByText(t('tagline'))).toBeInTheDocument()
    })

    it('tagline switches with language (zh)', async () => {
      setLanguage('zh')
      renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(screen.getByText(t('tagline'))).toBeInTheDocument()
    })

    it('does NOT render Discord CTA inside Hero (P6 — moved to PlatformTileRow)', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      const hero = container.querySelector('.hero')
      expect(hero).not.toBeNull()
      expect(hero.querySelector('a[href*="discord"]')).toBeNull()
    })

    it('all three lang attributes (ja|zh|en) present', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('[lang="ja"]')).not.toBeNull()
      expect(container.querySelector('[lang="zh"]')).not.toBeNull()
      expect(container.querySelector('[lang="en"]')).not.toBeNull()
    })

    it('renders HeroPeekCarousel when posts present, else stat tiles', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      if (Array.isArray(posts) && posts.length > 0) {
        expect(container.querySelector('.hero-peek')).not.toBeNull()
      } else {
        expect(container.querySelector('.home-stat-tiles')).not.toBeNull()
        const tiles = container.querySelectorAll('.home-stat-tile__num')
        expect(tiles.length).toBe(2)
      }
    })

    it('renders PlatformTileRow at home bottom (always)', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('.platform-tile-row')).not.toBeNull()
      expect(container.querySelectorAll('.platform-tile').length).toBe(6)
    })

    it('only desktop track is mounted (no .home-mobile element)', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('.home-mobile')).toBeNull()
    })
  })

  describe('mobile track', () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(true)
    })

    it('renders Chinese H1 (canonical)', async () => {
      renderWithProviders(<Home />, { route: '/' })
      expect(
        await screen.findByRole('heading', { level: 1, name: site.communityNameZh }),
      ).toBeInTheDocument()
    })

    it('mounts HomeMobile (.home-mobile root)', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('.home-mobile')).not.toBeNull()
    })

    it('does NOT mount desktop track', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('.home-section')).toBeNull()
    })

    it('renders PlatformTileRow at home bottom (always)', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('.platform-tile-row')).not.toBeNull()
    })

    it('all three lang attributes (ja|zh|en) present', async () => {
      const { container } = renderWithProviders(<Home />, { route: '/' })
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh })
      expect(container.querySelector('[lang="ja"]')).not.toBeNull()
      expect(container.querySelector('[lang="zh"]')).not.toBeNull()
      expect(container.querySelector('[lang="en"]')).not.toBeNull()
    })
  })

  describe('loading + error states', () => {
    it('shows LoadingState while news+events fetch is pending', async () => {
      vi.mocked(useIsMobile).mockReturnValue(false)
      let resolveN, resolveE
      vi.mocked(fetchNews).mockImplementation(
        () => new Promise((r) => { resolveN = r }),
      )
      vi.mocked(fetchEvents).mockImplementation(
        () => new Promise((r) => { resolveE = r }),
      )
      const { container } = renderWithProviders(<Home />, { route: '/' })
      expect(container.querySelector('.loading-state')).not.toBeNull()
      resolveN({ items: [], total: 0 })
      resolveE({ items: [], total: 0 })
      await waitFor(() => {
        expect(container.querySelector('.loading-state')).toBeNull()
      })
    })

    it('shows ErrorState with retry on news fetch reject', async () => {
      vi.mocked(useIsMobile).mockReturnValue(false)
      vi.mocked(fetchNews).mockRejectedValueOnce(new Error('5xx'))
      renderWithProviders(<Home />, { route: '/' })
      expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
      const retry = screen.getByRole('button', { name: /retry/i })
      vi.mocked(fetchNews).mockResolvedValueOnce({ items: [], total: 0 })
      vi.mocked(fetchEvents).mockResolvedValueOnce({ items: [], total: 0 })
      await userEvent.click(retry)
      expect(
        await screen.findByRole('heading', { level: 1, name: site.communityNameZh }),
      ).toBeInTheDocument()
    })
  })
})
