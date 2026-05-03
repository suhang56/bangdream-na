import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Admin from './Admin.jsx'
import { TOKEN_STORAGE_KEY } from '../components/AdminLogin/AdminLogin.jsx'
import * as githubApi from '../lib/githubApi.js'

describe('<Admin />', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.spyOn(githubApi, 'ghGet').mockResolvedValue({ content: [], sha: 'sha', raw: '[]' })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders login screen when no token', () => {
    render(<Admin />)
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('renders shell + sidebar + default Events view when token present', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    expect(screen.getByRole('button', { name: '活动', current: 'page' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/还没有活动/)).toBeInTheDocument())
  })

  it('clicking nav button switches view', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/还没有活动/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '成员' }))
    await waitFor(() => expect(screen.getByText(/还没有成员/)).toBeInTheDocument())
  })

  it('logout clears token and returns to login', () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    fireEvent.click(screen.getByRole('button', { name: '登出' }))
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('login then submit sets token and shows shell', async () => {
    render(<Admin />)
    fireEvent.change(screen.getByLabelText(/personal access token/i), { target: { value: 'ghp_TEST' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_TEST')
  })

  it('S11/S12: 401-style ghGet error auto-logs out, clears sessionStorage, shows expired banner', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Unauthorized — token expired or revoked.'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_stale')
    render(<Admin />)
    await waitFor(() => expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByText(/已过期或被撤销/)).toBeInTheDocument()
  })

  it('S12: 403 forbidden-token error also auto-logs out', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Forbidden — token lacks required scope.'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_weak')
    render(<Admin />)
    await waitFor(() => expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByText(/已过期或被撤销/)).toBeInTheDocument()
  })

  it('non-auth error keeps user logged in and shows error banner (not auto-logout)', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('GitHub server error (502).'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_good')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_good')
    expect(screen.queryByRole('button', { name: '登录' })).toBeNull()
  })

  it('renders AdminTopBar with breadcrumb 后台 / 活动 by default', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    expect(screen.getByLabelText('后台导航路径')).toBeInTheDocument()
    expect(screen.getByText('查看网站 ↗')).toBeInTheDocument()
    expect(screen.getByText('无待合并 PR')).toBeInTheDocument()
  })

  it('save flow surfaces save-status pill in TopBar', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: [{ id: 'a-1', title: 'Existing', date: '2025-09-15T19:00:00-07:00', type: 'concert', location: { city: 'LA' } }],
      sha: 'sha1',
      raw: '[]',
    })
    vi.spyOn(githubApi, 'commitContentChange').mockResolvedValue({
      pr: { number: 12, htmlUrl: 'https://x/pull/12', created: false },
      commit: { sha: 'c' },
    })
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText('Existing')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^标题/), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: /保存（提交 PR）/ }))
    await waitFor(() => expect(screen.getByText(/已保存 · PR #12/)).toBeInTheDocument())
  })
})
