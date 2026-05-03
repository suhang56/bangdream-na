import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventFilterSheet from './EventFilterSheet.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const empty = {
  types: new Set(),
  bands: new Set(),
  from: '',
  to: '',
  keyword: '',
}

describe('<EventFilterSheet />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('dialog has no [open] attribute when open=false', () => {
    const { container } = render(
      <EventFilterSheet
        open={false}
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    const dialog = container.querySelector('dialog.event-filter-sheet')
    expect(dialog).not.toBeNull()
    expect(dialog.hasAttribute('open')).toBe(false)
  })

  it('renders open dialog when open=true', () => {
    const { container } = render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    const dialog = container.querySelector('dialog.event-filter-sheet')
    expect(dialog).not.toBeNull()
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders 4 category chips and search input', () => {
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fan Meets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conventions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Online' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('hides band section when availableBands empty (edge)', () => {
    const { container } = render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
        availableBands={[]}
      />,
    )
    const legends = container.querySelectorAll('legend')
    const texts = Array.from(legends).map((l) => l.textContent)
    expect(texts).not.toContain('Band')
  })

  it('shows band section when availableBands provided', () => {
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
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
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Concerts' }))
    const next = onChange.mock.calls[0][0]
    expect(next.types).toBeInstanceOf(Set)
    expect(next.types.has('concert')).toBe(true)
    expect(empty.types.size).toBe(0)
  })

  it('Escape key closes the sheet (native <dialog> close event)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking backdrop region closes the sheet', () => {
    const onClose = vi.fn()
    const { container } = render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    const dialog = container.querySelector('dialog.event-filter-sheet')
    // Stub bounding rect; simulate click at coords outside it.
    dialog.getBoundingClientRect = () => ({
      left: 100,
      right: 200,
      top: 100,
      bottom: 200,
      width: 100,
      height: 100,
      x: 100,
      y: 100,
    })
    fireEvent.click(dialog, { clientX: 50, clientY: 50 })
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking inside sheet content does NOT close it (edge)', () => {
    const onClose = vi.fn()
    const { container } = render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    const dialog = container.querySelector('dialog.event-filter-sheet')
    dialog.getBoundingClientRect = () => ({
      left: 0,
      right: 200,
      top: 0,
      bottom: 200,
      width: 200,
      height: 200,
      x: 0,
      y: 0,
    })
    // Click inside rect — should NOT close.
    fireEvent.click(dialog, { clientX: 100, clientY: 100 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clicking on a child element does NOT close (edge)', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('heading', { name: 'Filters' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('close button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Close filters' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('apply button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={onClose}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('keyword search debounced 200ms calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={onChange}
      />,
    )
    const search = screen.getByRole('searchbox')
    await user.type(search, 'tour')
    await new Promise((r) => setTimeout(r, 250))
    const last = onChange.mock.calls.at(-1)[0]
    expect(last.keyword).toBe('tour')
  })

  it('clear button visible + onClick resets all', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, types: new Set(['concert']) }
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={state}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    const last = onChange.mock.calls.at(-1)[0]
    expect(last.types.size).toBe(0)
    expect(last.bands.size).toBe(0)
    expect(last.keyword).toBe('')
  })

  it('clear hidden when no filters set', () => {
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Clear filters' }),
    ).toBeNull()
  })

  it('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = ''
    const { rerender } = render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <EventFilterSheet
        open={false}
        onClose={() => {}}
        filterState={empty}
        onChange={() => {}}
      />,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('toggling band chip calls onChange immutably', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={onChange}
        availableBands={['Roselia']}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    const next = onChange.mock.calls[0][0]
    expect(next.bands).toBeInstanceOf(Set)
    expect(next.bands.has('Roselia')).toBe(true)
  })

  it('toggling band chip twice removes it (edge)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const state = { ...empty, bands: new Set(['Roselia']) }
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={state}
        onChange={onChange}
        availableBands={['Roselia']}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Roselia' }))
    const next = onChange.mock.calls.at(-1)[0]
    expect(next.bands.has('Roselia')).toBe(false)
  })

  it('changing date input fires onChange with updated from', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={empty}
        onChange={onChange}
      />,
    )
    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0], '2026-12-31')
    const fromCall = onChange.mock.calls.find(
      (c) => c[0].from && c[0].from.length > 0,
    )
    expect(fromCall).toBeTruthy()
  })

  it('chip aria-pressed reflects state', () => {
    const state = { ...empty, types: new Set(['concert']) }
    render(
      <EventFilterSheet
        open
        onClose={() => {}}
        filterState={state}
        onChange={() => {}}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Concerts' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Fan Meets' }),
    ).toHaveAttribute('aria-pressed', 'false')
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
        <EventFilterSheet
          open
          onClose={() => {}}
          filterState={state}
          onChange={() => {}}
          availableBands={['Roselia']}
        />,
      ),
    ).not.toThrow()
  })
})
