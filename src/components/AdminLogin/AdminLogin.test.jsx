import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminLogin from './AdminLogin.jsx'

describe('<AdminLogin />', () => {
  let originalLocation
  beforeEach(() => {
    originalLocation = window.location
    delete window.location
    window.location = { ...originalLocation, assign: vi.fn() }
  })
  afterEach(() => {
    window.location = originalLocation
  })

  it('renders login button', () => {
    render(<AdminLogin />)
    expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument()
  })

  it('clicking button navigates to /api/auth/github', () => {
    render(<AdminLogin />)
    fireEvent.click(screen.getByRole('button', { name: /使用 GitHub 登录/ }))
    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/github'),
    )
  })

  it('expiredBanner prop shows banner', () => {
    render(<AdminLogin expiredBanner />)
    expect(screen.getByText(/登录已过期/)).toBeInTheDocument()
  })

  it('forbiddenBanner prop shows banner', () => {
    render(<AdminLogin forbiddenBanner />)
    expect(screen.getByText(/没有管理员权限/)).toBeInTheDocument()
  })

  it('without banners, no banner text rendered', () => {
    render(<AdminLogin />)
    expect(screen.queryByText(/已过期/)).toBeNull()
    expect(screen.queryByText(/没有管理员权限/)).toBeNull()
  })

  it('does not render any PAT text input (regression: no token paste UI)', () => {
    render(<AdminLogin />)
    expect(screen.queryByLabelText(/personal access token/i)).toBeNull()
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })

  it('renders accessible help section about OAuth', () => {
    render(<AdminLogin />)
    expect(screen.getByText(/关于登录/)).toBeInTheDocument()
    expect(screen.getByText(/HttpOnly/)).toBeInTheDocument()
  })
})
