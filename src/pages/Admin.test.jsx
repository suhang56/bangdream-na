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
    expect(screen.getByRole('button', { name: /events/i, current: 'page' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/no events yet/i)).toBeInTheDocument())
  })

  it('clicking nav button switches view', async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    await waitFor(() => expect(screen.getByText(/no events yet/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^members$/i }))
    await waitFor(() => expect(screen.getByText(/no members yet/i)).toBeInTheDocument())
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
})
