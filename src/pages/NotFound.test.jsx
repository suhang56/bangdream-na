import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/utils.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import NotFound from './NotFound.jsx'

function RoutesUnderTest() {
  return (
    <Routes>
      <Route path="/" element={<div>home</div>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

describe('<NotFound />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
  })

  it('renders 404 panel for an unknown URL (en)', () => {
    setLanguage('en')
    renderWithProviders(<RoutesUnderTest />, { route: '/this-does-not-exist' })
    const panel = screen.getByTestId('not-found')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Page not found')
    expect(panel).toHaveTextContent("doesn't exist")
    expect(screen.getByRole('link', { name: /Back to home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('renders zh copy when language is zh', () => {
    setLanguage('zh')
    renderWithProviders(<RoutesUnderTest />, { route: '/不存在' })
    expect(screen.getByText('页面未找到')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument()
  })

  it('a known route renders the home element, not the catch-all', () => {
    setLanguage('en')
    renderWithProviders(<RoutesUnderTest />, { route: '/' })
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByTestId('not-found')).toBeNull()
  })
})
