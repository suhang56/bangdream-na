import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import ComingSoonCard from './ComingSoonCard.jsx'

describe('ComingSoonCard', () => {
  it('renders title, description, and eta badge', () => {
    renderWithProviders(
      <ComingSoonCard title="Events" description="Upcoming concerts." eta="Phase 2" />,
    )
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByText('Upcoming concerts.')).toBeInTheDocument()
    expect(screen.getByText('Phase 2')).toBeInTheDocument()
  })

  it('uses descriptive aria-label combining title + eta', () => {
    renderWithProviders(<ComingSoonCard title="Members" eta="Phase 3" />)
    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'Members — coming in Phase 3',
    )
  })

  it('falls back to title-only aria-label when eta missing', () => {
    renderWithProviders(<ComingSoonCard title="Events" />)
    expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Events')
  })

  it('omits description element entirely when not provided (edge: empty)', () => {
    const { container } = renderWithProviders(<ComingSoonCard title="Events" eta="Phase 2" />)
    expect(container.querySelector('.coming-soon-desc')).toBeNull()
  })

  it('omits eta badge when eta is empty (edge: missing)', () => {
    renderWithProviders(<ComingSoonCard title="Events" description="Soon." />)
    expect(screen.queryByText(/phase/i)).toBeNull()
  })

  it('renders custom icon when provided', () => {
    renderWithProviders(
      <ComingSoonCard
        title="Events"
        eta="Phase 2"
        icon={<svg data-testid="cal-icon" />}
      />,
    )
    expect(screen.getByTestId('cal-icon')).toBeInTheDocument()
  })

  it('handles very long title without crash (edge: 60-char title)', () => {
    const long = 'A'.repeat(60)
    renderWithProviders(<ComingSoonCard title={long} eta="Phase 2" />)
    expect(screen.getByRole('heading', { name: long })).toBeInTheDocument()
  })
})
