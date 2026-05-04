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

describe('<Navbar /> defensive: forum enabled but url empty', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockResolvedValue({ items: [] })
    // The Worker rejects empty URLs at the schema layer, but a row that
    // somehow makes it through must still be hidden by the URL guard.
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
        {
          id: 2,
          platform: 'forum',
          label_zh: '论坛',
          url: '',
          icon: null,
          sort_order: 1,
          active: 1,
        },
      ],
      total: 2,
    })
  })

  it('hides forum when enabled:true but url empty (URL guard)', async () => {
    renderWithProviders(<Navbar />, { route: '/' })
    // Wait one event-loop tick so the fetch promise has a chance to flush.
    await waitFor(() => {
      expect(vi.mocked(fetchSocial).mock.calls.length).toBeGreaterThan(0)
    })
    // Forum is hidden because `url` is empty → isForumEnabled returns false.
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Forum' })).toBeNull()
    })
  })
})
