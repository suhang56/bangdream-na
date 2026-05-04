import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorState from './ErrorState.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<ErrorState />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders default English message in EN', () => {
    setLanguage('en')
    render(<ErrorState />)
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load')
  })

  it('renders default Chinese message in ZH', () => {
    setLanguage('zh')
    render(<ErrorState />)
    expect(screen.getByRole('alert')).toHaveTextContent('加载失败')
  })

  it('uses custom message when provided', () => {
    setLanguage('en')
    render(<ErrorState message="Server is down" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server is down')
  })

  it('does not render retry button when onRetry is not a function', () => {
    setLanguage('en')
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders retry button when onRetry is provided and triggers it on click', async () => {
    setLanguage('en')
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    const btn = screen.getByRole('button', { name: 'Retry' })
    await userEvent.click(btn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('Chinese retry label flips with language', () => {
    setLanguage('zh')
    render(<ErrorState onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('uses custom retryLabel when supplied', () => {
    setLanguage('en')
    render(<ErrorState onRetry={() => {}} retryLabel="Try again" />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('appends custom className', () => {
    setLanguage('en')
    const { container } = render(<ErrorState className="news-error" />)
    expect(container.querySelector('.error-state.news-error')).not.toBeNull()
  })

  it('marks alert with aria-live=assertive', () => {
    setLanguage('en')
    render(<ErrorState />)
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })
})
