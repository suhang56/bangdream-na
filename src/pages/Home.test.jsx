import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import Home from './Home.jsx'
import site from '../data/site.json'
import members from '../data/members.json'
import posts from '../data/posts.json'
import { _resetForTests, setLanguage, t } from '../lib/uiLanguage.js'

describe('<Home />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders Chinese H1 (canonical)', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityNameZh }),
    ).toBeInTheDocument()
  })

  it('renders Japanese name', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.communityNameJp)).toBeInTheDocument()
  })

  it('renders English name as sister line', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.communityName)).toBeInTheDocument()
  })

  it('renders tagline from i18n (en)', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(t('tagline'))).toBeInTheDocument()
  })

  it('tagline switches with language (zh)', () => {
    setLanguage('zh')
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(t('tagline'))).toBeInTheDocument()
  })

  it('does NOT render Discord CTA inside Hero (P6 — moved to PlatformTileRow)', () => {
    const { container } = renderWithProviders(<Home />, { route: '/' })
    const hero = container.querySelector('.hero')
    expect(hero).not.toBeNull()
    expect(hero.querySelector('a[href*="discord"]')).toBeNull()
  })

  it('all three lang attributes (ja|zh|en) present', () => {
    const { container } = renderWithProviders(<Home />, { route: '/' })
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })

  it('renders HeroPeekCarousel when posts present, else stat tiles', () => {
    const { container } = renderWithProviders(<Home />, { route: '/' })
    if (Array.isArray(posts) && posts.length > 0) {
      expect(container.querySelector('.hero-peek')).not.toBeNull()
    } else {
      expect(container.querySelector('.home-stat-tiles')).not.toBeNull()
      const tiles = container.querySelectorAll('.home-stat-tile__num')
      expect(tiles.length).toBe(2)
      expect(tiles[0].textContent).toBe(String(members.length))
    }
  })

  it('renders PlatformTileRow at home bottom (always)', () => {
    const { container } = renderWithProviders(<Home />, { route: '/' })
    expect(container.querySelector('.platform-tile-row')).not.toBeNull()
    // 5 platforms from social.json
    expect(container.querySelectorAll('.platform-tile').length).toBe(5)
  })
})
