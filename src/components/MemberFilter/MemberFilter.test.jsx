import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MemberFilter from './MemberFilter.jsx'

const BASE_PROPS = {
  bands: ['roselia', 'mygo', 'popipa'],
  selectedBands: [],
  onBandsChange: () => {},
  selectedRole: null,
  onRoleChange: () => {},
  searchValue: '',
  onSearchChange: () => {},
}

describe('MemberFilter', () => {
  it('renders one chip button per band', () => {
    render(<MemberFilter {...BASE_PROPS} />)
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Poppin'Party" })).toBeInTheDocument()
  })

  it('passes through unknown band keys as their raw label', () => {
    render(<MemberFilter {...BASE_PROPS} bands={['unknown-band']} />)
    expect(screen.getByRole('button', { name: 'unknown-band' })).toBeInTheDocument()
  })

  it('clicking unselected chip calls onBandsChange with [band]', async () => {
    const onBandsChange = vi.fn()
    render(<MemberFilter {...BASE_PROPS} onBandsChange={onBandsChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(onBandsChange).toHaveBeenCalledWith(['roselia'])
  })

  it('clicking selected chip calls onBandsChange with [] (toggle off)', async () => {
    const onBandsChange = vi.fn()
    render(
      <MemberFilter
        {...BASE_PROPS}
        selectedBands={['roselia']}
        onBandsChange={onBandsChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Roselia' }))
    expect(onBandsChange).toHaveBeenCalledWith([])
  })

  it('aria-pressed reflects selection state on chips', () => {
    render(<MemberFilter {...BASE_PROPS} selectedBands={['roselia']} />)
    expect(screen.getByRole('button', { name: 'Roselia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'MyGO!!!!!' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('clicking "Organizers" radio calls onRoleChange("organizer")', () => {
    const onRoleChange = vi.fn()
    render(<MemberFilter {...BASE_PROPS} onRoleChange={onRoleChange} />)
    fireEvent.click(screen.getByLabelText('Organizers'))
    expect(onRoleChange).toHaveBeenCalledWith('organizer')
  })

  it('clicking "All" radio calls onRoleChange(null)', () => {
    const onRoleChange = vi.fn()
    render(
      <MemberFilter
        {...BASE_PROPS}
        selectedRole="organizer"
        onRoleChange={onRoleChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('All'))
    expect(onRoleChange).toHaveBeenCalledWith(null)
  })

  it('typing in search input fires onSearchChange on every keystroke', async () => {
    const onSearchChange = vi.fn()
    render(<MemberFilter {...BASE_PROPS} onSearchChange={onSearchChange} />)
    const input = screen.getByLabelText('Search')
    await userEvent.type(input, 'kanade')
    // 6 keystrokes → 6 calls. Each receives the typed char relative to current value.
    expect(onSearchChange).toHaveBeenCalledTimes(6)
  })

  it('changing search input via fireEvent passes the full new value', () => {
    const onSearchChange = vi.fn()
    render(<MemberFilter {...BASE_PROPS} onSearchChange={onSearchChange} />)
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'kanade' } })
    expect(onSearchChange).toHaveBeenCalledWith('kanade')
  })

  it('Enter inside search input prevents form submission (no reload)', () => {
    const submitSpy = vi.fn()
    const { container } = render(<MemberFilter {...BASE_PROPS} />)
    const form = container.querySelector('form')
    form.addEventListener('submit', submitSpy)
    fireEvent.submit(form)
    // preventDefault is on onSubmit; testing that submit handler did call preventDefault
    expect(submitSpy).toHaveBeenCalled()
    // ensure default was prevented (the event's defaultPrevented should be true)
    const evt = submitSpy.mock.calls[0][0]
    expect(evt.defaultPrevented).toBe(true)
  })

  it('renders empty bands array: band fieldset HIDDEN entirely (empty-legend bug fix)', () => {
    const { container } = render(<MemberFilter {...BASE_PROPS} bands={[]} />)
    // No "Filter by band" / "按乐队筛选" legend should be present
    expect(screen.queryByText(/Filter by band/i)).not.toBeInTheDocument()
    expect(screen.queryByText('按乐队筛选')).not.toBeInTheDocument()
    // No band-related fieldset should render
    expect(container.querySelector('.member-filter-bands')).toBeNull()
    // No band chip buttons (aria-pressed is the band-chip identifier)
    expect(container.querySelectorAll('button[aria-pressed]').length).toBe(0)
    // Role fieldset still renders
    expect(screen.getByText(/^Role$/)).toBeInTheDocument()
  })

  it('hides band fieldset when bands prop is undefined', () => {
    const { container } = render(
      <MemberFilter {...BASE_PROPS} bands={undefined} />,
    )
    expect(container.querySelector('.member-filter-bands')).toBeNull()
  })

  it('renders band fieldset when bands array has at least one entry', () => {
    const { container } = render(
      <MemberFilter {...BASE_PROPS} bands={['roselia']} />,
    )
    expect(container.querySelector('.member-filter-bands')).not.toBeNull()
    expect(screen.getByText(/Filter by band/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
  })

  it('search label is associated with input via for/id', () => {
    render(<MemberFilter {...BASE_PROPS} />)
    const input = screen.getByLabelText('Search')
    expect(input.id).toBe('member-search')
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input.getAttribute('type')).toBe('search')
  })

  it('form has role="search" landmark', () => {
    render(<MemberFilter {...BASE_PROPS} />)
    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('search input is controlled (value prop honored)', () => {
    render(<MemberFilter {...BASE_PROPS} searchValue="kanade" />)
    expect(screen.getByLabelText('Search')).toHaveValue('kanade')
  })
})
