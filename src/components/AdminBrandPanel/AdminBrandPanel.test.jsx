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

  it('renders the logo image with src=/logo.png and aria-hidden (decorative)', () => {
    const { container } = render(<AdminBrandPanel />)
    const img = container.querySelector('img.admin-brand-panel-mark')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/logo.png')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(img).toHaveAttribute('alt', '')
  })

  it('does not render an inline SVG (logo is an <img>, not vector)', () => {
    const { container } = render(<AdminBrandPanel />)
    expect(container.querySelector('svg')).toBeNull()
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
