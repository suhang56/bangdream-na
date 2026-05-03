import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import About from './About.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

describe('<About />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    _resetForTests()
  })

  it('renders tri-lingual hero (JP + ZH H1 + EN)', () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(screen.getByText('バンドリ北米華人コミュニティ')).toBeInTheDocument()
    expect(screen.getByText('北美炸梦同好会')).toBeInTheDocument()
    expect(
      screen.getByText('BanG Dream North America Chinese Community'),
    ).toBeInTheDocument()
  })

  it('Chinese name carries the H1 (canonical)', () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(
      screen.getByRole('heading', { level: 1, name: /北美炸梦同好会/ }),
    ).toBeInTheDocument()
  })

  it('renders Mission/Join sections (history removed)', () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(screen.getByRole('heading', { level: 2, name: /mission/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /how to join/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /history/i })).toBeNull()
  })

  it('renders FAQ accordion', () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(screen.getByRole('heading', { level: 2, name: /faq/i })).toBeInTheDocument()
    expect(container.querySelectorAll('details').length).toBeGreaterThanOrEqual(2)
  })

  it('does not render COC section (moved to /rules tab)', () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(container.querySelector('#coc')).toBeNull()
  })

  it('disclaimer always visible', () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(screen.getByRole('heading', { level: 2, name: /disclaimer/i })).toBeInTheDocument()
    expect(screen.getByText(/not affiliated with bushiroad/i)).toBeInTheDocument()
  })

  it('section anchors have ids', () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(container.querySelector('#mission')).not.toBeNull()
    expect(container.querySelector('#faq')).not.toBeNull()
    expect(container.querySelector('#disclaimer')).not.toBeNull()
    expect(container.querySelector('#join')).not.toBeNull()
    expect(container.querySelector('#history')).toBeNull()
    expect(container.querySelector('#coc')).toBeNull()
  })

  it('JP/ZH/EN spans carry lang attributes', () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })
})
