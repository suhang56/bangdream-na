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

  it('D8: renders 9 nav-row links after D9 hides 成员 (6 internal + 3 external)', () => {
    const { container } = renderAt('/')
    const navRow = container.querySelector('.bf-nav .bf-container')
    const directLinks = [...navRow.children].filter(
      (el) => el.tagName === 'A',
    )
    expect(directLinks.length).toBe(9)
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

  it('DENSITY-FIX: nav has NO .bf-nav-misc block (moved to Masthead)', () => {
    const { container } = renderAt('/')
    expect(container.querySelector('.bf-nav .bf-nav-misc')).toBeNull()
    expect(container.querySelector('.bf-nav .bf-nav-spacer')).toBeNull()
  })

  it('DENSITY-FIX: nav has NO QQ/Discord/X anchors (relocated to Masthead)', () => {
    const { container } = renderAt('/')
    expect(
      container.querySelector(`.bf-nav a[href="${QQ_GROUP_URL}"]`),
    ).toBeNull()
    expect(
      container.querySelector(`.bf-nav a[href="${DISCORD_INVITE_URL}"]`),
    ).toBeNull()
    expect(
      container.querySelector(`.bf-nav a[href="${X_PROFILE_URL}"]`),
    ).toBeNull()
  })

  it('DENSITY-FIX: visible NAV_ITEMS render unconditionally (no mobile hide in JSX)', () => {
    const { container } = renderAt('/')
    const anchors = container.querySelectorAll('.bf-nav a')
    expect(anchors.length).toBe(9)
    const hrefs = [...anchors].map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/rules')
    expect(hrefs).toContain(TICKETS_DOC_URL)
    expect(hrefs).toContain(GUIDE_WIKI_URL)
    expect(hrefs).toContain(FORUM_URL)
  })

  it('D9-HOTFIX: 成员 tab is hidden from nav (entry stays in NAV_ITEMS for re-enable)', () => {
    const { container } = renderAt('/')
    const membersLink = container.querySelector('.bf-nav a[href="/members"]')
    expect(membersLink).toBeNull()
    // 成员 label also absent
    const navContainer = container.querySelector('.bf-nav .bf-container')
    expect(navContainer.textContent).not.toContain('成员')
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
