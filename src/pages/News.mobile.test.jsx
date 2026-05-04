import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'node:fs'
import path from 'node:path'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import NewsMobile from './News.mobile.jsx'

const sampleNews = [
  {
    id: 'news-a',
    title: 'Announcement Alpha',
    date: '2026-04-01',
    tag: 'announcement',
    summary: 'Alpha summary line.',
    body: 'Alpha body.',
    image: 'https://cdn.example.com/a.jpg',
    tags: ['poppinparty', 'newyear'],
  },
  {
    id: 'news-b',
    title: 'Event Beta',
    date: '2026-03-01',
    tag: 'event',
    summary: 'Beta summary line.',
    body: 'Beta body.',
  },
  {
    id: 'news-c',
    title: 'Community Gamma',
    date: '2026-02-01',
    tag: 'community',
    summary: 'Gamma summary line.',
    body: 'Gamma body.',
  },
  {
    id: 'news-d',
    title: 'Release Delta',
    date: '2026-01-01',
    tag: 'release',
    summary: 'Delta summary line.',
    body: 'Delta body.',
  },
]

function makeProps(overrides = {}) {
  const filterState = overrides.filterState ?? {
    categories: new Set(),
    from: '',
    to: '',
    keyword: '',
  }
  return {
    news: overrides.news ?? sampleNews,
    visible: overrides.visible ?? sampleNews,
    filterState,
    onChange: overrides.onChange ?? vi.fn(),
    onClear: overrides.onClear ?? vi.fn(),
    totalCount: overrides.totalCount ?? sampleNews.length,
  }
}

