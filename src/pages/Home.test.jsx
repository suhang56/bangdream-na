import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import Home from './Home.jsx'
import site from '../data/site.json'

describe('<Home />', () => {
  it('renders hero with Chinese H1 (canonical) when communityNameZh present', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityNameZh }),
    ).toBeInTheDocument()
  })

  it('renders Japanese name when present', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.communityNameJp)).toBeInTheDocument()
  })

  it('renders English name as sister line', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.communityName)).toBeInTheDocument()
  })

  it('renders tagline', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.tagline)).toBeInTheDocument()
  })

  it('renders active Discord CTA when invite present', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('link', { name: /join discord/i }),
    ).toBeInTheDocument()
  })

  it('all three lang attributes present (lang=ja|zh|en)', () => {
    const { container } = renderWithProviders(<Home />, { route: '/' })
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })
})
