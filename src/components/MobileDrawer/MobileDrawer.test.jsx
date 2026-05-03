import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileDrawer from './MobileDrawer.jsx'

describe('<MobileDrawer />', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <MobileDrawer open={false} onClose={() => {}} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog when open=true', () => {
    render(
      <MobileDrawer open={true} onClose={() => {}} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('Escape calls onClose (edge)', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <MobileDrawer open={true} onClose={onClose} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('backdrop click calls onClose (edge)', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <MobileDrawer open={true} onClose={onClose} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    const backdrop = container.querySelector('.mobile-drawer-backdrop')
    await user.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking inside drawer panel does NOT close', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <MobileDrawer open={true} onClose={onClose} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    await user.click(screen.getByRole('button', { name: 'Inside' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('locks body scroll when open + restores on close (edge)', () => {
    const { rerender } = render(
      <MobileDrawer open={true} onClose={() => {}} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <MobileDrawer open={false} onClose={() => {}} ariaLabel="Menu">
        <button>Inside</button>
      </MobileDrawer>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('focus moves to first focusable on open (edge)', () => {
    render(
      <MobileDrawer open={true} onClose={() => {}} ariaLabel="Menu">
        <button>First</button>
        <button>Second</button>
      </MobileDrawer>,
    )
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' }),
    )
  })

  it('Tab from last cycles to first (edge — focus trap)', async () => {
    const user = userEvent.setup()
    render(
      <MobileDrawer open={true} onClose={() => {}} ariaLabel="Menu">
        <button>First</button>
        <button>Last</button>
      </MobileDrawer>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    last.focus()
    await user.tab()
    expect(document.activeElement).toBe(first)
  })

  it('Shift+Tab from first cycles to last (edge — focus trap)', async () => {
    const user = userEvent.setup()
    render(
      <MobileDrawer open={true} onClose={() => {}} ariaLabel="Menu">
        <button>First</button>
        <button>Last</button>
      </MobileDrawer>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    first.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(last)
  })
})