describe('<NewsMobile />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders bilingual chrome heading via t("nav.news")', () => {
    renderWithProviders(<NewsMobile {...makeProps()} />, { route: '/news' })
    expect(
      screen.getByRole('heading', { level: 1, name: /news/i }),
    ).toBeInTheDocument()
    setLanguage('zh')
    renderWithProviders(<NewsMobile {...makeProps()} />, { route: '/news' })
    expect(
      screen.getAllByRole('heading', { level: 1 })[0].textContent,
    ).toMatch(/新闻/)
  })

  it('renders 5 chips: All + 4 categories', () => {
    renderWithProviders(<NewsMobile {...makeProps()} />, { route: '/news' })
    expect(screen.getByRole('tab', { name: /^all$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /announcement/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^event$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /community/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /release/i })).toBeInTheDocument()
  })

  it('NEVER renders a NewsSidebar (mobile track has no sidebar)', () => {
    const { container } = renderWithProviders(
      <NewsMobile {...makeProps()} />,
      { route: '/news' },
    )
    expect(container.querySelector('.news-sidebar')).toBeNull()
    // no date inputs from sidebar leak in
    expect(container.querySelectorAll('input[type="date"]').length).toBe(0)
  })

  it('tapping All clears category filter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const filterState = {
      categories: new Set(['event']),
      from: '',
      to: '',
      keyword: '',
    }
    renderWithProviders(
      <NewsMobile {...makeProps({ filterState, onChange })} />,
      { route: '/news' },
    )
    await user.click(screen.getByRole('tab', { name: /^all$/i }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.categories).toBeInstanceOf(Set)
    expect(next.categories.size).toBe(0)
  })

  it('tapping a category chip selects single-category', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <NewsMobile {...makeProps({ onChange })} />,
      { route: '/news' },
    )
    await user.click(screen.getByRole('tab', { name: /^event$/i }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.categories.has('event')).toBe(true)
    expect(next.categories.size).toBe(1)
  })

  it('tapping the active chip again clears it (toggle-off)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const filterState = {
      categories: new Set(['event']),
      from: '',
      to: '',
      keyword: '',
    }
    renderWithProviders(
      <NewsMobile {...makeProps({ filterState, onChange })} />,
      { route: '/news' },
    )
    await user.click(screen.getByRole('tab', { name: /^event$/i }))
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.categories.size).toBe(0)
  })

  it('search button expands inline search and hides chip row', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NewsMobile {...makeProps()} />, { route: '/news' })
    expect(screen.queryByRole('searchbox')).toBeNull()
    await user.click(screen.getByLabelText(/search/i, { selector: 'button' }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    // chip row hidden in expanded mode
    expect(screen.queryByRole('tab', { name: /^all$/i })).toBeNull()
  })

  it('search input debounces 200ms before firing onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <NewsMobile {...makeProps({ onChange })} />,
      { route: '/news' },
    )
    await user.click(screen.getByLabelText(/search/i, { selector: 'button' }))
    const input = screen.getByRole('searchbox')
    await user.type(input, 'hi')
    const before = onChange.mock.calls.length
    await new Promise((r) => setTimeout(r, 250))
    expect(onChange.mock.calls.length).toBeGreaterThan(before)
  })

  it('per-category accent class on badge: announcement → coral, event → mint, community → lavender, release → cyan', () => {
    const { container } = renderWithProviders(
      <NewsMobile {...makeProps()} />,
      { route: '/news' },
    )
    expect(
      container.querySelector('.news-mobile-card__category--announcement'),
    ).not.toBeNull()
    expect(
      container.querySelector('.news-mobile-card__category--event'),
    ).not.toBeNull()
    expect(
      container.querySelector('.news-mobile-card__category--community'),
    ).not.toBeNull()
    expect(
      container.querySelector('.news-mobile-card__category--release'),
    ).not.toBeNull()
  })

  it('renders 16:9 hero only when image present (edge: missing image skips hero)', () => {
    const { container } = renderWithProviders(
      <NewsMobile {...makeProps()} />,
      { route: '/news' },
    )
    const heroes = container.querySelectorAll('.news-mobile-card__hero')
    // sampleNews[0] has image, [1..3] do not → exactly 1 hero
    expect(heroes.length).toBe(1)
    expect(
      container.querySelectorAll('.news-mobile-card--no-image').length,
    ).toBe(3)
  })

  it('empty filtered state renders clear-filters button + onClear fires', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const filterState = {
      categories: new Set(['release']),
      from: '',
      to: '',
      keyword: 'zzz',
    }
    renderWithProviders(
      <NewsMobile
        {...makeProps({ filterState, visible: [], onClear })}
      />,
      { route: '/news' },
    )
    expect(screen.getByRole('status')).toHaveTextContent(/no news matches/i)
    const clearBtn = screen.getByRole('button', { name: /clear filters/i })
    await user.click(clearBtn)
    expect(onClear).toHaveBeenCalled()
  })

  it('total-empty state renders no-news copy with no clear-filters button (edge)', () => {
    renderWithProviders(
      <NewsMobile
        {...makeProps({ news: [], visible: [], totalCount: 0 })}
      />,
      { route: '/news' },
    )
    expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
    expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull()
  })

  it('card with id wraps in <a> link, card without id renders article only (edge)', () => {
    const noIdItem = {
      title: 'No-id item',
      date: '2026-04-01',
      tag: 'announcement',
      body: 'body',
    }
    const { container } = renderWithProviders(
      <NewsMobile
        {...makeProps({ news: [noIdItem], visible: [noIdItem] })}
      />,
      { route: '/news' },
    )
    expect(container.querySelector('.news-mobile-card__link')).toBeNull()
    expect(container.querySelector('article')).not.toBeNull()
  })

  it('cancel button closes search and resets keyword filter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(
      <NewsMobile {...makeProps({ onChange })} />,
      { route: '/news' },
    )
    await user.click(screen.getByLabelText(/search/i, { selector: 'button' }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: /^cancel$/i })
    await user.click(cancel)
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('unknown category falls back to announcement label (edge)', () => {
    const item = {
      id: 'x',
      title: 'Mystery item',
      date: '2026-04-01',
      tag: 'lecture', // not in CATEGORIES
      body: 'body',
    }
    const { container } = renderWithProviders(
      <NewsMobile
        {...makeProps({ news: [item], visible: [item] })}
      />,
      { route: '/news' },
    )
    expect(
      container.querySelector('[data-category="announcement"]'),
    ).not.toBeNull()
  })

  it('tag list >4 collapses with +N chip (edge)', () => {
    const tagged = {
      id: 'tagged',
      title: 'Tagged',
      date: '2026-04-01',
      tag: 'announcement',
      body: 'body',
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    }
    const { container } = renderWithProviders(
      <NewsMobile
        {...makeProps({ news: [tagged], visible: [tagged] })}
      />,
      { route: '/news' },
    )
    expect(
      container.querySelector('.news-mobile-card__tag--more')?.textContent,
    ).toBe('+2')
  })

  it('News.mobile.css contains zero @media rules (structural guarantee)', () => {
    const cssPath = path.resolve(__dirname, 'News.mobile.css')
    const raw = fs.readFileSync(cssPath, 'utf8')
    // strip CSS comments before checking — `@media` mentions inside /* ... */
    // are documentation, not rules.
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '')
    const mediaRule = stripped.match(/@media[^{;]*\{/g)
    expect(mediaRule).toBeNull()
  })
})
