import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Admin from './Admin.jsx'
import { TOKEN_STORAGE_KEY } from '../components/AdminLogin/AdminLogin.jsx'

describe('<Admin />', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('renders login screen when no token in sessionStorage', () => {
    render(<Admin />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders shell when token already present', () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    expect(screen.getByRole('heading', { level: 1, name: /admin panel/i })).toBeInTheDocument()
  })

  it('logout clears token and returns to login screen', () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_test')
    render(<Admin />)
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
