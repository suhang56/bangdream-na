import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
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
  ],
}))

describe('<Navbar /> defensive: forum row missing entirely', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('hides forum when social array has no forum row', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.queryByRole('link', { name: 'Forum' })).toBeNull()
  })
})
