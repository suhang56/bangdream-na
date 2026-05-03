import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminNav from './AdminNav.jsx'

describe('<AdminNav />', () => {
  it('renders all 7 schema buttons', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} onLogout={() => {}} />)
    for (const label of ['Events', 'Members', 'News', 'Posts (home carousel)', 'Social links', 'Site identity', 'About page']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks active key with aria-current=page', () => {
    render(<AdminNav activeKey="news" onSelect={() => {}} onLogout={() => {}} />)
    expect(screen.getByRole('button', { name: 'News' })).toHaveAttribute('aria-current', 'page')
  })

  it('clicking a schema button calls onSelect with key', () => {
    const onSelect = vi.fn()
    render(<AdminNav activeKey="events" onSelect={onSelect} onLogout={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Members' }))
    expect(onSelect).toHaveBeenCalledWith('members')
  })

  it('logout button calls onLogout', () => {
    const onLogout = vi.fn()
    render(<AdminNav activeKey="events" onSelect={() => {}} onLogout={onLogout} />)
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('shows "No open PR" when openPR is null', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} onLogout={() => {}} />)
    expect(screen.getByText(/no open pr/i)).toBeInTheDocument()
  })

  it('shows PR link when openPR is set', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} onLogout={() => {}} openPR={{ number: 42, htmlUrl: 'https://github.com/x/y/pull/42' }} />)
    const link = screen.getByRole('link', { name: /open pr #42/i })
    expect(link).toHaveAttribute('href', 'https://github.com/x/y/pull/42')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('View Site link uses target=_blank rel=noopener noreferrer', () => {
    render(<AdminNav activeKey="events" onSelect={() => {}} onLogout={() => {}} />)
    const link = screen.getByRole('link', { name: /view site/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
