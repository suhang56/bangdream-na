import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchEvents: vi.fn(),
  }
})

import { useIsMobile } from '../lib/useBreakpoint.js'
import { fetchEvents } from '../lib/api.js'

function eventApiRow(overrides) {
  // Defaults: 2099-08-01 19:00 -07:00 (upcoming).
  const startSec = Math.floor(Date.parse('2099-08-01T19:00:00-07:00') / 1000)
  return {
    slug: overrides.slug ?? overrides.id ?? 's',
    title_zh: overrides.title ?? '',
    title_en: null,
    description_md: overrides.description ?? null,
    hero_image_url: overrides.image ?? null,
    start_at: overrides.start_at ?? (overrides.date ? Math.floor(Date.parse(overrides.date) / 1000) : startSec),
    end_at: overrides.end_at ?? null,
    venue: null,
    city: overrides.location ?? null,
    scope: null,
    ticket_url: overrides.ticketUrl ?? null,
    band_theme:
      Array.isArray(overrides.bands) && overrides.bands.length > 0
        ? overrides.bands[0]
        : null,
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

describe('<Events /> — track selection (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
    mockFetchEventsWith({
      upcoming: [
        eventApiRow({
          id: 'up-1',
          title: 'Upcoming Concert ABC',
          date: '2099-08-01T19:00:00-07:00',
          location: 'LA',
        }),
      ],
      past: [],
    })
  })

  afterEach(() => {
    cache.clear()
  })

  it('mounts mobile track when useIsMobile returns true', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(container.querySelector('.events-mobile')).not.toBeNull()
    })
    expect(container.querySelector('.events-desktop')).toBeNull()
  })

  it('mounts desktop track when useIsMobile returns false', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await waitFor(() => {
      expect(container.querySelector('.events-desktop')).not.toBeNull()
    })
    expect(container.querySelector('.events-mobile')).toBeNull()
  })

  it('renders heading from i18n in both tracks (mobile)', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('renders heading from i18n in both tracks (desktop)', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('?view=calendar URL param renders calendar in desktop track', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    await waitFor(() => {
      expect(container.querySelector('.event-calendar')).not.toBeNull()
    })
  })

  it('?view=calendar URL param renders calendar in mobile track', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    await waitFor(() => {
      expect(container.querySelector('.event-calendar')).not.toBeNull()
    })
  })

  it('clicking calendar tab in desktop swaps view to calendar', async () => {
    useIsMobile.mockReturnValue(false)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    expect(container.querySelector('.event-calendar')).toBeNull()
    await user.click(screen.getByRole('tab', { name: /calendar/i }))
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })

  it('clicking list tab from calendar in desktop swaps back to list', async () => {
    useIsMobile.mockReturnValue(false)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    await waitFor(() => {
      expect(container.querySelector('.event-calendar')).not.toBeNull()
    })
    await user.click(screen.getByRole('tab', { name: /list/i }))
    expect(container.querySelector('.event-calendar')).toBeNull()
  })

  it('clicking past scope chip in mobile updates rendered list', async () => {
    useIsMobile.mockReturnValue(true)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    await user.click(screen.getByRole('tab', { name: 'Past' }))
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('clicking upcoming scope chip from past scope returns', async () => {
    useIsMobile.mockReturnValue(true)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events?scope=past' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(
      screen.getByRole('tab', { name: 'Upcoming' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('keyword filter via mobile sheet narrows visible list', async () => {
    useIsMobile.mockReturnValue(true)
    mockFetchEventsWith({
      upcoming: [
        eventApiRow({ id: 'a', title: 'Alpha Concert', date: '2099-07-15T19:00:00-07:00' }),
        eventApiRow({ id: 'b', title: 'Beta Concert', date: '2099-08-15T19:00:00-07:00' }),
      ],
      past: [],
    })
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    const search = screen.getByRole('searchbox')
    await user.type(search, 'Alpha')
    await new Promise((r) => setTimeout(r, 250))
    expect(screen.queryByText('Beta Concert')).toBeNull()
  })

  it('category filter via mobile sheet narrows visible list (band)', async () => {
    useIsMobile.mockReturnValue(true)
    mockFetchEventsWith({
      upcoming: [
        eventApiRow({ id: 'a', title: 'Roselia Live', date: '2099-07-15T19:00:00-07:00', bands: ['Roselia'] }),
        eventApiRow({ id: 'b', title: 'Mygo Live', date: '2099-08-15T19:00:00-07:00', bands: ['Mygo'] }),
      ],
      past: [],
    })
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.queryByText('Mygo Live')).toBeNull()
    expect(screen.getByText('Roselia Live')).toBeInTheDocument()
  })

  it('date-from filter via mobile sheet excludes earlier events', async () => {
    useIsMobile.mockReturnValue(true)
    mockFetchEventsWith({
      upcoming: [
        eventApiRow({ id: 'early', title: 'Early Concert', date: '2099-01-15T19:00:00-07:00' }),
        eventApiRow({ id: 'late', title: 'Late Concert', date: '2099-12-15T19:00:00-07:00' }),
      ],
      past: [],
    })
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await screen.findByRole('heading', { level: 1, name: 'Events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0], '2099-06-01')
    expect(screen.queryByText('Early Concert')).toBeNull()
    expect(screen.getByText('Late Concert')).toBeInTheDocument()
  })

  it('shows LoadingState while pending', async () => {
    useIsMobile.mockReturnValue(false)
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

  it('shows ErrorState with retry on fetch reject', async () => {
    useIsMobile.mockReturnValue(false)
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('5xx'))
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('5xx'))
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    mockFetchEventsWith({ upcoming: [], past: [] })
    await userEvent.click(retry)
    expect(await screen.findByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
  })
})

describe('<Events /> — empty data path (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchEvents).mockReset()
    mockFetchEventsWith({ upcoming: [], past: [] })
  })

  afterEach(() => {
    cache.clear()
  })

  it('mounts with empty events list (desktop)', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('mounts with empty events list (mobile)', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })
})
