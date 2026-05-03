import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewsSidebar from './NewsSidebar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const empty = { categories: new Set(), from: '', to: '', keyword: '' }

describe('<NewsSidebar />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('renders 4 category chips + date inputs + search', () => {
    render(<NewsSidebar filterState={empty} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Announcement' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Event' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Community' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('toggling a category chip calls onChange with new Set', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NewsSidebar filterState={empty} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Announcement' }))
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls[0][0]
    expect(next.categories).toBeInstanceOf(Set)
    expect(next.categories.has('announcement')).toBe(true)
    // immutability: original state unchanged
    expect(empty.categories.size).toBe(0)
  })

  it('keyword search debounces 200ms (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NewsSidebar filterState={empty} onChange={onChange} />)
    const input = screen.getByRole('searchbox')
    await user.type(input, 'hi')
    // typing fires no immediate onChange (debounced)
    const beforeCount = onChange.mock.calls.length
    await new Promise((r) => setTimeout(r, 250))
    expect(onChange.mock.calls.length).toBeGreaterThan(beforeCount)
  })

  it('chip aria-pressed reflects state', () => {
    const state = { ...empty, categories: new Set(['event']) }
    render(<NewsSidebar filterState={state} onChange={() => {}} />)
    expect(
      screen.getByRole('button', { name: 'Event' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Announcement' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('clear button hides when no filters active (edge)', () => {
    const { container } = render(
      <NewsSidebar filterState={empty} onChange={() => {}} />,
    )
    expect(container.querySelector('.news-sidebar__clear')).toBeNull()
  })

  it('clear button visible + onClick resets state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, categories: new Set(['event']) }
    render(<NewsSidebar filterState={state} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    const last = onChange.mock.calls.at(-1)[0]
    expect(last.categories).toBeInstanceOf(Set)
    expect(last.categories.size).toBe(0)
    expect(last.from).toBe('')
    expect(last.to).toBe('')
    expect(last.keyword).toBe('')
  })

  it('toggling category chip twice removes it (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, categories: new Set(['event']) }
    render(<NewsSidebar filterState={state} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Event' }))
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.categories.has('event')).toBe(false)
  })

  it('changing date-from input fires onChange with updated from', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NewsSidebar filterState={empty} onChange={onChange} />)
    const inputs = document.querySelectorAll('input[type="date"]')
    await user.type(inputs[0], '2026-01-01')
    const fromCall = onChange.mock.calls.find(
      (c) => c[0].from && c[0].from.length > 0,
    )
    expect(fromCall).toBeTruthy()
    expect(fromCall[0].from).toContain('2026')
  })

  it('changing date-to input fires onChange with updated to', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NewsSidebar filterState={empty} onChange={onChange} />)
    const inputs = document.querySelectorAll('input[type="date"]')
    await user.type(inputs[1], '2026-12-31')
    const toCall = onChange.mock.calls.find(
      (c) => c[0].to && c[0].to.length > 0,
    )
    expect(toCall).toBeTruthy()
    expect(toCall[0].to).toContain('2026')
  })

  it('mobile-toggle button toggles aria-expanded', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <NewsSidebar filterState={empty} onChange={() => {}} />,
    )
    const toggle = container.querySelector('.news-sidebar__toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('active-count badge reflects multiple filters (edge)', () => {
    const state = {
      categories: new Set(['event', 'announcement']),
      from: '2026-01-01',
      to: '2026-12-31',
      keyword: 'launch',
    }
    const { container } = render(
      <NewsSidebar filterState={state} onChange={() => {}} />,
    )
    const toggle = container.querySelector('.event-sidebar__toggle, .news-sidebar__toggle')
    // 2 categories + from + to + keyword = 5
    expect(toggle.textContent).toContain('5')
  })
})
