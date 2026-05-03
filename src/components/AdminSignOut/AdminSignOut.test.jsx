import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminSignOut from './AdminSignOut.jsx'

describe('<AdminSignOut />', () => {
  it('renders default Chinese label "登出"', () => {
    render(<AdminSignOut onSignOut={() => {}} />)
    expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
  })

  it('clicking calls onSignOut immediately when confirm=false (default)', () => {
    const onSignOut = vi.fn()
    render(<AdminSignOut onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('clicking with confirm=true shows confirm row first; second click triggers', () => {
    const onSignOut = vi.fn()
    render(<AdminSignOut onSignOut={onSignOut} confirm={true} />)
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    expect(onSignOut).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '确认登出' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '确认登出' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('confirm cancel button returns to base state without triggering', () => {
    const onSignOut = vi.fn()
    render(<AdminSignOut onSignOut={onSignOut} confirm={true} />)
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onSignOut).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '确认登出' })).toBeNull()
  })

  it('respects custom label prop', () => {
    render(<AdminSignOut onSignOut={() => {}} label="退出登录" />)
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument()
  })

  it('does not throw when onSignOut is undefined', () => {
    render(<AdminSignOut />)
    expect(() => fireEvent.click(screen.getByRole('button', { name: '登出' }))).not.toThrow()
  })

  it('confirm group has role="group" and chinese aria-label', () => {
    render(<AdminSignOut onSignOut={() => {}} confirm={true} />)
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    const grp = screen.getByRole('group', { name: '确认登出' })
    expect(grp).toBeInTheDocument()
  })
})
