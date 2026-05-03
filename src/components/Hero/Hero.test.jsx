import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Hero from './Hero.jsx'

describe('<Hero />', () => {
  it('renders community name as h1 + tagline + Chinese subtitle', () => {
    renderWithProviders(
      <Hero
        communityName="BanG Dream! Fan Community NA"
        communityNameZh="北美炸梦同好会"
        tagline="Concerts and conventions"
        discordUrl="https://discord.gg/abc"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /bang dream! fan community na/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('北美炸梦同好会')).toBeInTheDocument()
    expect(screen.getByText('Concerts and conventions')).toBeInTheDocument()
  })

  it('omits Chinese subtitle when not provided (edge)', () => {
    const { container } = renderWithProviders(
      <Hero communityName="Test" tagline="t" discordUrl="" />,
    )
    expect(container.querySelector('.hero-name-zh')).toBeNull()
  })

  it('omits tagline when empty (edge)', () => {
    const { container } = renderWithProviders(
      <Hero communityName="Test" tagline="" discordUrl="" />,
    )
    expect(container.querySelector('.hero-tagline')).toBeNull()
  })

  it('renders disabled CTA when discordUrl is empty (edge)', () => {
    renderWithProviders(<Hero communityName="X" tagline="y" discordUrl="" />)
    expect(screen.getByRole('button', { name: /discord coming soon/i })).toBeDisabled()
  })

  it('renders active CTA when discordUrl is valid', () => {
    renderWithProviders(
      <Hero communityName="X" tagline="y" discordUrl="https://discord.gg/abc" />,
    )
    expect(screen.getByRole('link', { name: /join discord/i })).toBeInTheDocument()
  })
})
