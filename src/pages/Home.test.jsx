import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { useIsMobile } from '../lib/useBreakpoint.js'
import Home from './Home.jsx'
const site = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}
const posts = [
  { id: '邦多利十周年', image: '/posts/0e58054c3933d25162576c8d62e7bc86.jpg', title: '邦多利十周年', url: '', datePosted: '2026-02-28' },
  { id: '北美邦最长的一天', image: '/posts/b5aa6b5cbdbd9f14b15df108f6e51e26.jpg', title: '北美邦最长的一天', url: '', datePosted: '2026-05-01' },
]
const socialJson = [
  { platform: 'discord', label: 'Discord', url: 'https://discord.gg/WfMBKaW8Br', enabled: true },
  { platform: 'qq', label: 'QQ群', url: 'https://qm.qq.com/q/Dir9OC5TYA', enabled: true },
  { platform: 'xiaohongshu', label: 'Xiaohongshu', url: 'https://xhslink.com/m/1s9XmQRoAug', enabled: true },
  { platform: 'x', label: 'X', url: 'https://x.com/BandoriNACC', enabled: true },
  { platform: 'wechat', label: '微信', url: '', enabled: false },
  { platform: 'forum', label: 'Forum', url: 'https://forum.bangdream.org', enabled: true },
]
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
    fetchPosts: vi.fn(),
    fetchSocial: vi.fn(),
    fetchSite: vi.fn(),
  }
})

import {
  fetchNews,
  fetchEvents,
  fetchPosts,
  fetchSocial,
  fetchSite,
} from '../lib/api.js'

// Helpers to seed the mocked API with rows that match the legacy fixtures.
function siteRowsFromFixture() {
  const items = []
  for (const [k, v] of Object.entries(site)) {
    if (typeof v !== 'string' || v.length === 0) continue
    items.push({ key: `site.${k}`, value: v })
  }
  return { items }
}

function postsRowsFromFixture() {
  const items = posts.map((p, i) => ({
    id: i + 1,
    slug: p.id,
    title_zh: p.title,
    title_en: null,
    body_md: null,
    image_url: p.image,
    link_url: p.url || null,
    published_at: Math.floor(new Date(p.datePosted).getTime() / 1000),
    sort_order: i,
  }))
  return { items, total: items.length }
}

function socialRowsFromFixture() {
  // Mirror legacy behaviour: PlatformTileRow renders ALL platforms,
  // including disabled ones (the tile guards `enabled` itself). Public
  // /api/social only returns active=1, so we filter out the disabled
  // ones here, matching the production response shape.
  const items = socialJson
    .filter((s) => s.enabled)
    .map((s, i) => ({
      id: i + 1,
      platform: s.platform,
      label_zh: s.label,
      label_en: null,
      url: s.url,
      icon: null,
      sort_order: i,
      active: 1,
    }))
  return { items, total: items.length }
}

describe('<Home /> (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.mocked(useIsMobile).mockReset()
    cache.clear()
    vi.mocked(fetchNews).mockReset()
    vi.mocked(fetchEvents).mockReset()
    vi.mocked(fetchPosts).mockReset()
    vi.mocked(fetchSocial).mockReset()
    vi.mocked(fetchSite).mockReset()
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchPosts).mockResolvedValue(postsRowsFromFixture())
    vi.mocked(fetchSocial).mockResolvedValue(socialRowsFromFixture())
    vi.mocked(fetchSite).mockResolvedValue(siteRowsFromFixture())
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
      // Only active=1 social rows reach the row (5 of 6 in fixture; wechat disabled).
      expect(container.querySelectorAll('.platform-tile').length).toBe(5)
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
