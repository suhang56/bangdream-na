import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Home from './Home.jsx'
import * as api from '../lib/api.js'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  )
}

const HAPPY_NEWS = {
  items: [
    {
      id: 1,
      slug: 'happy-hero',
      title_zh: '北美邦5.3萝P东京公演',
      title_en: null,
      body_md: '现地报告 — 北美邦的大家集合东京。',
      category: 'event',
      hero_image_url: null,
      tags: [],
      published_at: 1746460800,
      created_at: 1746460800,
      updated_at: 1746460800,
    },
    {
      id: 2,
      slug: 'card-2',
      title_zh: '新闻卡片 2',
      title_en: null,
      body_md: '正文 2',
      category: 'announcement',
      hero_image_url: null,
      tags: [],
      published_at: 1746374400,
      created_at: 1746374400,
      updated_at: 1746374400,
    },
  ],
  total: 2,
}

const HAPPY_UPCOMING = {
  items: [
    {
      id: 42,
      slug: 'roselia-anime-expo-2026',
      title_zh: 'Roselia @ Anime Expo 2026',
      title_en: null,
      description_md: 'Roselia 时隔 5 年重回北美',
      hero_image_url: null,
      start_at: 1751414400,
      end_at: null,
      venue: 'Crypto.com Arena',
      city: 'Los Angeles',
      scope: null,
      ticket_url: 'https://example.com/buy',
      band_theme: 'roselia',
      created_at: 0,
      updated_at: 0,
    },
  ],
  total: 1,
}

const HAPPY_PAST = { items: [], total: 7 }

const HAPPY_GALLERY = { items: [], total: 0 }

function mockHappy() {
  vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
  vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
    if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
    return Promise.resolve(HAPPY_UPCOMING)
  })
  vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
}

describe('<Home />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    cache.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cache.clear()
  })

  it('renders hero feature card with news[0] title and link to /news/{slug}', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-feature')).toBeInTheDocument()
    })
    const feature = container.querySelector('.bf-hh-feature')
    expect(feature.getAttribute('href')).toBe('/news/happy-hero')
    expect(feature.textContent).toContain('北美邦5.3萝P东京公演')
  })

  it('EDGE 1: empty news API renders without crash, no hero feature title', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl')).toBeInTheDocument()
    })
    expect(container.querySelector('.bf-hh-feature .hhf-title')).toBeNull()
    expect(container.querySelector('.bf-news-list')).toBeInTheDocument()
  })

  it('EDGE 2: empty events API shows next-event placeholder, stats events = 0', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-home-hero')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(container.textContent).toContain('暂无即将到来的活动')
    })
    const statsNums = container.querySelectorAll('.bf-hh-stats .num')
    expect(statsNums[2].textContent).toBe('0')
  })

  it('EDGE 3: null venue/city in next-event renders — — without crash', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve({ items: [], total: 0 })
      return Promise.resolve({
        items: [{ ...HAPPY_UPCOMING.items[0], venue: null, city: null }],
        total: 1,
      })
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.hhn-meta')).toBeInTheDocument()
    })
    const meta = container.querySelector('.hhn-meta')
    const dashes = within(meta).getAllByText('—')
    expect(dashes.length).toBe(2)
    expect(consoleErr).not.toHaveBeenCalled()
    consoleErr.mockRestore()
  })

  it('EDGE 4: null ticket_url omits 购票 button without layout shift', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve({ items: [], total: 0 })
      return Promise.resolve({
        items: [
          { ...HAPPY_UPCOMING.items[0], ticket_url: null, slug: 'no-ticket', id: 100 },
          { ...HAPPY_UPCOMING.items[0], ticket_url: 'https://x', slug: 'with-ticket', id: 101 },
        ],
        total: 2,
      })
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr')).toBeInTheDocument()
    })
    const rows = container.querySelectorAll('.bf-tbl tbody tr')
    const buyAnchorRow0 = rows[0].querySelector('.td-buy')
    expect(buyAnchorRow0).toBeNull()
    const buyAnchorRow1 = rows[1].querySelector('.td-buy')
    expect(buyAnchorRow1).not.toBeNull()
    expect(rows[0].querySelectorAll('td').length).toBe(rows[1].querySelectorAll('td').length)
  })

  it('EDGE 5: null band_theme on next-event falls back to ink border', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve({ items: [], total: 0 })
      return Promise.resolve({
        items: [{ ...HAPPY_UPCOMING.items[0], band_theme: null }],
        total: 1,
      })
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-next')).toBeInTheDocument()
    })
    const card = container.querySelector('.bf-hh-next')
    expect(card.style.borderLeftColor).toBe('rgb(31, 29, 26)')
  })

  it('EDGE 6: long title_zh wraps without horizontal overflow', async () => {
    const longTitle = '罗西莉亚北美巡演加场公告：洛杉矶Wiltern追加票务发售时间'
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [{ ...HAPPY_NEWS.items[0], title_zh: longTitle }],
      total: 1,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve({ items: [], total: 0 })
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-feature .hhf-title')).toBeInTheDocument()
    })
    const title = container.querySelector('.bf-hh-feature .hhf-title')
    expect(title.textContent).toBe(longTitle)
  })

  it('EDGE 7 (PR #110 BLOCKER): NEXT EVENT link uses slug, NOT id', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-next')).toBeInTheDocument()
    })
    const link = container.querySelector('.bf-hh-next')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/events/roselia-anime-expo-2026')
    expect(link.getAttribute('href')).not.toContain('42')
  })
})
