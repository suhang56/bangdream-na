import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventFilter from './EventFilter.jsx'

function setup(overrides = {}) {
  const onChange = vi.fn()
  const onSortChange = vi.fn()
  const props = {
    filterState: { types: new Set() },
    onChange,
    sortDir: 'asc',
    onSortChange,
    ...overrides,
  }
  const utils = render(<EventFilter {...props} />)
  return { ...utils, onChange, onSortChange, props }
}

describe('<EventFilter />', () => {
  it('renders three type chips with expected labels', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fan Meets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conventions' })).toBeInTheDocument()
  })

  it('chip toggle ON: starts inactive → click → onChange called with Set containing the type', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const arg = onChange.mock.calls[0][0]
    expect(arg.types instanceof Set).toBe(true)
    expect(arg.types.has('concert')).toBe(true)
  })

  it('chip toggle OFF: starts active → click → onChange called with Set without the type', async () => {
    const user = userEvent.setup()
    const { onChange } = setup({ filterState: { types: new Set(['concert']) } })
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    const arg = onChange.mock.calls[0][0]
    expect(arg.types.has('concert')).toBe(false)
  })

  it('aria-pressed reflects active state', () => {
    setup({ filterState: { types: new Set(['fanmeet']) } })
    expect(
      screen.getByRole('button', { name: 'Fan Meets' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: 'Concerts' }).getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('sort radio change → onSortChange called with new value', async () => {
    const user = userEvent.setup()
    const { onSortChange } = setup()
    await user.click(screen.getByLabelText('Latest first'))
    expect(onSortChange).toHaveBeenCalledWith('desc')
  })

  it('sort radio reflects sortDir prop', () => {
    setup({ sortDir: 'desc' })
    expect(screen.getByLabelText('Latest first').checked).toBe(true)
    expect(screen.getByLabelText('Earliest first').checked).toBe(false)
  })

  it('does not mutate the input Set (immutability)', async () => {
    const user = userEvent.setup()
    const inputSet = new Set(['concert'])
    const onChange = vi.fn()
    render(
      <EventFilter
        filterState={{ types: inputSet }}
        onChange={onChange}
        sortDir="asc"
        onSortChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Fan Meets' }))
    expect(inputSet.has('concert')).toBe(true)
    expect(inputSet.has('fanmeet')).toBe(false)
    expect(inputSet.size).toBe(1)
  })

  it('keyboard: Tab + Enter on chip fires onChange (edge)', async () => {
    const user = userEvent.setup()
    const { onChange } = setup()
    const chip = screen.getByRole('button', { name: 'Concerts' })
    chip.focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalled()
  })

  it('handles missing filterState.types gracefully (edge)', () => {
    expect(() =>
      render(
        <EventFilter
          filterState={{}}
          onChange={() => {}}
          sortDir="asc"
          onSortChange={() => {}}
        />,
      ),
    ).not.toThrow()
  })
})
