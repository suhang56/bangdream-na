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

  describe('keyboard day navigation (roving tabindex)', () => {
    function focusedCell(container) {
      return container.querySelector('.event-calendar__cell[tabindex="0"]')
    }

    it('today cell starts as the roving-tabindex anchor', () => {
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      const focused = focusedCell(container)
      expect(focused).not.toBeNull()
      expect(focused.getAttribute('data-ymd')).toBe('2026-04-15')
    })

    it('ArrowRight moves focus +1 day', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{ArrowRight}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-16')
    })

    it('ArrowLeft moves focus −1 day', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{ArrowLeft}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-14')
    })

    it('ArrowUp moves focus −7 days', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{ArrowUp}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-08')
    })

    it('ArrowDown moves focus +7 days', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{ArrowDown}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-22')
    })

    it('Home jumps to first day of focused week (Sunday)', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      // 2026-04-15 is Wednesday → Sunday is 2026-04-12
      focusedCell(container).focus()
      await user.keyboard('{Home}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-12')
    })

    it('End jumps to last day of focused week (Saturday)', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{End}')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-18')
    })

    it('PageDown rolls focus to next month', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{PageDown}')
      expect(screen.getByRole('heading', { level: 2, name: /may 2026/i })).toBeInTheDocument()
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-05-15')
    })

    it('PageUp rolls focus to previous month', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{PageUp}')
      expect(screen.getByRole('heading', { level: 2, name: /march 2026/i })).toBeInTheDocument()
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-03-15')
    })

    it('ArrowLeft from day 1 crosses month boundary (edge)', async () => {
      const apr1 = new Date(Date.UTC(2026, 3, 1))
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={[]} now={apr1} />)
      focusedCell(container).focus()
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('heading', { level: 2, name: /march 2026/i })).toBeInTheDocument()
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-03-31')
    })

    it('Enter on focused day toggles expansion panel', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('{Enter}')
      expect(container.querySelector('.event-calendar__expansion')).not.toBeNull()
      await user.keyboard('{Enter}')
      expect(container.querySelector('.event-calendar__expansion')).toBeNull()
    })

    it('PageDown from Jan 31 clamps to Feb 28 in non-leap year (edge)', async () => {
      const jan31 = new Date(Date.UTC(2025, 0, 31))
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={[]} now={jan31} />)
      focusedCell(container).focus()
      await user.keyboard('{PageDown}')
      expect(screen.getByRole('heading', { level: 2, name: /february 2025/i })).toBeInTheDocument()
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2025-02-28')
    })

    it('non-arrow keys are not consumed (edge)', async () => {
      const user = userEvent.setup()
      const { container } = render(<EventCalendar events={events} now={NOW} />)
      focusedCell(container).focus()
      await user.keyboard('a')
      expect(focusedCell(container).getAttribute('data-ymd')).toBe('2026-04-15')
    })
  })
})
