import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoleBadge from './RoleBadge.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('RoleBadge', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

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

  it('renders ZH role label and aria when uiLanguage=zh (edge — i18n)', () => {
    setLanguage('zh')
    render(<RoleBadge role="organizer" />)
    expect(screen.getByText('组织者')).toBeInTheDocument()
    expect(screen.getByLabelText('角色：组织者')).toBeInTheDocument()
  })

  it('cover-band-lead role resolves to ZH "翻唱乐队主理" (edge — kebab→key map)', () => {
    setLanguage('zh')
    render(<RoleBadge role="cover-band-lead" />)
    expect(screen.getByText('翻唱乐队主理')).toBeInTheDocument()
  })
})
