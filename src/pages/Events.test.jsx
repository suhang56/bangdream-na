import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchEvents: vi.fn(),
  }
})

import { fetchEvents } from '../lib/api.js'

function eventApiRow(overrides = {}) {
  const startSec = Math.floor(Date.parse('2099-08-01T19:00:00-07:00') / 1000)
  return {
    slug: overrides.slug ?? overrides.id ?? 's',
    title_zh: overrides.title ?? 'Event Title',
    title_en: null,
    description_md: overrides.description ?? null,
    hero_image_url: overrides.image ?? null,
    start_at: overrides.start_at ?? (overrides.date ? Math.floor(Date.parse(overrides.date) / 1000) : startSec),
    end_at: overrides.end_at ?? null,
    venue: overrides.venue ?? null,
    city: overrides.city ?? null,
    scope: overrides.scope ?? null,
    ticket_url: overrides.ticketUrl ?? null,
    band_theme: overrides.band_theme ?? null,
  }
}

function mockFetchEventsWith(rowsByScope) {
  vi.mocked(fetchEvents).mockImplementation((opts = {}) => {
    if (opts.scope === 'past') {
      return Promise.resolve({ items: rowsByScope.past ?? [], total: rowsByScope.past?.length ?? 0 })
    }
    return Promise.resolve({ items: rowsByScope.upcoming ?? [], total: rowsByScope.upcoming?.length ?? 0 })
  })
}

describe('<Events /> — bf-* page-hero', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
    mockFetchEventsWith({ upcoming: [], past: [] })
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('renders bf-page-hd section with h1 "活动"', async () => {
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      const hd = container.querySelector('.bf-page-hd')
      expect(hd).not.toBeNull()
      const h1 = hd.querySelector('h1')
      expect(h1).not.toBeNull()
      expect(h1.textContent).toBe('活动')
    })
  })

  it('renders ph-tag with text "// 活动"', async () => {
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      const tag = container.querySelector('.ph-tag')
      expect(tag).not.toBeNull()
      expect(tag.textContent).toContain('活动')
    })
  })
})

describe('<Events /> — upcoming + past table split', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('renders upcoming event title inside .bf-tbl (not .bf-tbl-muted)', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'upcoming-1', title: 'Anime Expo 2099' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Anime Expo 2099')).toBeInTheDocument()
    })
    // Must appear inside .bf-tbl but NOT inside .bf-tbl-muted
    const mutedTable = container.querySelector('.bf-tbl-muted')
    if (mutedTable) {
      expect(within(mutedTable).queryByText('Anime Expo 2099')).toBeNull()
    }
  })

  it('renders past event title inside .bf-tbl.bf-tbl-muted', async () => {
    mockFetchEventsWith({
      upcoming: [],
      past: [eventApiRow({ slug: 'past-1', title: 'Old Festival 2025' })],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Old Festival 2025')).toBeInTheDocument()
    })
    const mutedTable = container.querySelector('.bf-tbl.bf-tbl-muted')
    expect(mutedTable).not.toBeNull()
    expect(within(mutedTable).getByText('Old Festival 2025')).toBeInTheDocument()
  })

  it('past table has .bf-tbl-muted class', async () => {
    mockFetchEventsWith({
      upcoming: [],
      past: [eventApiRow({ slug: 'past-x', title: 'Past Event' })],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(container.querySelector('.bf-tbl.bf-tbl-muted')).not.toBeNull()
    })
  })

  it('shows empty state text when no upcoming events', async () => {
    mockFetchEventsWith({ upcoming: [], past: [] })
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText(/暂无即将到来的活动/)).toBeInTheDocument()
    })
  })
})

describe('<Events /> — PR #110 slug regression', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('upcoming event tile links to /events/:slug (not numeric id)', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'roselia-la-2099', title: 'Roselia LA' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Roselia LA')).toBeInTheDocument()
    })
    const link = container.querySelector('a[href="/events/roselia-la-2099"]')
    expect(link).not.toBeNull()
  })

  it('slug link does NOT use numeric-style href', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'mygo-tour', title: 'MyGO Tour' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('MyGO Tour')).toBeInTheDocument()
    })
    // Must not link to /events/1 or /events/2 etc.
    const numericLinks = container.querySelectorAll('a[href^="/events/"]')
    for (const link of numericLinks) {
      const href = link.getAttribute('href')
      // slug portion must not be purely numeric
      const slug = href.replace('/events/', '')
      expect(/^\d+$/.test(slug)).toBe(false)
    }
  })
})

