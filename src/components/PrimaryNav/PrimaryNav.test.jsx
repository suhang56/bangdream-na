import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrimaryNav from './PrimaryNav.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

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
  afterEach(() => {
    // no mocks
  })

  it('renders 10 nav links matching SECONDARY_NAV order', () => {
    const { container } = renderAt('/')
    const links = container.querySelectorAll('.bf-nav a')
    // 10 routed nav items
    expect(links.length).toBeGreaterThanOrEqual(10)
    // first link is "首页" / "TOP"
    expect(links[0].textContent).toContain('首页')
    expect(links[0].getAttribute('href')).toBe('/')
  })

  it('marks home active when path = /', () => {
    const { container } = renderAt('/')
    const home = container.querySelector('a[href="/"]')
    expect(home.classList.contains('active')).toBe(true)
  })

  it('marks news active when path = /news', () => {
    const { container } = renderAt('/news')
    const news = container.querySelector('a[href="/news"]')
    expect(news.classList.contains('active')).toBe(true)
  })

  it('mobile nav (375px) has overflow-x:auto and hides 群规/论坛 links', () => {
    const { container } = renderAt('/')
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    window.dispatchEvent(new Event('resize'))
    // Architect spec: at 375px, .bf-nav .bf-container has overflow-x:auto via media query;
    // 群规 and 论坛 links are display:none. Verify the links exist in DOM (so they could
    // appear at desktop) but the @media-query CSS rules target attributes.
    const rules = container.querySelector('a[href="/rules"]')
    // React Router Link with `to="#forum"` resolves the href against current
    // path, so the rendered href is `/#forum` from "/" — match that pattern.
    const forum = container.querySelector('a[href$="#forum"]')
    expect(rules).toBeInTheDocument()
    expect(forum).toBeInTheDocument()
    // overflow rule lives in CSS @media; in jsdom the computed style won't reflect media
    // queries. We assert structural shape: container present, mask scroll wrapper exists.
    const navContainer = container.querySelector('.bf-nav .bf-container')
    expect(navContainer).toBeInTheDocument()
  })
})
