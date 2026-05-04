import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import NewsDesktop from './News.desktop.jsx'

const sampleNews = [
  {
    id: 'news-a',
    title: 'Announcement Alpha',
    date: '2026-04-01',
    tag: 'announcement',
    summary: 'Alpha summary line.',
    body: 'Alpha body.',
    image: 'https://cdn.example.com/a.jpg',
  },
]

function makeProps(overrides = {}) {
  return {
    news: overrides.news ?? sampleNews,
    visible: overrides.visible ?? sampleNews,
    filterState: overrides.filterState ?? {
      categories: new Set(),
      from: '',
      to: '',
      keyword: '',
    },
    onChange: overrides.onChange ?? vi.fn(),
    onClear: overrides.onClear ?? vi.fn(),
    totalCount: overrides.totalCount ?? sampleNews.length,
  }
}

describe('<NewsDesktop />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders heading + sidebar + list', () => {
    const { container } = renderWithProviders(
      <NewsDesktop {...makeProps()} />,
      { route: '/news' },
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
    expect(container.querySelector('.news-sidebar')).not.toBeNull()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(container.querySelector('.news-list')).not.toBeNull()
  })

  it('news=[] empty path shows empty message', () => {
    renderWithProviders(
      <NewsDesktop
        {...makeProps({ news: [], visible: [], totalCount: 0 })}
      />,
      { route: '/news' },
    )
    expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
  })

  it('filtered-empty path shows no-match message (edge)', () => {
    renderWithProviders(
      <NewsDesktop
        {...makeProps({
          visible: [],
          filterState: {
            categories: new Set(['release']),
            from: '',
            to: '',
            keyword: '',
          },
        })}
      />,
      { route: '/news' },
    )
    expect(screen.getByRole('status')).toHaveTextContent(/no news matches/i)
  })

  it('zh language swaps chrome heading (bilingual)', () => {
    setLanguage('zh')
    renderWithProviders(<NewsDesktop {...makeProps()} />, { route: '/news' })
    expect(
      screen.getAllByRole('heading', { level: 1 })[0].textContent,
    ).toMatch(/新闻/)
  })

  it('News.desktop.css contains no @media (max-width:<769) rules (structural)', () => {
    const cssPath = path.resolve(__dirname, 'News.desktop.css')
    const raw = fs.readFileSync(cssPath, 'utf8')
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '')
    const phoneBreakpoints = stripped.match(
      /@media[^{]*max-width:\s*(?:[1-6]\d{2}|7[0-5]\d|76[0-7])/g,
    )
    expect(phoneBreakpoints).toBeNull()
  })

  it('passes filterState through to NewsSidebar', () => {
    const filterState = {
      categories: new Set(['event']),
      from: '',
      to: '',
      keyword: '',
    }
    renderWithProviders(
      <NewsDesktop {...makeProps({ filterState })} />,
      { route: '/news' },
    )
    const eventChip = screen.getByRole('button', { name: /^event$/i })
    expect(eventChip).toHaveAttribute('aria-pressed', 'true')
  })
})
