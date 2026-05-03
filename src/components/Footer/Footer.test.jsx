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

  it('renders 3 column headings', () => {
    renderWithProviders(<Footer />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 3, name: /quick links/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /communities/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: /about & legal/i }),
    ).toBeInTheDocument()
  })

  it('renders 5 platform pills (one per social.json entry)', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    const pills = container.querySelectorAll(
      '.footer-platform-list .platform-icon',
    )
    expect(pills.length).toBe(5)
  })

  it('Discord pill is the active link (enabled+url)', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const link = screen.getByRole('link', { name: 'Discord' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
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

  it('LangToggle re-render: ZH switches headings', async () => {
    setLanguage('zh')
    renderWithProviders(<Footer />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 3, name: /快速导航/ }),
    ).toBeInTheDocument()
  })
})
