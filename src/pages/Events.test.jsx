import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'

describe('<Events /> — production empty path (real events.json)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('mounts cleanly with empty events.json and shows empty state', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/no events/i)
  })

  it('renders the filter bar even when there are no events', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByLabelText('Earliest first')).toBeInTheDocument()
  })

  it('shows the page subtitle copy', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    expect(
      screen.getByText(/concerts, fan meets, and conventions/i),
    ).toBeInTheDocument()
  })
})

describe('<Events /> — non-empty path (mocked data)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('../data/events.json', () => ({
      default: [
        {
          id: 'past-1',
          title: 'Past Concert ABC',
          date: '2025-01-15T19:00:00-07:00',
          location: 'Nowhere',
          type: 'concert',
          description: 'Past.',
        },
        {
          id: 'up-1',
          title: 'Upcoming Concert XYZ',
          date: '2099-07-15T19:00:00-07:00',
          location: 'LA',
          type: 'concert',
          description: 'Upcoming concert.',
        },
        {
          id: 'up-2',
          title: 'Upcoming Fanmeet QRS',
          date: '2099-08-01T14:00:00-07:00',
          location: 'SF',
          type: 'fanmeet',
          description: 'Upcoming fanmeet.',
        },
      ],
    }))
  })

  afterEach(() => {
    vi.doUnmock('../data/events.json')
  })

  it('renders both Upcoming and Past sections when data is mixed', async () => {
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Past' })).toBeInTheDocument()
  })

  it('clicking a chip narrows the visible list', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    expect(screen.getByText('Upcoming Fanmeet QRS')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    expect(screen.queryByText('Upcoming Fanmeet QRS')).toBeNull()
    expect(screen.getByText('Upcoming Concert XYZ')).toBeInTheDocument()
  })

  it('sort radio reorders cards within Upcoming section', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    const { container } = renderWithProviders(<Events />)

    const titlesAsc = Array.from(
      container.querySelectorAll('.event-list__group--upcoming .event-card__title'),
    ).map((n) => n.textContent)
    expect(titlesAsc).toEqual(['Upcoming Concert XYZ', 'Upcoming Fanmeet QRS'])

    await user.click(screen.getByLabelText('Latest first'))
    const titlesDesc = Array.from(
      container.querySelectorAll('.event-list__group--upcoming .event-card__title'),
    ).map((n) => n.textContent)
    expect(titlesDesc).toEqual(['Upcoming Fanmeet QRS', 'Upcoming Concert XYZ'])
  })

  it('chip toggling correctly updates aria-pressed', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    const concerts = screen.getByRole('button', { name: 'Concerts' })
    expect(concerts.getAttribute('aria-pressed')).toBe('false')
    await user.click(concerts)
    expect(concerts.getAttribute('aria-pressed')).toBe('true')
    await user.click(concerts)
    expect(concerts.getAttribute('aria-pressed')).toBe('false')
  })

  it('filter combo with zero matches → empty state visible (edge)', async () => {
    const user = userEvent.setup()
    const { default: Events } = await import('./Events.jsx')
    renderWithProviders(<Events />)
    // Filter to a type none of the mocked events have
    await user.click(screen.getByRole('button', { name: 'Conventions' }))
    expect(screen.getByRole('status')).toHaveTextContent(/no events/i)
  })
})
