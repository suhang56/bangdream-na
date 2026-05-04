import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchMe: vi.fn(),
    logout: vi.fn(),
    adminListNews: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    adminListEvents: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    adminListMembers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    adminListCategories: vi.fn().mockResolvedValue({ items: [] }),
  }
})

import Admin from './Admin.jsx'
import * as api from '../lib/api.js'

const ADMIN_USER = {
  id: 1,
  github_login: 'admin-x',
  display_name: 'Admin',
  avatar_url: null,
  role: 'admin',
}

const MEMBER_USER = {
  id: 2,
  github_login: 'member-x',
  display_name: 'Member',
  avatar_url: null,
  role: 'member',
}

describe('<Admin />', () => {
  let originalLocation
  beforeEach(() => {
    originalLocation = window.location
    delete window.location
    window.location = { ...originalLocation, assign: vi.fn() }
    api.logout.mockResolvedValue()
    api.adminListNews.mockResolvedValue({ items: [], total: 0 })
    api.adminListEvents.mockResolvedValue({ items: [], total: 0 })
    api.adminListMembers.mockResolvedValue({ items: [], total: 0 })
    api.adminListCategories.mockResolvedValue({ items: [] })
  })
  afterEach(() => {
    vi.clearAllMocks()
    window.location = originalLocation
  })

  it('shows checking → login when fetchMe returns null (anon)', async () => {
    api.fetchMe.mockResolvedValue(null)
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
  })

  it('shows admin shell + nav when admin user is logged in', async () => {
    api.fetchMe.mockResolvedValue({ user: ADMIN_USER })
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /资讯/, current: 'page' })).toBeInTheDocument(),
    )
    await waitFor(() => expect(screen.getByText(/还没有资讯/)).toBeInTheDocument())
  })

  it('shows member-blocked screen when role=member', async () => {
    api.fetchMe.mockResolvedValue({ user: MEMBER_USER })
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /需要管理员权限/ })).toBeInTheDocument(),
    )
    expect(screen.getByText(/member-x/)).toBeInTheDocument()
  })

  it('member can click 登出 to clear and return to login', async () => {
    api.fetchMe.mockResolvedValueOnce({ user: MEMBER_USER }).mockResolvedValue(null)
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /需要管理员权限/ })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /^登出$/ }))
    await waitFor(() => expect(api.logout).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
  })

  it('clicking nav switches view', async () => {
    api.fetchMe.mockResolvedValue({ user: ADMIN_USER })
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/还没有资讯/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^成员$/ }))
    await waitFor(() => expect(screen.getByText(/还没有成员/)).toBeInTheDocument())
  })

  it('admin logout calls api.logout and returns to login', async () => {
    api.fetchMe.mockResolvedValueOnce({ user: ADMIN_USER }).mockResolvedValue(null)
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/还没有资讯/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^登出$/ }))
    await waitFor(() => expect(api.logout).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
  })

  it('login button click navigates to /api/auth/github', async () => {
    api.fetchMe.mockResolvedValue(null)
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /使用 GitHub 登录/ }))
    expect(window.location.assign).toHaveBeenCalledWith(expect.stringContaining('/api/auth/github'))
  })

  it('fetchMe network error shows anon + auth error banner', async () => {
    api.fetchMe.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/网络错误/),
    )
    expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument()
  })

  it('AdminEditor 401 from list triggers logout flow + expired banner', async () => {
    api.fetchMe.mockResolvedValueOnce({ user: ADMIN_USER }).mockResolvedValue(null)
    api.adminListNews.mockReset().mockRejectedValue(new api.ApiError('GET 401', { status: 401 }))
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
    expect(screen.getByText(/登录已过期/)).toBeInTheDocument()
  })

  it('fetchMe with malformed body (no user) treated as anon', async () => {
    api.fetchMe.mockResolvedValue({})
    render(<Admin />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
  })
})
