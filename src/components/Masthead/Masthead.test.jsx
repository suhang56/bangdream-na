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

  it('H5: renders bf-logo-img with src ending in logo.png and correct alt', () => {
    const { container } = renderMast()
    const img = container.querySelector('img.bf-logo-img')
    expect(img).toBeInTheDocument()
    expect(img.getAttribute('src')).toMatch(/logo\.png$/)
    expect(img.getAttribute('alt')).toBe('北美炸梦同好会')
  })

  it('H5: .lg-bandori and .lg-fans text spans are absent', () => {
    const { container } = renderMast()
    expect(container.querySelector('.lg-bandori')).toBeNull()
    expect(container.querySelector('.lg-fans')).toBeNull()
  })

  it('H5: .lg-tag and .lg-strip remain in DOM', () => {
    const { container } = renderMast()
    expect(container.querySelector('.lg-tag')).toBeInTheDocument()
    expect(container.querySelector('.lg-strip')).toBeInTheDocument()
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
