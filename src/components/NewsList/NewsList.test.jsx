import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewsList from './NewsList.jsx'

const item = {
  id: '1',
  date: '2026-04-30',
  title: 'Hello',
  body: 'Body',
  category: 'announcement',
}

describe('<NewsList />', () => {
  it('renders one card per item', () => {
    render(<NewsList news={[item, { ...item, id: '2', title: 'Two' }]} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
  })

  it('empty array → empty state with role=status (edge)', () => {
    render(<NewsList news={[]} emptyMessage="Nothing here" />)
    expect(screen.getByRole('status')).toHaveTextContent('Nothing here')
  })

  it('non-array input → empty state (edge)', () => {
    render(<NewsList news={null} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('default empty message when none provided', () => {
    render(<NewsList news={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
  })
})
