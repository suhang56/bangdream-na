import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

vi.mock('../data/news.json', () => ({ default: [] }))

describe('<News />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    _resetForTests()
  })

  it('renders heading and empty state when news=[]', async () => {
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(screen.getByRole('heading', { level: 1, name: /news/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/no news/i)
  })

  it('renders sidebar', async () => {
    const { default: News } = await import('./News.jsx')
    renderWithProviders(<News />, { route: '/news' })
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
})
