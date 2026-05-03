import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import Home from './Home.jsx'
import site from '../data/site.json'

describe('<Home />', () => {
  it('renders hero with community name from site.json', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 1, name: site.communityName }),
    ).toBeInTheDocument()
  })

  it('renders Chinese community name when present', () => {
    renderWithProviders(<Home />, { route: '/' })
    if (site.communityNameZh) {
      expect(screen.getByText(site.communityNameZh)).toBeInTheDocument()
    }
  })

  it('renders tagline', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(screen.getByText(site.tagline)).toBeInTheDocument()
  })

  it('renders Discord CTA in disabled state when site.discordInvite is empty', () => {
    expect(site.discordInvite).toBe('')
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('button', { name: /discord coming soon/i }),
    ).toBeDisabled()
  })

  it('renders Coming Soon section with Events + Members cards', () => {
    renderWithProviders(<Home />, { route: '/' })
    expect(
      screen.getByRole('heading', { level: 2, name: /coming soon/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Members' })).toBeInTheDocument()
  })
})
