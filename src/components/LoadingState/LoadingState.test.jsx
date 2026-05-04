import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingState from './LoadingState.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<LoadingState />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders English label by default in EN', () => {
    setLanguage('en')
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('renders Chinese label in ZH', () => {
    setLanguage('zh')
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('加载中')
  })

  it('uses provided label override when supplied', () => {
    setLanguage('en')
    render(<LoadingState label="Custom loading…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Custom loading…')
  })

  it('marks region as aria-live=polite for AT announcements', () => {
    setLanguage('en')
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('appends custom className when provided', () => {
    setLanguage('en')
    const { container } = render(<LoadingState className="news-loading" />)
    expect(container.querySelector('.loading-state.news-loading')).not.toBeNull()
  })
})
