import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import EventsDesktop from './Events.desktop.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function render(ui, options) {
  return rtlRender(ui, { wrapper: MemoryRouter, ...options })
}

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
  visible: [],
  groups: { upcoming: [], past: [] },
  now: new Date('2099-01-01T00:00:00Z'),
}

const sampleEvents = [
  {
    id: 'up-1',
    title: 'Upcoming Concert XYZ',
    date: '2099-07-15T19:00:00-07:00',
    location: 'LA',
    type: 'concert',
  },
  {
    id: 'past-1',
    title: 'Past Concert ABC',
    date: '2025-01-15T19:00:00-07:00',
    location: 'Nowhere',
    type: 'concert',
  },
]

describe('<EventsDesktop />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders heading + view tabs + sidebar + count', () => {
    render(<EventsDesktop {...baseProps} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
  })

  it('view tab list is aria-selected when view=list', () => {
    render(<EventsDesktop {...baseProps} view="list" />)
    expect(screen.getByRole('tab', { name: /list/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /calendar/i })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('view tab calendar is aria-selected when view=calendar', () => {
    render(<EventsDesktop {...baseProps} view="calendar" />)
    expect(screen.getByRole('tab', { name: /calendar/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('clicking calendar tab calls setView("calendar")', async () => {
    const user = userEvent.setup()
    const setView = vi.fn()
    render(<EventsDesktop {...baseProps} setView={setView} />)
    await user.click(screen.getByRole('tab', { name: /calendar/i }))
    expect(setView).toHaveBeenCalledWith('calendar')
  })

  it('clicking list tab calls setView("list")', async () => {
    const user = userEvent.setup()
    const setView = vi.fn()
    render(<EventsDesktop {...baseProps} setView={setView} view="calendar" />)
    await user.click(screen.getByRole('tab', { name: /list/i }))
    expect(setView).toHaveBeenCalledWith('list')
  })

  it('count text reflects groups.upcoming + groups.past', () => {
    const { container } = render(
      <EventsDesktop
        {...baseProps}
        groups={{ upcoming: [sampleEvents[0]], past: [sampleEvents[1]] }}
      />,
    )
    expect(container.querySelector('.events-desktop__count')).toHaveTextContent(
      /1 upcoming · 1 past/i,
    )
  })

  it('renders calendar component when view=calendar', () => {
    const { container } = render(
      <EventsDesktop {...baseProps} view="calendar" visible={sampleEvents} />,
    )
    expect(container.querySelector('.event-calendar')).not.toBeNull()
  })

  it('renders list component when view=list', () => {
    const { container } = render(
      <EventsDesktop {...baseProps} view="list" visible={sampleEvents} />,
    )
    expect(container.querySelector('.event-list')).not.toBeNull()
    expect(container.querySelector('.event-calendar')).toBeNull()
  })

  it('passes availableBands to sidebar (edge — empty hides band section)', () => {
    const { container } = render(
      <EventsDesktop {...baseProps} availableBands={[]} />,
    )
    const legends = container.querySelectorAll('.event-sidebar legend')
    const texts = Array.from(legends).map((l) => l.textContent)
    expect(texts).not.toContain('Band')
  })

  it('passes availableBands to sidebar (non-empty shows band)', () => {
    render(
      <EventsDesktop
        {...baseProps}
        availableBands={['Roselia', 'Mygo']}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Roselia' }),
    ).toBeInTheDocument()
  })

  it('clicking sidebar chip calls onFilterChange', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<EventsDesktop {...baseProps} onFilterChange={onFilterChange} />)
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    expect(onFilterChange).toHaveBeenCalled()
    const next = onFilterChange.mock.calls[0][0]
    expect(next.types.has('concert')).toBe(true)
  })

  it('empty groups still renders count + tabs (edge)', () => {
    const { container } = render(<EventsDesktop {...baseProps} />)
    expect(container.querySelector('.events-desktop__count')).toHaveTextContent(
      /0 upcoming/i,
    )
  })

  it('does not crash when filterState is fully populated (edge)', () => {
    const fullState = {
      types: new Set(['concert', 'fanmeet', 'con', 'online']),
      bands: new Set(['Roselia']),
      from: '2026-01-01',
      to: '2026-12-31',
      keyword: 'tour',
    }
    expect(() =>
      render(
        <EventsDesktop
          {...baseProps}
          filterState={fullState}
          availableBands={['Roselia']}
        />,
      ),
    ).not.toThrow()
  })
})
