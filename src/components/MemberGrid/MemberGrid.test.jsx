import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemberGrid from './MemberGrid.jsx'

const SAMPLE = [
  { id: 'a', name: 'Alice', role: 'member' },
  { id: 'b', name: 'Bob', role: 'organizer' },
]

describe('MemberGrid', () => {
  it('renders empty message with role="status" when members empty', () => {
    const { container } = render(<MemberGrid members={[]} />)
    const status = screen.getByRole('status')
    expect(status).toBeInTheDocument()
    expect(status.textContent).toBe('No members match your filters.')
    expect(container.querySelector('ul')).toBeNull()
  })

  it('honors custom emptyMessage', () => {
    render(<MemberGrid members={[]} emptyMessage="Roster is empty." />)
    expect(screen.getByRole('status').textContent).toBe('Roster is empty.')
  })

  it('renders <ul> with one <li> when one member present', () => {
    const { container } = render(<MemberGrid members={[SAMPLE[0]]} />)
    expect(container.querySelectorAll('ul').length).toBe(1)
    expect(container.querySelectorAll('li').length).toBe(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Alice' })).toBeInTheDocument()
  })

  it('renders one <li> per member with id-based keys', () => {
    const { container } = render(<MemberGrid members={SAMPLE} />)
    expect(container.querySelectorAll('li').length).toBe(2)
    expect(screen.getByRole('heading', { level: 3, name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Bob' })).toBeInTheDocument()
  })

  it('does not render the empty status when members are present', () => {
    render(<MemberGrid members={SAMPLE} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
