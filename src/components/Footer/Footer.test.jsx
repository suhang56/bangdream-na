import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Footer from './Footer.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import { cache } from '../../lib/cache.js'
const siteJson = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}
const socialJson = [
  { platform: 'discord', label: 'Discord', url: 'https://discord.gg/WfMBKaW8Br', enabled: true },
  { platform: 'qq', label: 'QQ群', url: 'https://qm.qq.com/q/Dir9OC5TYA', enabled: true },
  { platform: 'xiaohongshu', label: 'Xiaohongshu', url: 'https://xhslink.com/m/1s9XmQRoAug', enabled: true },
  { platform: 'x', label: 'X', url: 'https://x.com/BandoriNACC', enabled: true },
  { platform: 'wechat', label: '微信', url: '', enabled: false },
  { platform: 'forum', label: 'Forum', url: 'https://forum.bangdream.org', enabled: true },
]

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    fetchSite: vi.fn(),
    fetchSocial: vi.fn(),
  }
})

import { fetchSite, fetchSocial } from '../../lib/api.js'

function siteRows() {
  const items = []
  for (const [k, v] of Object.entries(siteJson)) {
    if (typeof v !== 'string' || v.length === 0) continue
    items.push({ key: `site.${k}`, value: v })
  }
  return { items }
}

function socialRows({ forumEnabled = true } = {}) {
  const items = socialJson
    .filter((s) => {
      if (!s.enabled) return false
      if (s.platform === 'forum' && !forumEnabled) return false
      return true
    })
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

describe('<Footer />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockReset()
    vi.mocked(fetchSocial).mockReset()
    vi.mocked(fetchSite).mockResolvedValue(siteRows())
    vi.mocked(fetchSocial).mockResolvedValue(socialRows())
  })

  it('renders 3 column headings (Quick Links + Communities + About & Legal) when communities enabled', async () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    await screen.findByRole('heading', { level: 3, name: /^communities$/i })
    const headings = container.querySelectorAll('.footer-heading')
    expect(headings.length).toBe(3)
    expect(
      screen.getByRole('heading', { level: 3, name: /quick links/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /^communities$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /about & legal/i }),
    ).toBeInTheDocument()
  })

  it('does NOT render legacy PlatformIcon list inside footer', async () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    await screen.findByRole('heading', { level: 3, name: /^communities$/i })
    expect(container.querySelector('.footer-platform-list')).toBeNull()
    expect(container.querySelector('.platform-icon')).toBeNull()
  })

  it('renders tri-lingual brand line with lang attrs', async () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const triRow = container.querySelector('.footer-brand-tri')
    expect(triRow).not.toBeNull()
    expect(triRow.querySelector('[lang="ja"]')).not.toBeNull()
    expect(triRow.querySelector('[lang="zh"]')).not.toBeNull()
    expect(triRow.querySelector('[lang="en"]')).not.toBeNull()
    expect(
      triRow.querySelector('[lang="ja"]').textContent,
    ).toContain('バンドリ北米華人コミュニティ')
    expect(
      triRow.querySelector('[lang="zh"]').textContent,
    ).toContain('北美炸梦同好会')
  })

  it('renders disclaimer + copyright with current year', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument()
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })

  it('Quick Links column lists 5 routes (5 internal links)', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    const columns = container.querySelectorAll('.footer-column')
    const quickLinksColumn = columns[0]
    const links = quickLinksColumn.querySelectorAll('a')
    expect(links.length).toBe(5)
  })

  it('Communities column shows 5 enabled platforms by default (wechat disabled)', async () => {
    renderWithProviders(<Footer />, { route: '/' })
    const communitiesHeading = await screen.findByRole('heading', {
      level: 3,
      name: /^communities$/i,
    })
    const column = communitiesHeading.closest('.footer-column')
    expect(column).not.toBeNull()
    const links = column.querySelectorAll('a')
    expect(links.length).toBe(5)
    const labels = Array.from(links).map((a) => a.textContent)
    expect(labels).toContain('Discord')
    expect(labels).toContain('QQ')
    expect(labels).toContain('Xiaohongshu')
    expect(labels).toContain('X')
    expect(labels).toContain('Forum')
    expect(labels).not.toContain('WeChat')
  })

  it('Communities column links open in new tab with correct rel attrs', async () => {
    renderWithProviders(<Footer />, { route: '/' })
    const communitiesHeading = await screen.findByRole('heading', {
      level: 3,
      name: /^communities$/i,
    })
    const column = communitiesHeading.closest('.footer-column')
    const links = column.querySelectorAll('a')
    links.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener noreferrer')
      expect(a.getAttribute('href')).toMatch(/^https:\/\//)
    })
  })

  it('Communities column shows forum link when forum.enabled === true (default ship)', async () => {
    renderWithProviders(<Footer />, { route: '/' })
    const links = await screen.findAllByRole('link', { name: 'Forum' })
    expect(links.length).toBeGreaterThan(0)
  })

  it('LangToggle re-render: ZH switches headings', async () => {
    setLanguage('zh')
    renderWithProviders(<Footer />, { route: '/' })
    await screen.findByRole('heading', { level: 3, name: /^社群$/ })
    expect(
      screen.getByRole('heading', { level: 3, name: /快速导航/ }),
    ).toBeInTheDocument()
  })
})
