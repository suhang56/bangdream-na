import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from './Footer.jsx'

describe('<Footer />', () => {
  it('renders community name + current year', () => {
    render(<Footer communityName="BanG Dream! Fan Community NA" />)
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument()
    expect(screen.getByText(/bang dream! fan community na/i)).toBeInTheDocument()
  })

  it('renders disclaimer text', () => {
    render(<Footer communityName="X" />)
    expect(screen.getByText(/fan community/i)).toBeInTheDocument()
    expect(screen.getByText(/not affiliated/i)).toBeInTheDocument()
  })

  it('handles empty community name (edge)', () => {
    const { container } = render(<Footer communityName="" />)
    expect(container.querySelector('.footer-copy')).toBeInTheDocument()
  })
})
