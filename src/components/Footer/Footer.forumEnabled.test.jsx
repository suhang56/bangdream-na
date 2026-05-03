import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Footer from './Footer.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

vi.mock('../../data/social.json', () => ({
  default: [
    {
      platform: 'discord',
      label: 'Discord',
      url: 'https://discord.gg/abc',
      qrImage: null,
      enabled: true,
    },
    {
      platform: 'forum',
      label: '论坛',
      url: 'https://forum.bangdream.org',
      qrImage: null,
      enabled: true,
    },
  ],
}))

describe('<Footer /> with forum enabled', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('shows forum link in Communities column when enabled', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const link = screen.getByRole('link', { name: 'Forum' })
    expect(link).toHaveAttribute('href', 'https://forum.bangdream.org')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Communities column has 2 links when only discord+forum enabled', () => {
    renderWithProviders(<Footer />, { route: '/' })
    const heading = screen.getByRole('heading', {
      level: 3,
      name: /^communities$/i,
    })
    const column = heading.closest('.footer-column')
    expect(column.querySelectorAll('a').length).toBe(2)
  })
})
