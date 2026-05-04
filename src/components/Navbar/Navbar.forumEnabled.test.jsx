import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import { cache } from '../../lib/cache.js'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    fetchSite: vi.fn(),
    fetchSocial: vi.fn(),
  }
})

import { fetchSite, fetchSocial } from '../../lib/api.js'

describe('<Navbar /> with forum enabled', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockResolvedValue({ items: [] })
    vi.mocked(fetchSocial).mockResolvedValue({
      items: [
        {
          id: 1,
          platform: 'discord',
          label_zh: 'Discord',
          url: 'https://discord.gg/abc',
          icon: null,
          sort_order: 0,
          active: 1,
        },
        {
          id: 2,
          platform: 'forum',
          label_zh: '论坛',
          url: 'https://forum.bangdream.org',
          icon: null,
          sort_order: 1,
          active: 1,
        },
      ],
      total: 2,
    })
  })

  it('renders forum nav entry as <a target=_blank rel="noopener noreferrer">', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    const links = await screen.findAllByRole('link', { name: 'Forum' })
    expect(links.length).toBeGreaterThan(0)
    const desktopLink = links[0]
    expect(desktopLink.tagName).toBe('A')
    expect(desktopLink.getAttribute('href')).toBe('https://forum.bangdream.org')
    expect(desktopLink.getAttribute('target')).toBe('_blank')
    expect(desktopLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('forum nav entry never gets navbar-link--active class', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    const links = await screen.findAllByRole('link', { name: 'Forum' })
    links.forEach((a) => {
      expect(a.className).not.toMatch(/--active/)
    })
  })

  it('mobile drawer renders forum as external <a target=_blank>', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    await screen.findAllByRole('link', { name: 'Forum' })
    await user.click(container.querySelector('.navbar-hamburger'))
    const drawerNav = container.querySelector('.mobile-drawer-nav')
    expect(drawerNav).not.toBeNull()
    const forumLink = Array.from(drawerNav.querySelectorAll('a')).find(
      (a) => a.textContent === 'Forum',
    )
    expect(forumLink).not.toBeUndefined()
    expect(forumLink.tagName).toBe('A')
    expect(forumLink.getAttribute('target')).toBe('_blank')
    expect(forumLink.getAttribute('rel')).toBe('noopener noreferrer')
    expect(forumLink.getAttribute('href')).toBe('https://forum.bangdream.org')
  })

  it('forum label switches to 论坛 in zh', async () => {
    setLanguage('zh')
    renderWithProviders(<Navbar />, { route: '/' })
    const links = await screen.findAllByRole('link', { name: '论坛' })
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders 9 desktop nav links when forum enabled', async () => {
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    const desktopList = container.querySelector('.navbar-links')
    await waitFor(() => {
      expect(desktopList.querySelectorAll('a').length).toBe(9)
    })
  })
})
