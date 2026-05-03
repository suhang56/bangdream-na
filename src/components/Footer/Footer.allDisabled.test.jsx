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
      url: '',
      qrImage: null,
      enabled: false,
    },
  ],
}))

describe('<Footer /> with all-disabled social', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('omits Communities column entirely when no enabled+url entries', () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    const headings = container.querySelectorAll('.footer-heading')
    expect(headings.length).toBe(2)
    expect(
      screen.queryByRole('heading', { level: 3, name: /^communities$/i }),
    ).toBeNull()
  })
})
