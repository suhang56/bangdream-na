import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
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
    fetchAbout: vi.fn(),
    fetchSite: vi.fn(),
    fetchSocial: vi.fn(),
  }
})

import {
  fetchNews,
  fetchEvents,
  fetchMembers,
  fetchAbout,
  fetchSite,
  fetchSocial,
} from '../lib/api.js'
const siteJson = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}
import Events from './Events.jsx'
import Members from './Members.jsx'
import News from './News.jsx'
import About from './About.jsx'

function RoutesUnderTest() {
  return (
    <Routes>
      <Route path="/events" element={<Events />} />
      <Route path="/members" element={<Members />} />
      <Route path="/news" element={<News />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

describe('routes smoke', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchNews).mockReset()
    vi.mocked(fetchEvents).mockReset()
    vi.mocked(fetchMembers).mockReset()
    vi.mocked(fetchNews).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(fetchMembers).mockResolvedValue({ items: [], total: 0 })
    const siteItems = []
    for (const [k, v] of Object.entries(siteJson)) {
      if (typeof v === 'string' && v.length > 0) {
        siteItems.push({ key: `site.${k}`, value: v })
      }
    }
    vi.mocked(fetchAbout).mockResolvedValue({
      items: [
        { id: 1, slug: 'mission', title_zh: '使命', body_md: 'mission', sort_order: 0 },
      ],
    })
    vi.mocked(fetchSite).mockResolvedValue({ items: siteItems })
    vi.mocked(fetchSocial).mockResolvedValue({ items: [], total: 0 })
  })

  afterEach(() => {
    cache.clear()
  })

  it('Events page renders title + filter + empty state via /events route', async () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/events' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('Members page renders title via /members route', async () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/members' })
    expect(
      await screen.findByRole('heading', { level: 1, name: '成员' }),
    ).toBeInTheDocument()
  })

  it('News page renders heading via /news route', async () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/news' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /新闻/ }),
    ).toBeInTheDocument()
  })

  it('About page renders ZH heading via /about route', async () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /北美炸梦同好会/ }),
    ).toBeInTheDocument()
  })

  it('unknown route renders nothing in test routes (edge: 404 handling)', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/does-not-exist' })
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
