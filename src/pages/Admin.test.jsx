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
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders shell + sidebar + default Events view when token present', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    expect(screen.getByRole('button', { name: '活动', current: 'page' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/no 活动 yet/i)).toBeInTheDocument())
  })

  it('clicking nav button switches view', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/no 活动 yet/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '成员' }))
    await waitFor(() => expect(screen.getByText(/no 成员 yet/i)).toBeInTheDocument())
  })

  it('logout clears token and returns to login', () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('login then submit sets token and shows shell', async () => {
    render(<Admin />)
    fireEvent.change(screen.getByLabelText(/personal access token/i), { target: { value: 'ghp_TEST' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_TEST')
  })

  it('S11/S12: 401-style ghGet error auto-logs out, clears sessionStorage, shows expired banner', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Unauthorized — token expired or revoked.'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_stale')
    render(<Admin />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByText(/expired or was revoked/i)).toBeInTheDocument()
  })

  it('S12: 403 forbidden-token error also auto-logs out', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Forbidden — token lacks required scope.'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_weak')
    render(<Admin />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByText(/expired or was revoked/i)).toBeInTheDocument()
  })

  it('non-auth error keeps user logged in and shows error banner (not auto-logout)', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('GitHub server error (502).'))
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_good')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument())
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_good')
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull()
  })
})
