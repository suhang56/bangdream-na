import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

describe('<Events /> — production empty path (real events.json)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.resetModules()
  })

  it('mounts with empty events.json and shows empty state', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('renders sidebar + view toggle even when no events', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
  })

  it('result count shows 0 upcoming · 0 past', async () => {
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    expect(container.querySelector('.events-page__count')).toHaveTextContent(
      /0 upcoming/i,
    )
  })
})

describe('<Events /> — non-empty path (mocked data)', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    vi.resetModules()
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'past-1',
          title: 'Past Concert ABC',
          date: '2025-01-15T19:00:00-07:00',
          location: 'Nowhere',
          type: 'concert',
        },
        {
          id: 'up-1',
          title: 'Upcoming Concert XYZ',
          date: '2099-07-15T19:00:00-07:00',
          location: 'LA',
          type: 'concert',
        },
        {
          id: 'up-2',
          title: 'Upcoming Fanmeet QRS',
          date: '2099-08-01T14:00:00-07:00',
          location: 'SF',
          type: 'fanmeet',
        },
      ],
    }))
  })

  afterEach(() => {
    vi.doUnmock('../data/events.json')
  })

  it('renders Upcoming + Past sections (list view default)', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Past' })).toBeInTheDocument()
  })

  it('clicking Concerts chip narrows visible list', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    expect(screen.getByText('Upcoming Fanmeet QRS')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    expect(screen.queryByText('Upcoming Fanmeet QRS')).toBeNull()
    expect(screen.getByText('Upcoming Concert XYZ')).toBeInTheDocument()
  })

  it('view toggle to calendar swaps content', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    expect(container.querySelector('.event-calendar')).toBeNull()
    await user.click(screen.getByRole('tab', { name: /calendar/i }))
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })

  it('keyword search narrows list (edge — debounced)', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    const search = screen.getByRole('searchbox')
    await user.type(search, 'XYZ')
    await new Promise((r) => setTimeout(r, 250))
    expect(screen.queryByText('Upcoming Fanmeet QRS')).toBeNull()
    expect(screen.getByText('Upcoming Concert XYZ')).toBeInTheDocument()
  })

  it('result count updates as filters apply', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, { route: '/events' })
    const count = () => container.querySelector('.events-page__count')
    expect(count()).toHaveTextContent(/2 upcoming/i)
    await user.click(screen.getByRole('button', { name: 'Conventions' }))
    expect(count()).toHaveTextContent(/0 upcoming/i)
  })

  it('chip aria-pressed toggles', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />, { route: '/events' })
    const concerts = screen.getByRole('button', { name: 'Concerts' })
    expect(concerts).toHaveAttribute('aria-pressed', 'false')
    await user.click(concerts)
    expect(concerts).toHaveAttribute('aria-pressed', 'true')
  })

  it('?view=calendar URL param renders calendar by default (edge)', async () => {
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />, {
      route: '/events?view=calendar',
    })
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })
})
