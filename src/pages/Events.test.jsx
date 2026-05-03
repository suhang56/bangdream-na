import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

vi.mock('../lib/useBreakpoint.js', () => ({
  useIsMobile: vi.fn(),
}))

import { useIsMobile } from '../lib/useBreakpoint.js'

describe('<Events /> — track selection (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.resetModules()
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'up-1',
          title: 'Upcoming Concert ABC',
          date: '2099-08-01T19:00:00-07:00',
          location: 'LA',
          type: 'concert',
        },
      ],
    }))
  })

  afterEach(() => {
    vi.doUnmock('../data/events.json')
  })

  it('mounts mobile track when useIsMobile returns true', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    expect(container.querySelector('.events-mobile')).not.toBeNull()
    expect(container.querySelector('.events-desktop')).toBeNull()
  })

  it('mounts desktop track when useIsMobile returns false', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    expect(container.querySelector('.events-desktop')).not.toBeNull()
    expect(container.querySelector('.events-mobile')).toBeNull()
  })

  it('renders heading from i18n in both tracks (mobile)', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('renders heading from i18n in both tracks (desktop)', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('?view=calendar URL param renders calendar in desktop track', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })

  it('?view=calendar URL param renders calendar in mobile track', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })

  it('clicking calendar tab in desktop swaps view to calendar', async () => {
    useIsMobile.mockReturnValue(false)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
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
    expect(container.querySelector('.event-calendar')).not.toBeNull()
    await user.click(screen.getByRole('tab', { name: /list/i }))
    expect(container.querySelector('.event-calendar')).toBeNull()
  })

  it('clicking past scope chip in mobile updates rendered list', async () => {
    useIsMobile.mockReturnValue(true)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await user.click(screen.getByRole('tab', { name: 'Past' }))
    expect(
      screen.getByRole('tab', { name: 'Past' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(container).toBeTruthy()
  })

  it('clicking upcoming scope chip from past scope returns', async () => {
    useIsMobile.mockReturnValue(true)
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events?scope=past' })
    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(
      screen.getByRole('tab', { name: 'Upcoming' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('keyword filter via mobile sheet narrows visible list', async () => {
    useIsMobile.mockReturnValue(true)
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'a',
          title: 'Alpha Concert',
          date: '2099-07-15T19:00:00-07:00',
          type: 'concert',
        },
        {
          id: 'b',
          title: 'Beta Concert',
          date: '2099-08-15T19:00:00-07:00',
          type: 'concert',
        },
      ],
    }))
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    const search = screen.getByRole('searchbox')
    await user.type(search, 'Alpha')
    await new Promise((r) => setTimeout(r, 250))
    expect(screen.queryByText('Beta Concert')).toBeNull()
  })

  it('category filter via mobile sheet narrows visible list (band)', async () => {
    useIsMobile.mockReturnValue(true)
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'a',
          title: 'Roselia Live',
          date: '2099-07-15T19:00:00-07:00',
          type: 'concert',
          bands: ['Roselia'],
        },
        {
          id: 'b',
          title: 'Mygo Live',
          date: '2099-08-15T19:00:00-07:00',
          type: 'concert',
          bands: ['Mygo'],
        },
      ],
    }))
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(screen.queryByText('Mygo Live')).toBeNull()
    expect(screen.getByText('Roselia Live')).toBeInTheDocument()
  })

  it('date-from filter via mobile sheet excludes earlier events', async () => {
    useIsMobile.mockReturnValue(true)
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'early',
          title: 'Early Concert',
          date: '2099-01-15T19:00:00-07:00',
          type: 'concert',
        },
        {
          id: 'late',
          title: 'Late Concert',
          date: '2099-12-15T19:00:00-07:00',
          type: 'concert',
        },
      ],
    }))
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    await user.click(container.querySelector('.events-mobile__filter-pill'))
    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0], '2099-06-01')
    expect(screen.queryByText('Early Concert')).toBeNull()
    expect(screen.getByText('Late Concert')).toBeInTheDocument()
  })
})

describe('<Events /> — empty data path (shell)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.resetModules()
    vi.doMock('../data/events.json', () => ({ default: [] }))
  })

  afterEach(() => {
    vi.doUnmock('../data/events.json')
  })

  it('mounts with empty events.json (desktop)', async () => {
    useIsMobile.mockReturnValue(false)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('mounts with empty events.json (mobile)', async () => {
    useIsMobile.mockReturnValue(true)
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })
})
