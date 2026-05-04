import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import About from './About.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'
import siteJson from '../data/site.json'
import aboutJson from '../data/about.json'
import socialJson from '../data/social.json'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchAbout: vi.fn(),
    fetchSite: vi.fn(),
    fetchSocial: vi.fn(),
  }
})

import { fetchAbout, fetchSite, fetchSocial } from '../lib/api.js'

function siteRows() {
  const items = []
  for (const [k, v] of Object.entries(siteJson)) {
    if (typeof v !== 'string' || v.length === 0) continue
    items.push({ key: `site.${k}`, value: v })
  }
  return { items }
}

function aboutRows() {
  return {
    items: [
      { id: 1, slug: 'mission', title_zh: '使命', body_md: aboutJson.mission, sort_order: 0 },
      {
        id: 2,
        slug: 'joinInstructions',
        title_zh: '加入',
        body_md: aboutJson.joinInstructions,
        sort_order: 10,
      },
      { id: 3, slug: 'coc', title_zh: '群规', body_md: aboutJson.coc, sort_order: 20 },
      { id: 4, slug: 'faq', title_zh: 'FAQ', body_md: JSON.stringify(aboutJson.faq), sort_order: 30 },
    ],
  }
}

function socialRows() {
  const items = socialJson
    .filter((s) => s.enabled)
    .map((s, i) => ({
      id: i + 1,
      platform: s.platform,
      label_zh: s.label,
      url: s.url,
      icon: null,
      sort_order: i,
      active: 1,
    }))
  return { items, total: items.length }
}

describe('<About />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchAbout).mockReset()
    vi.mocked(fetchSite).mockReset()
    vi.mocked(fetchSocial).mockReset()
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows())
    vi.mocked(fetchSite).mockResolvedValue(siteRows())
    vi.mocked(fetchSocial).mockResolvedValue(socialRows())
  })

  afterEach(() => {
    _resetForTests()
  })

  it('renders tri-lingual hero (JP + ZH H1 + EN)', async () => {
    renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(screen.getByText('北美炸梦同好会')).toBeInTheDocument()
    expect(
      screen.getByText('BanG Dream North America Chinese Community'),
    ).toBeInTheDocument()
  })

  it('Chinese name carries the H1 (canonical)', async () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /北美炸梦同好会/ }),
    ).toBeInTheDocument()
  })

  it('renders Mission/Join sections (history removed)', async () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(await screen.findByRole('heading', { level: 2, name: /mission/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /how to join/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /history/i })).toBeNull()
  })

  it('renders FAQ accordion', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(await screen.findByRole('heading', { level: 2, name: /faq/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(container.querySelectorAll('details').length).toBeGreaterThanOrEqual(2)
    })
  })

  it('does not render COC section (moved to /rules tab)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    expect(container.querySelector('#coc')).toBeNull()
  })

  it('disclaimer always visible', async () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 2, name: /disclaimer/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/not affiliated with bushiroad/i)).toBeInTheDocument()
  })

  it('section anchors have ids', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    expect(container.querySelector('#mission')).not.toBeNull()
    expect(container.querySelector('#faq')).not.toBeNull()
    expect(container.querySelector('#disclaimer')).not.toBeNull()
    expect(container.querySelector('#join')).not.toBeNull()
    expect(container.querySelector('#history')).toBeNull()
    expect(container.querySelector('#coc')).toBeNull()
  })

  it('JP/ZH/EN spans carry lang attributes', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })

  it('shows LoadingState while about fetch is pending', () => {
    let resolveAbout
    vi.mocked(fetchAbout).mockImplementation(
      () => new Promise((r) => { resolveAbout = r }),
    )
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveAbout(aboutRows())
  })

  it('shows ErrorState with retry on about fetch reject', async () => {
    vi.mocked(fetchAbout).mockRejectedValueOnce(new Error('5xx'))
    renderWithProviders(<About />, { route: '/about' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    vi.mocked(fetchAbout).mockResolvedValueOnce(aboutRows())
    await userEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 2, name: /mission/i }),
    ).toBeInTheDocument()
  })
})
