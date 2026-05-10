import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrimaryNav from './PrimaryNav.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import {
  QQ_GROUP_URL,
  DISCORD_INVITE_URL,
  X_PROFILE_URL,
  FORUM_URL,
  TICKETS_DOC_URL,
  GUIDE_WIKI_URL,
} from '../../data/socialLinks.js'

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrimaryNav />
    </MemoryRouter>,
  )
}

describe('<PrimaryNav />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })

  it('D8: renders 10 nav-row links (7 internal + 3 external)', () => {
    const { container } = renderAt('/')
    const navRow = container.querySelector('.bf-nav .bf-container')
    const directLinks = [...navRow.children].filter(
      (el) => el.tagName === 'A',
    )
    expect(directLinks.length).toBe(10)
  })

  it('D8: nav-row first link is 首页 → /', () => {
    const { container } = renderAt('/')
    const navRow = container.querySelector('.bf-nav .bf-container')
    const first = [...navRow.children].find((el) => el.tagName === 'A')
    expect(first.textContent).toContain('首页')
    expect(first.getAttribute('href')).toBe('/')
  })

  it('D8: tickets link has external href + target=_blank + rel=noopener', () => {
    const { container } = renderAt('/')
    const tickets = container.querySelector(`.bf-nav a[href="${TICKETS_DOC_URL}"]`)
    expect(tickets).toBeInTheDocument()
    expect(tickets.getAttribute('target')).toBe('_blank')
    expect(tickets.getAttribute('rel')).toContain('noopener')
    expect(tickets.textContent).toContain('出票公告')
  })

  it('D8: guide link has external href + target=_blank + rel=noopener', () => {
    const { container } = renderAt('/')
    const guide = container.querySelector(`.bf-nav a[href="${GUIDE_WIKI_URL}"]`)
    expect(guide).toBeInTheDocument()
    expect(guide.getAttribute('target')).toBe('_blank')
    expect(guide.getAttribute('rel')).toContain('noopener')
    expect(guide.textContent).toContain('现地攻略')
  })

  it('D8: forum link has https://forum.bangdream.org href + target=_blank', () => {
    const { container } = renderAt('/')
    const forum = container.querySelector(`.bf-nav a[href="${FORUM_URL}"]`)
    expect(forum).toBeInTheDocument()
    expect(forum.getAttribute('target')).toBe('_blank')
    expect(forum.getAttribute('rel')).toContain('noopener')
    expect(forum.textContent).toContain('论坛')
  })

  it('D8: external nav items render .nv-ext-arrow span with aria-hidden', () => {
    const { container } = renderAt('/')
    const tickets = container.querySelector(`.bf-nav a[href="${TICKETS_DOC_URL}"]`)
    const arrow = tickets.querySelector('.nv-ext-arrow')
    expect(arrow).toBeInTheDocument()
    expect(arrow.getAttribute('aria-hidden')).toBe('true')
  })

  it('D8: external nav items do NOT carry aria-current', () => {
    const { container } = renderAt('/')
    const externalAnchors = [
      container.querySelector(`.bf-nav a[href="${TICKETS_DOC_URL}"]`),
      container.querySelector(`.bf-nav a[href="${GUIDE_WIKI_URL}"]`),
      container.querySelector(`.bf-nav a[href="${FORUM_URL}"]`),
    ]
    for (const a of externalAnchors) {
      expect(a.getAttribute('aria-current')).toBeNull()
    }
  })

  it('D8: nav-misc QQ link wired with target=_blank + rel=noopener', () => {
    const { container } = renderAt('/')
    const qq = container.querySelector(
      `.bf-nav-misc a[href="${QQ_GROUP_URL}"]`,
    )
    expect(qq).toBeInTheDocument()
    expect(qq.getAttribute('target')).toBe('_blank')
    expect(qq.getAttribute('rel')).toContain('noopener')
    expect(qq.textContent).toContain('QQ')
  })

  it('D8: nav-misc Discord link wired with target=_blank', () => {
    const { container } = renderAt('/')
    const discord = container.querySelector(
      `.bf-nav-misc a[href="${DISCORD_INVITE_URL}"]`,
    )
    expect(discord).toBeInTheDocument()
    expect(discord.getAttribute('target')).toBe('_blank')
    expect(discord.textContent).toContain('Discord')
  })

  it('D8: nav-misc X link wired with target=_blank', () => {
    const { container } = renderAt('/')
    const x = container.querySelector(
      `.bf-nav-misc a[href="${X_PROFILE_URL}"]`,
    )
    expect(x).toBeInTheDocument()
    expect(x.getAttribute('target')).toBe('_blank')
    expect(x.textContent).toContain('BandoriNACC')
  })

  it('D8: nav-misc renders exactly 3 anchor links (QQ/Discord/X)', () => {
    const { container } = renderAt('/')
    const links = container.querySelectorAll('.bf-nav-misc a')
    expect(links.length).toBe(3)
  })

  it('marks home active when path = /', () => {
    const { container } = renderAt('/')
    const home = container.querySelector('.bf-nav a[href="/"]')
    expect(home.classList.contains('active')).toBe(true)
  })

  it('marks news active when path = /news', () => {
    const { container } = renderAt('/news')
    const news = container.querySelector('.bf-nav a[href="/news"]')
    expect(news.classList.contains('active')).toBe(true)
  })

  it('mobile nav (375px) nav container present', () => {
    const { container } = renderAt('/')
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    window.dispatchEvent(new Event('resize'))
    const navContainer = container.querySelector('.bf-nav .bf-container')
    expect(navContainer).toBeInTheDocument()
  })
})