describe('<Events /> — H9 band column', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('H9: upcoming table has 5 th elements with 团体 as third header', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'test-1', title: 'Test Event', band_theme: 'roselia' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
    const upcomingTable = container.querySelector('.bf-tbl:not(.bf-tbl-muted)')
    const ths = upcomingTable.querySelectorAll('thead th')
    expect(ths.length).toBe(5)
    expect(ths[1].textContent).toBe('团体')
  })

  it('H9: EventRow with bands=[] renders — without crash', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'no-band', title: 'No Band Event', band_theme: null })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('No Band Event')).toBeInTheDocument()
    })
    const bandCells = container.querySelectorAll('.td-band')
    expect(bandCells.length).toBeGreaterThan(0)
    const emptyCell = Array.from(bandCells).find((el) => el.textContent === '—')
    expect(emptyCell).toBeInTheDocument()
  })
})

describe('<Events /> — DENSITY-FIX row-link', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('DENSITY-FIX: upcoming row has .bf-tr-link class', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'r1', title: 'Row One' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Row One')).toBeInTheDocument()
    })
    const upcomingTable = container.querySelector('.bf-tbl:not(.bf-tbl-muted)')
    const row = upcomingTable.querySelector('tbody tr')
    expect(row.classList.contains('bf-tr-link')).toBe(true)
  })

  it('DENSITY-FIX: past row has .bf-tr-link class', async () => {
    mockFetchEventsWith({
      upcoming: [],
      past: [eventApiRow({ slug: 'p1', title: 'Past One' })],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Past One')).toBeInTheDocument()
    })
    const mutedTable = container.querySelector('.bf-tbl.bf-tbl-muted')
    const row = mutedTable.querySelector('tbody tr')
    expect(row.classList.contains('bf-tr-link')).toBe(true)
  })

  it('DENSITY-FIX: title link inside .bf-tr-link points to /events/<slug>', async () => {
    mockFetchEventsWith({
      upcoming: [eventApiRow({ slug: 'r2', title: 'Title Link Row' })],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Title Link Row')).toBeInTheDocument()
    })
    const titleLink = container.querySelector('.bf-tr-link .td-title a')
    expect(titleLink).toBeInTheDocument()
    expect(titleLink.getAttribute('href')).toBe('/events/r2')
  })

  it('DENSITY-FIX: .td-buy anchor in row carries ticketUrl + target=_blank', async () => {
    mockFetchEventsWith({
      upcoming: [
        eventApiRow({
          slug: 'r3',
          title: 'Buy Row',
          ticketUrl: 'https://ticket.example.com/r3',
        }),
      ],
      past: [],
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(screen.getByText('Buy Row')).toBeInTheDocument()
    })
    const buy = container.querySelector('.bf-tr-link .td-buy')
    expect(buy).toBeInTheDocument()
    expect(buy.getAttribute('href')).toBe('https://ticket.example.com/r3')
    expect(buy.getAttribute('target')).toBe('_blank')
  })
})

describe('<Events /> — loading and error states', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('zh')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
  })

  afterEach(() => {
    cache.clear()
    vi.restoreAllMocks()
  })

  it('shows loading state while fetching', async () => {
    let resolveU, resolveP
    vi.mocked(fetchEvents).mockImplementation((opts = {}) => {
      return opts.scope === 'past'
        ? new Promise((r) => { resolveP = r })
        : new Promise((r) => { resolveU = r })
    })
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveU({ items: [], total: 0 })
    resolveP({ items: [], total: 0 })
    await waitFor(() => {
      expect(container.querySelector('.loading-state')).toBeNull()
    })
  })

  it('shows error state on fetch failure', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('5xx'))
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
