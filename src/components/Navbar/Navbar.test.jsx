import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import { cache } from '../../lib/cache.js'
import siteJson from '../../data/site.json'
import socialJson from '../../data/social.json'

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

describe('<Navbar />', () => {
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

  it('renders brand link, 5 nav tabs, theme switcher, lang toggle', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'News' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Events' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Members' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'About' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /choose theme/i })).toBeInTheDocument()
    // LangToggle
    expect(screen.getByRole('button', { name: '中' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    // Brand link aria-label includes site name once site fetch resolves.
    await screen.findByRole('link', {
      name: /bang dream north america.*home/i,
    })
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

  it('forum nav entry shown when forum is active (default ship)', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    const links = await screen.findAllByRole('link', { name: 'Forum' })
    expect(links.length).toBeGreaterThan(0)
  })

  it('forum nav entry shown in mobile drawer when forum is active (default ship)', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await screen.findAllByRole('link', { name: 'Forum' })
    await user.click(container.querySelector('.navbar-hamburger'))
    expect(screen.getAllByRole('link', { name: 'Forum' }).length).toBeGreaterThan(0)
  })

  it('forum tail-icon button rendered when enabled, with external attrs', async () => {
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await waitFor(() => {
      expect(container.querySelector('.navbar-forum-icon')).not.toBeNull()
    })
    const iconLink = container.querySelector('.navbar-forum-icon')
    expect(iconLink.getAttribute('href')).toBe('https://forum.bangdream.org')
    expect(iconLink.getAttribute('target')).toBe('_blank')
    expect(iconLink.getAttribute('rel')).toBe('noopener noreferrer')
    expect(iconLink.querySelector('svg')).not.toBeNull()
  })

  // ---- M4-Navbar: drawer close-on-link-click bug fix ----
  describe('drawer close-on-link-click (M4-Navbar bug fix)', () => {
    it('same-route tap closes drawer (edge — pathname unchanged)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/news' })
      const hamburger = container.querySelector('.navbar-hamburger')
      await user.click(hamburger)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const dialog = screen.getByRole('dialog')
      const newsLink = Array.from(dialog.querySelectorAll('a')).find(
        (a) => a.textContent === 'News',
      )
      expect(newsLink).toBeDefined()
      await user.click(newsLink)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('different-route tap closes drawer (regression — still closes)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await user.click(container.querySelector('.navbar-hamburger'))
      const dialog = screen.getByRole('dialog')
      const eventsLink = Array.from(dialog.querySelectorAll('a')).find(
        (a) => a.textContent === 'Events',
      )
      await user.click(eventsLink)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('external target=_blank link tap closes drawer (edge — external link)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await screen.findAllByRole('link', { name: 'Forum' })
      await user.click(container.querySelector('.navbar-hamburger'))
      const dialog = screen.getByRole('dialog')
      const forumLink = Array.from(dialog.querySelectorAll('a')).find(
        (a) =>
          a.textContent === 'Forum' && a.getAttribute('target') === '_blank',
      )
      expect(forumLink).toBeDefined()
      await user.click(forumLink)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('brand logo tap in drawer header closes drawer (edge — same-route home)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await user.click(container.querySelector('.navbar-hamburger'))
      const dialog = screen.getByRole('dialog')
      const drawerBrand = dialog.querySelector('.navbar-brand')
      expect(drawerBrand).not.toBeNull()
      await user.click(drawerBrand)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('close button still works (regression)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await user.click(container.querySelector('.navbar-hamburger'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: /close menu/i }),
      )
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('backdrop click still works (regression)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await user.click(container.querySelector('.navbar-hamburger'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const backdrop = container.querySelector('.mobile-drawer-backdrop')
      await user.click(backdrop)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('Escape key still closes drawer (regression)', async () => {
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Navbar />, { route: '/' })
      await user.click(container.querySelector('.navbar-hamburger'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
