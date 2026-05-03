import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoleBadge from './RoleBadge.jsx'

describe('RoleBadge', () => {
  it('renders "Organizer" for role=organizer', () => {
    const { container } = render(<RoleBadge role="organizer" />)
    expect(screen.getByText('Organizer')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--organizer')).not.toBeNull()
  })

  it('renders "Member" for role=member', () => {
    const { container } = render(<RoleBadge role="member" />)
    expect(screen.getByText('Member')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--member')).not.toBeNull()
  })

  it('renders "Alumnus" for role=alumnus', () => {
    const { container } = render(<RoleBadge role="alumnus" />)
    expect(screen.getByText('Alumnus')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--alumnus')).not.toBeNull()
  })

  it('renders "Cover Band Lead" for role=cover-band-lead', () => {
    const { container } = render(<RoleBadge role="cover-band-lead" />)
    expect(screen.getByText('Cover Band Lead')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--cover-band-lead')).not.toBeNull()
  })

  it('alumnus flag wins: organizer + alumnus=true → renders "Alumnus"', () => {
    const { container } = render(<RoleBadge role="organizer" alumnus />)
    expect(screen.getByText('Alumnus')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--alumnus')).not.toBeNull()
  })

  it('renders unknown role string as-is with unknown class', () => {
    const { container } = render(<RoleBadge role="performer" />)
    expect(screen.getByText('performer')).toBeInTheDocument()
    expect(container.querySelector('.role-badge--unknown')).not.toBeNull()
  })

  it('does not throw when role is omitted; renders empty + unknown class', () => {
    const { container } = render(<RoleBadge />)
    expect(container.querySelector('.role-badge--unknown')).not.toBeNull()
  })

  it('treats alumnus=undefined as false', () => {
    const { container } = render(<RoleBadge role="organizer" alumnus={undefined} />)
    expect(container.querySelector('.role-badge--organizer')).not.toBeNull()
  })

  it('uses <span> element (inline)', () => {
    const { container } = render(<RoleBadge role="member" />)
    expect(container.querySelector('span.role-badge')).not.toBeNull()
  })

  it('exposes role label via aria-label for screen readers', () => {
    render(<RoleBadge role="organizer" />)
    expect(screen.getByLabelText('Role: Organizer')).toBeInTheDocument()
  })
})
