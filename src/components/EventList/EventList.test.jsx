import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import EventList from './EventList.jsx'

const NOW = new Date('2026-06-01T12:00:00Z')

const upcoming1 = {
  id: 'up-1',
  title: 'Roselia Tour',
  date: '2026-07-15T19:00:00-07:00',
  location: 'Los Angeles, CA',
  type: 'concert',
  description: 'Upcoming.',
}
const upcoming2 = {
  id: 'up-2',
  title: 'MyGO Fan Meet',
  date: '2026-08-01T14:00:00-07:00',
  location: 'San Francisco, CA',
  type: 'fanmeet',
  description: 'Upcoming.',
}
const past1 = {
  id: 'past-1',
  title: 'AX 2025',
  date: '2025-07-04T10:00:00-07:00',
  location: 'Los Angeles, CA',
  type: 'con',
  description: 'Past.',
}
const malformed = {
  id: 'bad',
  title: 'Bad Date',
  date: 'not-a-date',
  location: 'Nowhere',
  type: 'concert',
  description: 'Bad.',
}

describe('<EventList />', () => {
  it('empty array → empty-state with role=status, aria-live=polite (edge)', () => {
    render(<EventList events={[]} now={NOW} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/no .*events.*match|no events/i)
    expect(status.getAttribute('aria-live')).toBe('polite')
  })

  it('all upcoming → only Upcoming section renders (edge)', () => {
    const { container } = render(
      <EventList events={[upcoming1, upcoming2]} now={NOW} />,
    )
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Past' })).toBeNull()
    expect(container.querySelectorAll('.event-list__item')).toHaveLength(2)
  })

  it('all past → only Past section renders (edge)', () => {
    render(<EventList events={[past1]} now={NOW} />)
    expect(screen.getByRole('heading', { name: 'Past' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Upcoming' })).toBeNull()
  })

  it('mixed → both sections render with correct counts', () => {
    const { container } = render(
      <EventList events={[upcoming1, past1, upcoming2]} now={NOW} />,
    )
    const upcomingSection = container.querySelector('.event-list__group--upcoming')
    const pastSection = container.querySelector('.event-list__group--past')
    expect(within(upcomingSection).getAllByRole('listitem')).toHaveLength(2)
    expect(within(pastSection).getAllByRole('listitem')).toHaveLength(1)
  })

  it('single upcoming event → exactly one item in Upcoming section', () => {
    const { container } = render(<EventList events={[upcoming1]} now={NOW} />)
    expect(container.querySelectorAll('.event-list__item')).toHaveLength(1)
  })

  it('malformed-date events are dropped (not rendered) (edge)', () => {
    render(<EventList events={[malformed, upcoming1]} now={NOW} />)
    expect(screen.queryByText('Bad Date')).toBeNull()
    expect(screen.getByText('Roselia Tour')).toBeInTheDocument()
  })

  it('all events malformed → empty state shows (edge)', () => {
    render(<EventList events={[malformed]} now={NOW} />)
    expect(screen.getByRole('status')).toHaveTextContent(/no .*events.*match|no events/i)
  })

  it('section has aria-labelledby pointing to its heading', () => {
    const { container } = render(<EventList events={[upcoming1]} now={NOW} />)
    const section = container.querySelector('.event-list__group--upcoming')
    expect(section.getAttribute('aria-labelledby')).toBe('upcoming-heading')
  })

  it('renders without explicit now prop (uses default) (edge)', () => {
    expect(() => render(<EventList events={[upcoming1]} />)).not.toThrow()
  })
})
