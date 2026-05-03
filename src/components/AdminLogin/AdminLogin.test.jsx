import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminLogin, { TOKEN_STORAGE_KEY } from './AdminLogin.jsx'

describe('<AdminLogin />', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('PAT input has type=password and autoComplete=off (S1)', () => {
    render(<AdminLogin />)
    const input = screen.getByLabelText(/personal access token/i)
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('spellcheck', 'false')
    expect(input).not.toHaveAttribute('name')
  })

  it('empty submit does not call onLogin and does not write sessionStorage', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<AdminLogin onLogin={onLogin} />)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onLogin).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(/paste/i)
  })

  it('submit with token writes sessionStorage and calls onLogin', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<AdminLogin onLogin={onLogin} />)
    await user.type(screen.getByLabelText(/personal access token/i), 'ghp_AAA111')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_AAA111')
    expect(onLogin).toHaveBeenCalledWith('ghp_AAA111')
  })

  it('Enter key submits the form', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<AdminLogin onLogin={onLogin} />)
    const input = screen.getByLabelText(/personal access token/i)
    await user.type(input, 'ghp_BBB222{Enter}')
    expect(onLogin).toHaveBeenCalledWith('ghp_BBB222')
  })

  it('shows expired-token banner when prop is set', () => {
    render(<AdminLogin expiredBanner />)
    expect(screen.getByText(/expired or was revoked/i)).toBeInTheDocument()
  })

  it('renders PAT scope guidance with target=_blank rel=noopener noreferrer (S16)', () => {
    render(<AdminLogin />)
    const link = screen.getByRole('link', { name: /github tokens page/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not log the token (S6)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<AdminLogin onLogin={() => {}} />)
    await user.type(screen.getByLabelText(/personal access token/i), 'ghp_SECRET')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    for (const call of spy.mock.calls) {
      for (const arg of call) {
        if (typeof arg === 'string') expect(arg).not.toContain('ghp_SECRET')
      }
    }
    spy.mockRestore()
  })

  it('whitespace-only input shows error', () => {
    render(<AdminLogin onLogin={() => {}} />)
    const input = screen.getByLabelText(/personal access token/i)
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/paste/i)
  })

  it('clears input value after successful submit', async () => {
    const user = userEvent.setup()
    render(<AdminLogin onLogin={() => {}} />)
    const input = screen.getByLabelText(/personal access token/i)
    await user.type(input, 'ghp_X')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(input).toHaveValue('')
  })
})
