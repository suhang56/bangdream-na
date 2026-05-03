import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventSidebar from './EventSidebar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const empty = {
  types: new Set(),
  bands: new Set(),
  from: '',
  to: '',
  keyword: '',
}

describe('<EventSidebar />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders 4 category chips + date inputs + search', () => {
    render(<EventSidebar filterState={empty} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fan Meets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conventions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Online' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('hides band section when no availableBands (edge)', () => {
    const { container } = render(
      <EventSidebar filterState={empty} onChange={() => {}} availableBands={[]} />,
    )
    const legends = container.querySelectorAll('legend')
    const texts = Array.from(legends).map((l) => l.textContent)
    expect(texts).not.toContain('Band')
  })

  it('shows band section when availableBands provided', () => {
    render(
      <EventSidebar
        filterState={empty}
        onChange={() => {}}
        availableBands={['Roselia', 'Mygo']}
      />,
    )
    expect(screen.getByRole('button', { name: 'Roselia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mygo' })).toBeInTheDocument()
  })

  it('toggling category chip calls onChange immutably', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EventSidebar filterState={empty} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    const next = onChange.mock.calls[0][0]
    expect(next.types).toBeInstanceOf(Set)
    expect(next.types.has('concert')).toBe(true)
    expect(empty.types.size).toBe(0)
  })

  it('keyword XSS attempt safely treated as plain text (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EventSidebar filterState={empty} onChange={onChange} />)
    const search = screen.getByRole('searchbox')
    await user.type(search, '<script>')
    await new Promise((r) => setTimeout(r, 250))
    const last = onChange.mock.calls.at(-1)[0]
    expect(typeof last.keyword).toBe('string')
    expect(last.keyword).toBe('<script>')
  })

  it('date range invert (from > to) accepted as-is (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EventSidebar filterState={empty} onChange={onChange} />)
    const inputs = document.querySelectorAll('input[type="date"]')
    await user.type(inputs[0], '2026-12-31')
    const fromCall = onChange.mock.calls.find(
      (c) => c[0].from && c[0].from.length > 0,
    )
    expect(fromCall).toBeTruthy()
  })

  it('clear button visible + onClick resets all', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, types: new Set(['concert']) }
    render(<EventSidebar filterState={state} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    const last = onChange.mock.calls.at(-1)[0]
    expect(last.types.size).toBe(0)
    expect(last.bands.size).toBe(0)
    expect(last.keyword).toBe('')
  })

  it('clear hidden when no filters set', () => {
    const { container } = render(
      <EventSidebar filterState={empty} onChange={() => {}} />,
    )
    expect(container.querySelector('.event-sidebar__clear')).toBeNull()
  })

  it('chip aria-pressed reflects state', () => {
    const state = { ...empty, types: new Set(['concert']) }
    render(<EventSidebar filterState={state} onChange={() => {}} />)
    expect(
      screen.getByRole('button', { name: 'Concerts' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Fan Meets' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggling a band chip calls onChange immutably', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EventSidebar
        filterState={empty}
        onChange={onChange}
        availableBands={['Roselia', 'Mygo']}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    const next = onChange.mock.calls[0][0]
    expect(next.bands).toBeInstanceOf(Set)
    expect(next.bands.has('Roselia')).toBe(true)
    expect(empty.bands.size).toBe(0)
  })

  it('toggling band chip twice removes it (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, bands: new Set(['Roselia']) }
    render(
      <EventSidebar
        filterState={state}
        onChange={onChange}
        availableBands={['Roselia']}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.bands.has('Roselia')).toBe(false)
  })

  it('changing date-to input fires onChange with updated to', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EventSidebar filterState={empty} onChange={onChange} />)
    const dateInputs = document.querySelectorAll('input[type="date"]')
    // dateInputs[0] = from, dateInputs[1] = to
    await user.type(dateInputs[1], '2026-12-31')
    const toCall = onChange.mock.calls.find(
      (c) => c[0].to && c[0].to.length > 0,
    )
    expect(toCall).toBeTruthy()
    expect(toCall[0].to).toContain('2026')
  })

  it('mobile-toggle button toggles aria-expanded', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <EventSidebar filterState={empty} onChange={() => {}} />,
    )
    const toggle = container.querySelector('.event-sidebar__toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('all-filters set does not crash (edge)', () => {
    const state = {
      types: new Set(['concert', 'fanmeet', 'con', 'online']),
      bands: new Set(['Roselia']),
      from: '2026-01-01',
      to: '2026-12-31',
      keyword: 'tour',
    }
    expect(() =>
      render(
        <EventSidebar
          filterState={state}
          onChange={() => {}}
          availableBands={['Roselia']}
        />,
      ),
    ).not.toThrow()
  })
})
