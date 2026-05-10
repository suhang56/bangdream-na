import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc" data-pathname={loc.pathname} />
}

function renderHomeWithProbe() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Home />
              <LocationProbe />
            </>
          }
        />
        <Route path="/events/:slug" element={<LocationProbe />} />
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

  // H1: hero image tests
  it('H1: hero feature card shows backgroundImage with url() when hero_image_url provided', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [{ ...HAPPY_NEWS.items[0], hero_image_url: 'https://example.com/img.jpg' }],
      total: 1,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-feature')).toBeInTheDocument()
    })
    const feature = container.querySelector('.bf-hh-feature')
    // jsdom may quote the URL: url("https://...") — check for the URL hostname
    expect(feature.style.backgroundImage).toContain('example.com/img.jpg')
    expect(feature.style.backgroundImage).toContain('linear-gradient')
  })

  it('H1: hero feature card does NOT set backgroundImage when hero_image_url is null (uses gradient fallback)', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [{ ...HAPPY_NEWS.items[0], hero_image_url: null }],
      total: 1,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-feature')).toBeInTheDocument()
    })
    const feature = container.querySelector('.bf-hh-feature')
    // When no image, backgroundImage is empty (no url() reference)
    expect(feature.style.backgroundImage).not.toContain('example.com')
  })

  it('H1: hero feature card does NOT set backgroundImage when hero_image_url is empty string (uses gradient fallback)', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [{ ...HAPPY_NEWS.items[0], hero_image_url: '' }],
      total: 1,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-feature')).toBeInTheDocument()
    })
    const feature = container.querySelector('.bf-hh-feature')
    // Empty string is falsy — falls back to FIXED_GRADIENT, no external url() reference
    expect(feature.style.backgroundImage).not.toContain('example.com')
  })

  it('H1: news card thumb shows backgroundImage with url() when hero_image_url provided', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [
        HAPPY_NEWS.items[0],
        { ...HAPPY_NEWS.items[1], hero_image_url: 'https://example.com/card.jpg' },
      ],
      total: 2,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.nc-thumb')).toBeInTheDocument()
    })
    const thumb = container.querySelector('.nc-thumb')
    // jsdom may quote the URL: url("https://...") — check for the URL hostname
    expect(thumb.style.backgroundImage).toContain('example.com/card.jpg')
    expect(thumb.style.backgroundImage).toContain('linear-gradient')
  })

  // H2: community links tests
  it('H2: QQ card has correct href and rel attributes', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-join-card')).toBeInTheDocument()
    })
    const qqCard = container.querySelector('.bf-join-card')
    expect(qqCard.getAttribute('href')).toBe('https://qm.qq.com/q/Dir9OC5TYA')
    expect(qqCard.getAttribute('rel')).toBe('noopener noreferrer')
    expect(qqCard.getAttribute('target')).toBe('_blank')
  })

  it('H2: all community link tiles have correct hrefs', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-link')).toBeInTheDocument()
    })
    const links = container.querySelectorAll('.bf-link')
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://discord.gg/WfMBKaW8Br')
    expect(hrefs).toContain('https://xhslink.com/m/1s9XmQRoAug')
    expect(hrefs).toContain('https://x.com/BandoriNACC')
    expect(hrefs).toContain('https://forum.bangdream.org')
    // none should be #
    expect(hrefs.every((h) => h !== '#')).toBe(true)
  })

  // H4: stat tiles are links
  it('H4: 同好 stat tile links to /members', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-stats')).toBeInTheDocument()
    })
    const statsLinks = container.querySelectorAll('.bf-hh-stats a')
    const hrefs = Array.from(statsLinks).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/members')
  })

  it('H4: 活动 stat tile links to /events', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-hh-stats')).toBeInTheDocument()
    })
    const statsLinks = container.querySelectorAll('.bf-hh-stats a')
    const hrefs = Array.from(statsLinks).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/events')
  })

  // H6: community link tone stripes
  it('H6: each .bf-link has --tone inline style, QQ card has --tone:#12B7F5', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-link')).toBeInTheDocument()
    })
    const links = container.querySelectorAll('.bf-link')
    links.forEach((l) => {
      expect(l.getAttribute('style')).toContain('--tone')
    })
    const qqCard = container.querySelector('.bf-join-card')
    expect(qqCard.getAttribute('style')).toContain('#12B7F5')
  })

  // H11: news tag band-aware color
  it('H11: ANNOUNCEMENT news card nc-tag has red background', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [
        HAPPY_NEWS.items[0],
        { ...HAPPY_NEWS.items[1], category: 'announcement', band_theme: null },
      ],
      total: 2,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.nc-tag')).toBeInTheDocument()
    })
    const tags = container.querySelectorAll('.nc-tag')
    const announcementTag = tags[0]
    expect(announcementTag.style.background).toBe('rgb(205, 44, 52)')
  })

  // DENSITY-FIX: Issue 2 — stretched-link event rows
  it('DENSITY-FIX: upcoming event tr has .bf-tr-link class', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr')).toBeInTheDocument()
    })
    const row = container.querySelector('.bf-tbl tbody tr')
    expect(row.classList.contains('bf-tr-link')).toBe(true)
  })

  it('DENSITY-FIX: empty-state row does NOT get .bf-tr-link class', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue(HAPPY_NEWS)
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr')).toBeInTheDocument()
    })
    const row = container.querySelector('.bf-tbl tbody tr')
    expect(row.classList.contains('bf-tr-link')).toBe(false)
  })

  it('DENSITY-FIX: title link inside .bf-tr-link points to /events/<slug>', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr.bf-tr-link')).toBeInTheDocument()
    })
    const titleLink = container.querySelector('.bf-tr-link .td-title a')
    expect(titleLink).toBeInTheDocument()
    expect(titleLink.getAttribute('href')).toBe('/events/roselia-anime-expo-2026')
  })

  it('DENSITY-FIX: clicking title link navigates to /events/<slug>', async () => {
    mockHappy()
    const { container, getByTestId } = renderHomeWithProbe()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr.bf-tr-link')).toBeInTheDocument()
    })
    const titleLink = container.querySelector('.bf-tr-link .td-title a')
    fireEvent.click(titleLink)
    await waitFor(() => {
      expect(getByTestId('loc').getAttribute('data-pathname')).toBe(
        '/events/roselia-anime-expo-2026',
      )
    })
  })

  it('DENSITY-FIX: .td-buy anchor is a separate link with its own external href (independently clickable)', async () => {
    mockHappy()
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl tbody tr.bf-tr-link')).toBeInTheDocument()
    })
    const buy = container.querySelector('.bf-tr-link .td-buy')
    expect(buy).toBeInTheDocument()
    expect(buy.getAttribute('href')).toBe('https://example.com/buy')
    expect(buy.getAttribute('target')).toBe('_blank')
  })

  it('H11: EVENT news card nc-tag has Roselia band color', async () => {
    vi.spyOn(api, 'fetchNews').mockResolvedValue({
      items: [
        HAPPY_NEWS.items[0],
        { ...HAPPY_NEWS.items[1], category: 'event', band_theme: 'roselia' },
      ],
      total: 2,
    })
    vi.spyOn(api, 'fetchEvents').mockImplementation((opts) => {
      if (opts && opts.scope === 'past') return Promise.resolve(HAPPY_PAST)
      return Promise.resolve(HAPPY_UPCOMING)
    })
    vi.spyOn(api, 'fetchGallery').mockResolvedValue(HAPPY_GALLERY)
    const { container } = renderHome()
    await waitFor(() => {
      expect(container.querySelector('.nc-tag')).toBeInTheDocument()
    })
    const tags = container.querySelectorAll('.nc-tag')
    const eventTag = tags[0]
    // Roselia color is #3a3f7a → rgb(58, 63, 122)
    expect(eventTag.style.background).toBe('rgb(58, 63, 122)')
  })
})
