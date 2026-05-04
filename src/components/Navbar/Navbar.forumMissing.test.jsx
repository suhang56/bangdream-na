import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import { cache } from '../../lib/cache.js'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    fetchSite: vi.fn(),
    fetchSocial: vi.fn(),
  }
})

import { fetchSite, fetchSocial } from '../../lib/api.js'

describe('<Navbar /> defensive: forum row missing entirely', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockResolvedValue({ items: [] })
    vi.mocked(fetchSocial).mockResolvedValue({
      items: [
        {
          id: 1,
          platform: 'discord',
          label_zh: 'Discord',
          url: 'https://discord.gg/abc',
          icon: null,
          sort_order: 0,
          active: 1,
        },
      ],
      total: 1,
    })
  })

  it('hides forum when social table has no forum row', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    await waitFor(() => {
      expect(vi.mocked(fetchSocial).mock.calls.length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Forum' })).toBeNull()
    })
  })
})
