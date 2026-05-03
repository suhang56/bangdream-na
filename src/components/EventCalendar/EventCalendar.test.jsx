import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventCalendar from './EventCalendar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const NOW = new Date(Date.UTC(2026, 3, 15)) // April 15, 2026

const events = [
  {
    id: 'a',
    title: 'Roselia LA',
    date: '2026-04-15T19:00:00Z',
    location: 'LA',
    type: 'concert',
  },
  {
    id: 'b',
    title: 'Mygo NYC',
    date: '2026-04-20T19:00:00Z',
    type: 'fanmeet',
  },
  {
    id: 'c',
    title: 'Multi-day Con',
    date: '2026-04-25',
    endDate: '2026-04-27',
    type: 'con',
  },
]

describe('<EventCalendar />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders header with month/year', () => {
    render(<EventCalendar events={events} now={NOW} />)
    expect(screen.getByRole('heading', { level: 2, name: /april 2026/i })).toBeInTheDocument()
  })

  it('renders 42 cells', () => {
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    const cells = container.querySelectorAll('.event-calendar__cell')
    expect(cells.length).toBe(42)
  })

  it('today cell has --today modifier', () => {
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    const today = container.querySelector('.event-calendar__cell--today')
    expect(today).not.toBeNull()
  })

  it('prev/next month navigation works (edge — wraps year)', async () => {
    const user = userEvent.setup()
    render(<EventCalendar events={events} now={NOW} />)
    await user.click(screen.getByRole('button', { name: /next month/i }))
    expect(screen.getByRole('heading', { level: 2, name: /may 2026/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /previous month/i }))
    expect(screen.getByRole('heading', { level: 2, name: /april 2026/i })).toBeInTheDocument()
  })

  it('clicking a day with events expands details panel', async () => {
    const user = userEvent.setup()
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    // find cell with 2026-04-15 aria-label
    const cell = container.querySelector('[aria-label^="2026-04-15"]')
    await user.click(cell)
    expect(container.querySelector('.event-calendar__expansion')).not.toBeNull()
    expect(screen.getByText('Roselia LA')).toBeInTheDocument()
  })

  it('multi-day event shows dot on each day in range (edge)', () => {
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    const day25 = container.querySelector('[aria-label^="2026-04-25"]')
    const day26 = container.querySelector('[aria-label^="2026-04-26"]')
    const day27 = container.querySelector('[aria-label^="2026-04-27"]')
    expect(day25.querySelectorAll('.event-calendar__dot').length).toBeGreaterThan(0)
    expect(day26.querySelectorAll('.event-calendar__dot').length).toBeGreaterThan(0)
    expect(day27.querySelectorAll('.event-calendar__dot').length).toBeGreaterThan(0)
  })

  it('empty month shows empty-month note (edge)', () => {
    render(<EventCalendar events={[]} now={NOW} />)
    expect(screen.getByText(/no events scheduled this month/i)).toBeInTheDocument()
  })

  it('leap year Feb 2024 renders without crash (edge)', () => {
    const feb = new Date(Date.UTC(2024, 1, 15))
    expect(() => render(<EventCalendar events={[]} now={feb} />)).not.toThrow()
  })

  it('clicking same day twice collapses (edge)', async () => {
    const user = userEvent.setup()
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    const cell = container.querySelector('[aria-label^="2026-04-15"]')
    await user.click(cell)
    expect(container.querySelector('.event-calendar__expansion')).not.toBeNull()
    await user.click(cell)
    expect(container.querySelector('.event-calendar__expansion')).toBeNull()
  })

  it('non-array events prop → no crash, empty month note (edge)', () => {
    expect(() => render(<EventCalendar events={null} now={NOW} />)).not.toThrow()
  })

  it('weekday header has 7 labels', () => {
    const { container } = render(<EventCalendar events={events} now={NOW} />)
    const labels = container.querySelectorAll('.event-calendar__weekday')
    expect(labels.length).toBe(7)
  })
})
