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

  it('H3: renders exactly 7 nav links (tickets/guide/forum removed)', () => {
    const { container } = renderAt('/')
    const links = container.querySelectorAll('.bf-nav a')
    expect(links.length).toBe(7)
    expect(links[0].textContent).toContain('首页')
    expect(links[0].getAttribute('href')).toBe('/')
  })

  it('H3: no link to /tickets, /guide, or #forum in nav', () => {
    const { container } = renderAt('/')
    expect(container.querySelector('a[href="/tickets"]')).toBeNull()
    expect(container.querySelector('a[href="/guide"]')).toBeNull()
    expect(container.querySelector('a[href$="#forum"]')).toBeNull()
    // old: a[href="/#forum"]
    expect(container.querySelector('a[href="/#forum"]')).toBeNull()
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

  it('mobile nav (375px) nav container present', () => {
    const { container } = renderAt('/')
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    window.dispatchEvent(new Event('resize'))
    const navContainer = container.querySelector('.bf-nav .bf-container')
    expect(navContainer).toBeInTheDocument()
  })
})
