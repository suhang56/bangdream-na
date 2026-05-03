import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

vi.mock('../../data/social.json', () => ({
  default: [
    {
      platform: 'discord',
      label: 'Discord',
      url: 'https://discord.gg/abc',
      qrImage: null,
      enabled: true,
    },
    {
      platform: 'forum',
      label: '论坛',
      url: 'https://forum.bangdream.org',
      qrImage: null,
      enabled: true,
    },
  ],
}))

describe('<Navbar /> with forum enabled (vi.mock social.json)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders forum nav entry as <a target=_blank rel="noopener noreferrer">', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    const links = screen.getAllByRole('link', { name: 'Forum' })
    expect(links.length).toBeGreaterThan(0)
    const desktopLink = links[0]
    expect(desktopLink.tagName).toBe('A')
    expect(desktopLink.getAttribute('href')).toBe('https://forum.bangdream.org')
    expect(desktopLink.getAttribute('target')).toBe('_blank')
    expect(desktopLink.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('forum nav entry never gets navbar-link--active class', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    const links = screen.getAllByRole('link', { name: 'Forum' })
    links.forEach((a) => {
      expect(a.className).not.toMatch(/--active/)
    })
  })

  it('mobile drawer renders forum as external <a target=_blank>', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
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

  it('forum label switches to 论坛 in zh', () => {
    setLanguage('zh')
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.getAllByRole('link', { name: '论坛' }).length).toBeGreaterThan(0)
  })

  it('renders 8 desktop nav links when forum enabled (5 internal + 3 external: tickets/guide/forum)', () => {
    const { container } = renderWithProviders(<Navbar />, { route: '/' })
    const desktopList = container.querySelector('.navbar-links')
    expect(desktopList.querySelectorAll('a').length).toBe(8)
  })
})
