import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TypeBadge from './TypeBadge.jsx'

describe('<TypeBadge />', () => {
  it('renders "Concert" label for type=concert', () => {
    render(<TypeBadge type="concert" />)
    expect(screen.getByText('Concert')).toBeInTheDocument()
  })

  it('renders "Fan Meet" label for type=fanmeet', () => {
    render(<TypeBadge type="fanmeet" />)
    expect(screen.getByText('Fan Meet')).toBeInTheDocument()
  })

  it('renders "Convention" label for type=con', () => {
    render(<TypeBadge type="con" />)
    expect(screen.getByText('Convention')).toBeInTheDocument()
  })

  it('applies type-modifier class for known type', () => {
    const { container } = render(<TypeBadge type="concert" />)
    expect(container.firstChild.className).toContain('type-badge--concert')
  })

  it('renders raw value for unknown type without crashing (edge)', () => {
    render(<TypeBadge type="lecture" />)
    expect(screen.getByText('lecture')).toBeInTheDocument()
  })

  it('falls back to unknown class for unrecognized type (edge)', () => {
    const { container } = render(<TypeBadge type="lecture" />)
    expect(container.firstChild.className).toContain('type-badge--unknown')
  })

  it('handles null type without crashing (edge)', () => {
    expect(() => render(<TypeBadge type={null} />)).not.toThrow()
  })

  it('handles undefined type without crashing (edge)', () => {
    expect(() => render(<TypeBadge type={undefined} />)).not.toThrow()
  })

  it('sets data-type attribute', () => {
    const { container } = render(<TypeBadge type="concert" />)
    expect(container.firstChild.getAttribute('data-type')).toBe('concert')
  })
})
