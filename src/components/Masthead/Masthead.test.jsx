import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Masthead from './Masthead.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function renderMast() {
  return render(
    <MemoryRouter>
      <Masthead />
    </MemoryRouter>,
  )
}

describe('<Masthead />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })

  it('renders logo lockup with CN wordmark + tag + strip', () => {
    const { container } = renderMast()
    const logo = container.querySelector('.bf-logo')
    expect(logo).toBeInTheDocument()
    expect(container.querySelector('.lg-tag')).toBeInTheDocument()
    expect(container.querySelector('.lg-bandori')).toBeInTheDocument()
    expect(container.querySelector('.lg-fans')).toBeInTheDocument()
    expect(container.querySelector('.lg-strip')).toBeInTheDocument()
    expect(container.textContent).toContain('北美炸梦')
    expect(container.textContent).toContain('同好会')
    expect(container.textContent).toContain('BanG Dream')
  })

  it('logo aria-label is 北美炸梦同好会', () => {
    const { container } = renderMast()
    const logo = container.querySelector('.bf-logo')
    expect(logo.getAttribute('aria-label')).toBe('北美炸梦同好会')
  })

  it('logo links to /', () => {
    const { container } = renderMast()
    const logo = container.querySelector('.bf-logo')
    expect(logo.getAttribute('href')).toBe('/')
  })

  it('renders search input + kbd + button', () => {
    const { container } = renderMast()
    expect(container.querySelector('.bf-search input')).toBeInTheDocument()
    expect(container.querySelector('.bf-skbd')).toBeInTheDocument()
    expect(container.querySelector('.bf-search button')).toBeInTheDocument()
  })
})
