import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminBrandPanel from './AdminBrandPanel.jsx'

describe('<AdminBrandPanel />', () => {
  it('renders the 后台 wordmark', () => {
    render(<AdminBrandPanel />)
    expect(screen.getByText('后台')).toBeInTheDocument()
  })

  it('renders the BD!NA 后台 subtitle', () => {
    render(<AdminBrandPanel />)
    expect(screen.getByText('BD!NA 后台')).toBeInTheDocument()
  })

  it('renders the sigil SVG with aria-hidden=true (decorative)', () => {
    const { container } = render(<AdminBrandPanel />)
    const mark = container.querySelector('.admin-brand-panel-mark')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    const svg = mark.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('sigil stroke uses currentColor (theme-tintable)', () => {
    const { container } = render(<AdminBrandPanel />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('does not render any English brand text other than BD!NA acronym', () => {
    const { container } = render(<AdminBrandPanel />)
    const text = container.textContent ?? ''
    // Only allow BD!NA + Chinese chrome
    const englishWords = text.match(/[A-Za-z]{3,}/g) ?? []
    for (const w of englishWords) {
      expect(['BD']).toContain(w)
    }
  })
})
