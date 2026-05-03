import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Footer from './Footer.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<Footer />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders 3 column headings (Quick Links + Communities + About & Legal) when communities enabled', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
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

  it('does NOT render legacy PlatformIcon list inside footer', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    expect(container.querySelector('.footer-platform-list')).toBeNull()
    expect(container.querySelector('.platform-icon')).toBeNull()
  })

  it('renders tri-lingual brand line with lang attrs', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
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

  it('Communities column shows 5 enabled platforms by default (wechat disabled)', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const communitiesHeading = screen.getByRole('heading', {
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

  it('Communities column links open in new tab with correct rel attrs', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const communitiesHeading = screen.getByRole('heading', {
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

  it('Communities column shows forum link when forum.enabled === true (default ship)', () => {
    renderWithProviders(<Footer />, { route: '/' })
    expect(screen.getAllByRole('link', { name: 'Forum' }).length).toBeGreaterThan(0)
  })

  it('LangToggle re-render: ZH switches headings', () => {
    setLanguage('zh')
    renderWithProviders(<Footer />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 3, name: /快速导航/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /^社群$/ }),
    ).toBeInTheDocument()
  })
})

