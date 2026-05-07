import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import EventsMobile from './Events.mobile.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const upcoming = [
  {
    id: 'up-1',
    title: 'Upcoming Concert XYZ',
    date: '2099-07-15T19:00:00-07:00',
    location: 'LA',
    type: 'concert',
    image: '/events/up-1.png',
    links: [{ label: 'Tickets', url: 'https://example.com/tickets' }],
  },
  {
    id: 'up-2',
    title: 'Upcoming Fanmeet QRS',
    date: '2099-08-01T14:00:00-07:00',
    location: { city: 'SF', venue: 'The Fillmore' },
    type: 'fanmeet',
  },
]

const past = [
  {
    id: 'past-1',
    title: 'Past Concert ABC',
    date: '2025-01-15T19:00:00-07:00',
    location: 'Old Place',
    type: 'concert',
  },
]

const baseProps = {
  view: 'list',
  setView: () => {},
  scope: 'upcoming',
  setScope: () => {},
  filterState: {
    types: new Set(),
    bands: new Set(),
    from: '',
    to: '',
    keyword: '',
  },
  onFilterChange: () => {},
  availableBands: [],
  visible: [...upcoming, ...past],
  groups: { upcoming, past },
  now: new Date('2026-01-01T00:00:00Z'),
}

describe('<EventsMobile />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders heading + sticky bar with toggle, scope, filter pill', () => {
    const { container } = renderWithRouter(<EventsMobile {...baseProps} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
    expect(container.querySelector('.events-mobile__sticky-bar')).not.toBeNull()
    expect(screen.getByRole('tab', { name: 'List' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Past' })).toBeInTheDocument()
  })

  it('default view=list renders 88px tile list (upcoming scope)', () => {
    const { container } = renderWithRouter(<EventsMobile {...baseProps} />)
    const tiles = container.querySelectorAll('.events-mobile__tile')
    expect(tiles).toHaveLength(2)
    expect(screen.getByText('Upcoming Concert XYZ')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Fanmeet QRS')).toBeInTheDocument()
    expect(screen.queryByText('Past Concert ABC')).toBeNull()
  })

  it('scope=past shows past events only', () => {
    renderWithRouter(<EventsMobile {...baseProps} scope="past" />)
    expect(screen.getByText('Past Concert ABC')).toBeInTheDocument()
    expect(screen.queryByText('Upcoming Concert XYZ')).toBeNull()
  })

  it('clicking scope=past chip calls setScope("past")', async () => {
    const user = userEvent.setup()
    const setScope = vi.fn()
    renderWithRouter(<EventsMobile {...baseProps} setScope={setScope} />)
    await user.click(screen.getByRole('tab', { name: 'Past' }))
    expect(setScope).toHaveBeenCalledWith('past')
  })

  it('clicking scope=upcoming chip calls setScope("upcoming")', async () => {
    const user = userEvent.setup()
    const setScope = vi.fn()
    renderWithRouter(<EventsMobile {...baseProps} scope="past" setScope={setScope} />)
    await user.click(screen.getByRole('tab', { name: 'Upcoming' }))
    expect(setScope).toHaveBeenCalledWith('upcoming')
  })

  it('clicking calendar tab calls setView("calendar")', async () => {
    const user = userEvent.setup()
    const setView = vi.fn()
    renderWithRouter(<EventsMobile {...baseProps} setView={setView} />)
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))
    expect(setView).toHaveBeenCalledWith('calendar')
  })

  it('view=calendar mounts EventCalendar instead of list', () => {
    const { container } = renderWithRouter(<EventsMobile {...baseProps} view="calendar" />)
    expect(container.querySelector('.event-calendar')).not.toBeNull()
    expect(container.querySelector('.events-mobile__list')).toBeNull()
  })

  it('tile with id links to /events/:id detail page', () => {
    renderWithRouter(<EventsMobile {...baseProps} />)
    const link = screen.getByRole('link', {
      name: /Upcoming Concert XYZ/i,
    })
    expect(link).toHaveAttribute('href', '/events/up-1')
  })

  it('every tile with an id is a <Link> regardless of external links', () => {
    const { container } = renderWithRouter(<EventsMobile {...baseProps} />)
    const links = container.querySelectorAll('a.events-mobile__tile')
    expect(links).toHaveLength(2)
    expect(container.querySelectorAll('article.events-mobile__tile')).toHaveLength(0)
  })

  it('object location renders city · venue', () => {
    renderWithRouter(<EventsMobile {...baseProps} />)
    expect(screen.getByText('SF · The Fillmore')).toBeInTheDocument()
  })

  it('empty upcoming list shows "No upcoming events" empty state', () => {
    renderWithRouter(
      <EventsMobile
        {...baseProps}
        groups={{ upcoming: [], past }}
        visible={past}
      />,
    )
    expect(screen.getByText('No upcoming events.')).toBeInTheDocument()
  })

  it('empty past list (when scope=past) shows "No past events" empty state', () => {
    renderWithRouter(
      <EventsMobile
        {...baseProps}
        scope="past"
        groups={{ upcoming, past: [] }}
        visible={upcoming}
      />,
    )
    expect(screen.getByText('No past events.')).toBeInTheDocument()
  })

  it('filter pill not active when no filters set (no badge)', () => {
    const { container } = renderWithRouter(<EventsMobile {...baseProps} />)
    const pill = container.querySelector('.events-mobile__filter-pill')
    expect(pill).not.toHaveClass('events-mobile__filter-pill--active')
    expect(
      container.querySelector('.events-mobile__filter-badge'),
    ).toBeNull()
  })

  it('filter pill active + badge shows count when filters applied', () => {
    const state = {
      types: new Set(['concert', 'fanmeet']),
      bands: new Set(),
      from: '',
      to: '',
      keyword: 'tour',
    }
    const { container } = renderWithRouter(
      <EventsMobile {...baseProps} filterState={state} />,
    )
    expect(
      container.querySelector('.events-mobile__filter-pill--active'),
    ).not.toBeNull()
    const badge = container.querySelector('.events-mobile__filter-badge')
    expect(badge).toHaveTextContent('3')
  })

  it('clicking filter pill opens the bottom-sheet', async () => {
    const user = userEvent.setup()
    const { container } = renderWithRouter(<EventsMobile {...baseProps} />)
    const dialog = container.querySelector('dialog.event-filter-sheet')
    expect(dialog).not.toBeNull()
    expect(dialog.hasAttribute('open')).toBe(false)
    await user.click(
      container.querySelector('.events-mobile__filter-pill'),
    )
    expect(dialog.hasAttribute('open')).toBe(true)
  })

  it('aria-selected reflects current view tab', () => {
    renderWithRouter(<EventsMobile {...baseProps} view="list" />)
    expect(screen.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Calendar' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('aria-selected reflects current scope tab', () => {
    renderWithRouter(<EventsMobile {...baseProps} scope="past" />)
    expect(screen.getByRole('tab', { name: 'Past' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('does not crash with malformed event missing title (edge)', () => {
    const broken = [
      {
        id: 'broken',
        title: '',
        date: '2099-09-01T19:00:00-07:00',
        type: 'concert',
      },
    ]
    expect(() =>
      renderWithRouter(
        <EventsMobile
          {...baseProps}
          groups={{ upcoming: broken, past: [] }}
          visible={broken}
        />,
      ),
    ).not.toThrow()
  })

  it('tile without id renders non-interactive <article> (edge)', () => {
    const ev = [
      {
        title: 'No ID Event',
        date: '2099-09-01T19:00:00-07:00',
        location: 'Somewhere',
        type: 'concert',
      },
    ]
    const { container } = renderWithRouter(
      <EventsMobile {...baseProps} groups={{ upcoming: ev, past: [] }} visible={ev} />,
    )
    expect(container.querySelector('a.events-mobile__tile')).toBeNull()
    expect(container.querySelector('article.events-mobile__tile')).not.toBeNull()
  })

  it('detail href encodes ids that contain reserved characters (edge)', () => {
    const ev = [
      {
        id: 'event/with spaces',
        title: 'Encoded ID Event',
        date: '2099-09-01T19:00:00-07:00',
        type: 'concert',
      },
    ]
    renderWithRouter(
      <EventsMobile {...baseProps} groups={{ upcoming: ev, past: [] }} visible={ev} />,
    )
    const link = screen.getByRole('link', { name: /Encoded ID Event/i })
    expect(link).toHaveAttribute('href', '/events/event%2Fwith%20spaces')
  })
})
