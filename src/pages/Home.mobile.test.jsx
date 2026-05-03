import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import HomeMobile from './Home.mobile.jsx'
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
  { id: 'n1', title: 'News One', body: 'Body one paragraph.', date: '2026-04-15', category: 'announcement' },
  { id: 'n2', title: 'News Two', body: 'Body two paragraph.', date: '2026-04-10', category: 'event' },
  { id: 'n3', title: 'News Three', body: 'Body three paragraph.', date: '2026-04-05', category: 'community' },
]

const sampleEvents = [
  { id: 'e1', title: 'Event One', date: '2026-05-01T19:00:00-07:00', location: 'LA', type: 'concert', description: 'Concert one.' },
  { id: 'e2', title: 'Event Two', date: '2026-05-15T19:00:00-07:00', location: 'NYC', type: 'fanmeet', description: 'Fan meet two.' },
  { id: 'e3', title: 'Event Three', date: '2026-06-01T19:00:00-07:00', location: 'SF', type: 'con', description: 'Convention three.' },
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

describe('<HomeMobile />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('mounts the .home-mobile root', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-mobile')).not.toBeNull()
  })

  it('renders peek carousel when hasPosts', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-mobile-carousel')).not.toBeNull()
    expect(container.querySelector('.hero-peek')).not.toBeNull()
  })

  it('renders stat tiles when no posts (no carousel)', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps({ featured: [], hasPosts: false })} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-mobile-carousel')).toBeNull()
    expect(container.querySelector('.home-mobile-stat-tiles')).not.toBeNull()
    const tiles = container.querySelectorAll('.home-mobile-stat-tile__num')
    expect(tiles.length).toBe(2)
  })

  it('renders bilingual stacked headers (en above zh) for both sections', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    const newsTitle = container.querySelector('#home-news-heading')
    expect(newsTitle).not.toBeNull()
    const newsEn = newsTitle.querySelector('.home-mobile-section__title-en')
    const newsZh = newsTitle.querySelector('.home-mobile-section__title-zh')
    expect(newsEn).not.toBeNull()
    expect(newsZh).not.toBeNull()
    expect(newsEn.textContent).toBe('NEWS')
    // mobile track stacks via flex-direction:column; assert DOM order: en before zh
    expect(newsTitle.children[0]).toBe(newsEn)
    expect(newsTitle.children[1]).toBe(newsZh)

    const schedTitle = container.querySelector('#home-schedule-heading')
    expect(schedTitle).not.toBeNull()
    expect(schedTitle.querySelector('.home-mobile-section__title-en').textContent).toBe('SCHEDULE')
  })

  it('zh news heading uses i18n key when language=zh', () => {
    setLanguage('zh')
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    const zh = container.querySelector('#home-news-heading .home-mobile-section__title-zh')
    expect(zh.textContent).toBe(t('home.newsHeading'))
    expect(zh.textContent).toBe('新闻')
  })

  it('"View more" links use i18n + arrow', () => {
    renderWithProviders(<HomeMobile {...buildProps()} />, { route: '/' })
    const links = screen.getAllByText(/View more →/)
    expect(links.length).toBe(2)
    expect(links[0].closest('a').getAttribute('href')).toBe('/news')
    expect(links[1].closest('a').getAttribute('href')).toBe('/events')
  })

  it('renders 3 news cards', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    const newsSection = container.querySelector('#home-news-heading')
      .closest('.home-mobile-section')
    expect(newsSection.querySelectorAll('.news-card').length).toBe(3)
  })

  it('renders 3 event cards', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    const schedSection = container.querySelector('#home-schedule-heading')
      .closest('.home-mobile-section')
    expect(schedSection.querySelectorAll('.event-card').length).toBe(3)
  })

  it('renders empty.noNews when no news', () => {
    renderWithProviders(
      <HomeMobile {...buildProps({ latestNews: [] })} />,
      { route: '/' },
    )
    expect(screen.getByText(t('empty.noNews'))).toBeInTheDocument()
  })

  it('renders empty.noEvents when no upcoming events', () => {
    renderWithProviders(
      <HomeMobile {...buildProps({ upcomingEvents: [] })} />,
      { route: '/' },
    )
    expect(screen.getByText(t('empty.noEvents'))).toBeInTheDocument()
  })

  it('renders PlatformTileRow at the bottom', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.platform-tile-row')).not.toBeNull()
  })

  // Edge cases
  it('language switches → all bilingual chrome updates (zh)', () => {
    setLanguage('zh')
    renderWithProviders(<HomeMobile {...buildProps()} />, { route: '/' })
    const links = screen.getAllByText(/查看更多 →/)
    expect(links.length).toBe(2)
  })

  it('1-post carousel renders solo variant (no thumbs)', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps({ featured: [samplePosts[0]] })} />,
      { route: '/' },
    )
    expect(container.querySelector('.hero-peek--solo')).not.toBeNull()
  })

  it('news card with missing image still renders', () => {
    const newsNoImage = [{ id: 'nx', title: 'No image', body: 'Body.', date: '2026-04-01', category: 'announcement' }]
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps({ latestNews: newsNoImage })} />,
      { route: '/' },
    )
    expect(container.querySelectorAll('.news-card').length).toBe(1)
  })

  it('event card with missing image still renders', () => {
    const evNoImage = [{ id: 'ex', title: 'No image event', date: '2026-05-01T19:00:00-07:00', type: 'concert' }]
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps({ upcomingEvents: evNoImage })} />,
      { route: '/' },
    )
    expect(container.querySelectorAll('.event-card').length).toBe(1)
  })

  it('very long news title renders without crash', () => {
    const longTitle = 'a'.repeat(200)
    const longNews = [{ id: 'nl', title: longTitle, body: 'b'.repeat(500), date: '2026-04-01', category: 'announcement' }]
    renderWithProviders(
      <HomeMobile {...buildProps({ latestNews: longNews })} />,
      { route: '/' },
    )
    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('section ids are stable and match aria-labelledby', () => {
    const { container } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    const newsSection = container.querySelector('[aria-labelledby="home-news-heading"]')
    const schedSection = container.querySelector('[aria-labelledby="home-schedule-heading"]')
    expect(newsSection).not.toBeNull()
    expect(schedSection).not.toBeNull()
  })

  it('renders no @media-related layout shift between hasPosts true and false', () => {
    const { container, rerender } = renderWithProviders(
      <HomeMobile {...buildProps()} />,
      { route: '/' },
    )
    expect(container.querySelector('.home-mobile-carousel')).not.toBeNull()
    rerender(<HomeMobile {...buildProps({ featured: [], hasPosts: false })} />)
    expect(container.querySelector('.home-mobile-carousel')).toBeNull()
    expect(container.querySelector('.home-mobile-stat-tiles')).not.toBeNull()
  })
})
