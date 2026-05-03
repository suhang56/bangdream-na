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

  it('renders exactly 2 column headings (Quick Links + About & Legal)', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    const headings = container.querySelectorAll('.footer-heading')
    expect(headings.length).toBe(2)
    expect(
      screen.getByRole('heading', { level: 3, name: /quick links/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /about & legal/i }),
    ).toBeInTheDocument()
  })

  it('does NOT render Communities heading (P6 — moved to PlatformTileRow)', () => {
    renderWithProviders(<Footer />, { route: '/' })
    expect(
      screen.queryByRole('heading', { level: 3, name: /communities/i }),
    ).toBeNull()
  })

  it('does NOT render PlatformIcon list inside footer (P6)', () => {
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
    const quickLinks = container.querySelector('.footer-column .footer-list')
    const links = quickLinks.querySelectorAll('a')
    expect(links.length).toBe(5)
  })

  it('LangToggle re-render: ZH switches headings', () => {
    setLanguage('zh')
    renderWithProviders(<Footer />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 3, name: /快速导航/ }),
    ).toBeInTheDocument()
  })
})
