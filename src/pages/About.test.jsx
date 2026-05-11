import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import About from './About.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'
const siteJson = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}
const aboutJson = {
  mission: '北美炸梦同好会 / バンドリ北米華人コミュニティ — 北美华人 BanG Dream! 粉丝社群。',
  faq: [
    { q: '怎么加入？', a: '点击下方「加入 QQ 群」按钮直接进群即可。' },
    { q: '需要会中文或日语吗？', a: '中文为主，英文 / 日文也都欢迎。' },
  ],
  coc: '① 禁止恶意攻击作品相关声优、角色、团体。',
  joinInstructions: '加入我们就直接加 QQ 群即可。',
}
const socialJson = [
  { platform: 'discord', label: 'Discord', url: 'https://discord.gg/WfMBKaW8Br', enabled: true },
  { platform: 'qq', label: 'QQ群', url: 'https://qm.qq.com/q/Dir9OC5TYA', enabled: true },
  { platform: 'forum', label: 'Forum', url: 'https://forum.bangdream.org', enabled: true },
]

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

  // Edge tests (D6)
  it('long FAQ answer (>300 chars) renders fully without truncation', async () => {
    const longAnswer = '这是一个非常长的答案。'.repeat(40)
    vi.mocked(fetchAbout).mockResolvedValue({
      items: [
        ...aboutRows().items.filter((i) => i.slug !== 'faq'),
        {
          id: 99,
          slug: 'faq',
          title_zh: 'FAQ',
          body_md: JSON.stringify([{ q: '长问题？', a: longAnswer }]),
          sort_order: 30,
        },
      ],
    })
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /faq/i })
    await waitFor(() => {
      const details = container.querySelector('details')
      expect(details).not.toBeNull()
    })
    const answer = container.querySelector('.about-faq-answer')
    expect(answer).not.toBeNull()
    expect(answer.textContent.length).toBeGreaterThan(100)
  })

  it('empty FAQ list renders noFaq empty state', async () => {
    vi.mocked(fetchAbout).mockResolvedValue({
      items: [
        ...aboutRows().items.filter((i) => i.slug !== 'faq'),
        { id: 99, slug: 'faq', title_zh: 'FAQ', body_md: '[]', sort_order: 30 },
      ],
    })
    renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /faq/i })
    expect(screen.getByText(/FAQ coming soon/i)).toBeInTheDocument()
  })

  it('missing mission renders Mission heading with no crash', async () => {
    vi.mocked(fetchAbout).mockResolvedValue({
      items: aboutRows().items.filter((i) => i.slug !== 'mission'),
    })
    renderWithProviders(<About />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 2, name: /mission/i }),
    ).toBeInTheDocument()
  })

  it('missing joinInstructions renders Join section with no crash', async () => {
    vi.mocked(fetchAbout).mockResolvedValue({
      items: aboutRows().items.filter((i) => i.slug !== 'joinInstructions'),
    })
    renderWithProviders(<About />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 2, name: /how to join/i }),
    ).toBeInTheDocument()
  })

  it('QQ CTA hidden when social entry disabled', async () => {
    vi.mocked(fetchSocial).mockResolvedValue({
      items: [
        { id: 1, platform: 'discord', label_zh: 'Discord', url: 'https://discord.gg/test', icon: null, sort_order: 0, active: 1 },
        { id: 2, platform: 'qq', label_zh: 'QQ', url: 'https://qm.qq.com/q/test', icon: null, sort_order: 1, active: 0 },
      ],
      total: 2,
    })
    renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    expect(screen.queryByRole('link', { name: /join qq/i })).toBeNull()
  })

  it('stats grid renders 4 cells in bf-about-stats block', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    const stats = container.querySelector('.bf-about-stats')
    expect(stats).not.toBeNull()
    expect(stats.children.length).toBe(4)
  })

  it('renders Contact section between Mission and Stats (DOM order)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    const contact = container.querySelector('#contact')
    const mission = container.querySelector('#mission')
    const stats = container.querySelector('.about-stats-block')
    expect(contact).not.toBeNull()
    expect(mission).not.toBeNull()
    expect(stats).not.toBeNull()
    const order = mission.compareDocumentPosition(contact)
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const order2 = contact.compareDocumentPosition(stats)
    expect(order2 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('Contact section has localized mailto link with speller-form aria-label (en + zh)', async () => {
    const { container, unmount } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByRole('heading', { level: 2, name: /mission/i })
    const enLink = container.querySelector(
      '#contact a[href="mailto:contact@bangdream.org"]',
    )
    expect(enLink).not.toBeNull()
    expect(enLink.getAttribute('aria-label')).toBe(
      'Send email to contact at bangdream dot org',
    )
    expect(enLink.textContent).toContain('✉')
    expect(enLink.textContent).toContain('contact@bangdream.org')
    unmount()

    setLanguage('zh')
    const zhResult = renderWithProviders(<About />, { route: '/about' })
    await zhResult.findByRole('heading', { level: 2, name: /使命/ })
    const zhLink = zhResult.container.querySelector(
      '#contact a[href="mailto:contact@bangdream.org"]',
    )
    expect(zhLink).not.toBeNull()
    expect(zhLink.getAttribute('aria-label')).toBe(
      '发送邮件至 contact at bangdream dot org',
    )
  })
})
