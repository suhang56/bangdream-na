import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Hero from './Hero.jsx'

describe('<Hero />', () => {
  it('renders all three names with proper lang attrs', () => {
    const { container } = renderWithProviders(
      <Hero
        communityName="BanG Dream North America Chinese Community"
        communityNameZh="北美炸梦同好会"
        communityNameJp="バンドリ北米華人コミュニティ"
        tagline="Concerts and conventions"
        discordUrl="https://discord.gg/abc"
      />,
    )
    expect(container.querySelector('[lang="ja"]')).toHaveTextContent(
      'バンドリ北米華人コミュニティ',
    )
    expect(container.querySelector('[lang="zh"]')).toHaveTextContent(
      '北美炸梦同好会',
    )
    expect(container.querySelector('[lang="en"]')).toHaveTextContent(
      'BanG Dream North America Chinese Community',
    )
  })

  it('Chinese name carries the H1 (canonical)', () => {
    renderWithProviders(
      <Hero
        communityName="EN Name"
        communityNameZh="北美炸梦同好会"
        communityNameJp="JP"
        tagline=""
        discordUrl=""
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: '北美炸梦同好会' }),
    ).toBeInTheDocument()
  })

  it('ZH missing → EN promotes to H1 (edge)', () => {
    renderWithProviders(
      <Hero
        communityName="EN Only"
        communityNameJp="JP"
        tagline=""
        discordUrl=""
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'EN Only' }),
    ).toBeInTheDocument()
  })

  it('all three missing → fallback H1 (edge)', () => {
    renderWithProviders(<Hero tagline="" discordUrl="" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'BanG Dream NA' }),
    ).toBeInTheDocument()
  })

  it('JP missing → no JP line rendered (edge)', () => {
    const { container } = renderWithProviders(
      <Hero
        communityName="EN"
        communityNameZh="ZH"
        tagline=""
        discordUrl=""
      />,
    )
    expect(container.querySelector('[lang="ja"]')).toBeNull()
  })

  it('omits tagline when empty (edge)', () => {
    const { container } = renderWithProviders(
      <Hero communityName="X" tagline="" discordUrl="" />,
    )
    expect(container.querySelector('.hero-tagline')).toBeNull()
  })

  it('renders disabled CTA when discordUrl empty (edge)', () => {
    renderWithProviders(<Hero communityName="X" tagline="y" discordUrl="" />)
    expect(
      screen.getByRole('button', { name: /discord coming soon/i }),
    ).toBeDisabled()
  })

  it('renders active CTA when discordUrl valid', () => {
    renderWithProviders(
      <Hero
        communityName="X"
        tagline="y"
        discordUrl="https://discord.gg/abc"
      />,
    )
    expect(
      screen.getByRole('link', { name: /join discord/i }),
    ).toBeInTheDocument()
  })

  it('renders children prop in hero-extra slot', () => {
    renderWithProviders(
      <Hero communityName="X" tagline="" discordUrl="">
        <div data-testid="extra">Carousel</div>
      </Hero>,
    )
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })
})
