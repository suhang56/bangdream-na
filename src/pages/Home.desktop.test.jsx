import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import HomeDesktop from './Home.desktop.jsx'
import { _resetForTests, setLanguage, t } from '../lib/uiLanguage.js'

const site = {
  communityName: 'BanG Dream NA',
  communityNameZh: '北美邦多利',
  communityNameJp: 'バンドリ NA',
}

const social = [
  { platform: 'discord', enabled: true, url: 'https://discord.gg/abc', label: 'Discord' },
]

const samplePosts = [
  { id: 'p1', title: 'Post One', image: '/img/p1.jpg', date: '2026-04-01' },
  { id: 'p2', title: 'Post Two', image: '/img/p2.jpg', date: '2026-04-02' },
]

const sampleNews = [
  { id: 'n1', title: 'News One', body: 'Body one.', date: '2026-04-15', category: 'announcement' },
  { id: 'n2', title: 'News Two', body: 'Body two.', date: '2026-04-10', category: 'event' },
  { id: 'n3', title: 'News Three', body: 'Body three.', date: '2026-04-05', category: 'community' },
]

const sampleEvents = [
  { id: 'e1', title: 'Event One', date: '2026-05-01T19:00:00-07:00', location: 'LA', type: 'concert', description: 'Concert.' },
  { id: 'e2', title: 'Event Two', date: '2026-05-15T19:00:00-07:00', location: 'NYC', type: 'fanmeet', description: 'Fan.' },
  { id: 'e3', title: 'Event Three', date: '2026-06-01T19:00:00-07:00', location: 'SF', type: 'con', description: 'Con.' },
]

function buildProps(overrides = {}) {
  return {
    site,
    social,
    featured: samplePosts,
    hasPosts: true,
    latestNews: sampleNews,
    upcomingEvents: sampleEvents,
    ...overrides,
  }
}

describe('<HomeDesktop />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders carousel section when hasPosts', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-carousel-section')).not.toBeNull()
    expect(container.querySelector('.hero-peek')).not.toBeNull()
  })

  it('renders stat tiles when no posts', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps({ featured: [], hasPosts: false })} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-carousel-section')).toBeNull()
    expect(container.querySelector('.home-stat-tiles')).not.toBeNull()
    expect(container.querySelectorAll('.home-stat-tile__num').length).toBe(2)
  })

  it('renders bilingual headers for News + Schedule', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    expect(
      container.querySelector('#home-news-heading .home-section__title-en').textContent,
    ).toBe('NEWS')
    expect(
      container.querySelector('#home-news-heading .home-section__title-zh').textContent,
    ).toBe(t('home.newsHeading'))
    expect(
      container.querySelector('#home-schedule-heading .home-section__title-en').textContent,
    ).toBe('SCHEDULE')
  })

  it('"View more" links use i18n keys', () => {
    renderWithProviders(<HomeDesktop {...buildProps()} />, { route: '/' })
    const links = screen.getAllByText(/View more →/)
    expect(links.length).toBe(2)
    expect(links[0].closest('a').getAttribute('href')).toBe('/news')
    expect(links[1].closest('a').getAttribute('href')).toBe('/events')
  })

  it('zh language switches "查看更多" link copy', () => {
    setLanguage('zh')
    renderWithProviders(<HomeDesktop {...buildProps()} />, { route: '/' })
    const links = screen.getAllByText(/查看更多 →/)
    expect(links.length).toBe(2)
  })

  it('renders 3 news cards', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    const newsSection = container.querySelector('#home-news-heading')
      .closest('.home-section')
    expect(newsSection.querySelectorAll('.news-card').length).toBe(3)
  })

  it('renders 3 event cards', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    const schedSection = container.querySelector('#home-schedule-heading')
      .closest('.home-section')
    expect(schedSection.querySelectorAll('.event-card').length).toBe(3)
  })

  it('renders empty.noNews when latestNews is empty', () => {
    renderWithProviders(
      <HomeDesktop {...buildProps({ latestNews: [] })} />,
      { route: '/' },
    )
    expect(screen.getByText(t('empty.noNews'))).toBeInTheDocument()
  })

  it('renders empty.noEvents when upcomingEvents is empty', () => {
    renderWithProviders(
      <HomeDesktop {...buildProps({ upcomingEvents: [] })} />,
      { route: '/' },
    )
    expect(screen.getByText(t('empty.noEvents'))).toBeInTheDocument()
  })

  it('renders PlatformTileRow at bottom', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.platform-tile-row')).not.toBeNull()
  })

  it('Hero renders all three lang attrs (ja|zh|en)', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })

  it('does NOT render mobile-track DOM (.home-mobile)', () => {
    const { container } = renderWithProviders(
      <HomeDesktop {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-mobile')).toBeNull()
  })
})
