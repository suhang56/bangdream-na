import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<Navbar />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders brand link, 5 nav tabs, theme switcher, lang toggle', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(
      screen.getByRole('link', { name: /bang dream north america.*home/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'News' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Events' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Members' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'About' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /choose theme/i })).toBeInTheDocument()
    // LangToggle
    expect(screen.getByRole('button', { name: '中' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
  })

  it('renders Chinese brand wordmark in desktop header', () => {
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    const brandText = container.querySelector('.navbar-brand-text')
    expect(brandText).not.toBeNull()
    expect(brandText.textContent).toBe('北美炸梦同好会')
    expect(brandText.getAttribute('lang')).toBe('zh')
  })

  it('renders Chinese brand wordmark in mobile drawer header when open', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await user.click(container.querySelector('.navbar-hamburger'))
    const brandTexts = container.querySelectorAll('.navbar-brand-text')
    expect(brandTexts.length).toBe(2)
    brandTexts.forEach((node) => {
      expect(node.textContent).toBe('北美炸梦同好会')
      expect(node.getAttribute('lang')).toBe('zh')
    })
  })

  it('Chinese brand wordmark stays Chinese after switching languages (locked brand)', () => {
    setLanguage('zh')
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    expect(container.querySelector('.navbar-brand-text').textContent).toBe(
      '北美炸梦同好会',
    )
    setLanguage('en')
    expect(container.querySelector('.navbar-brand-text').textContent).toBe(
      '北美炸梦同好会',
    )
  })

  it('navbar-tail contains LangToggle + ThemeSwitcher only (no Discord pill)', () => {
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    const tail = container.querySelector('.navbar-tail')
    expect(tail).not.toBeNull()
    // 2 controls: LangToggle group + ThemeSwitcher group; no Discord link
    const discordLinks = tail.querySelectorAll('a[href*="discord"]')
    expect(discordLinks.length).toBe(0)
    const discordButtons = Array.from(tail.querySelectorAll('button')).filter(
      (b) => /discord/i.test(b.textContent || ''),
    )
    expect(discordButtons.length).toBe(0)
  })

  it('mobile drawer has no Discord CTA block', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await user.click(container.querySelector('.navbar-hamburger'))
    expect(container.querySelector('.mobile-drawer-cta')).toBeNull()
    const dialog = screen.getByRole('dialog')
    const discordLinks = dialog.querySelectorAll('a[href*="discord"]')
    expect(discordLinks.length).toBe(0)
  })

  it('marks active route with --active modifier', () => {
    renderWithProviders(<Navbar />, { route: '/events' })
    const events = screen.getAllByRole('link', { name: 'Events' })
    expect(events.some((a) => a.className.includes('navbar-link--active'))).toBe(true)
  })

  it('Home is not active when route is /events (edge: end-matching)', () => {
    renderWithProviders(<Navbar />, { route: '/events' })
    const home = screen.getAllByRole('link', { name: 'Home' })[0]
    expect(home.className).not.toMatch(/navbar-link--active/)
  })

  it('hamburger button has correct aria + opens drawer', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    const hamburger = container.querySelector('.navbar-hamburger')
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(hamburger).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(hamburger)
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('LangToggle in navbar updates label language (edge — re-render)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Navbar />, { route: '/' })
    await user.click(screen.getByRole('button', { name: '中' }))
    // first link re-renders to ZH
    expect(screen.getAllByRole('link', { name: '首页' }).length).toBeGreaterThan(0)
  })

  it('forum nav entry hidden when social.json forum.enabled === false (default ship)', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.queryByRole('link', { name: 'Forum' })).toBeNull()
  })

  it('forum nav entry hidden when social.json forum.enabled === false in mobile drawer too', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await user.click(container.querySelector('.navbar-hamburger'))
    expect(screen.queryByRole('link', { name: 'Forum' })).toBeNull()
  })
})

