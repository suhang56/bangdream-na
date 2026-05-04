import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Footer from './Footer.jsx'
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

describe('<Footer /> with forum enabled', () => {
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
        {
          id: 2,
          platform: 'forum',
          label_zh: '论坛',
          url: 'https://forum.bangdream.org',
          icon: null,
          sort_order: 1,
          active: 1,
        },
      ],
      total: 2,
    })
  })

  it('shows forum link in Communities column when enabled', async () => {
    renderWithProviders(<Footer />, { route: '/' })
    const link = await screen.findByRole('link', { name: 'Forum' })
    expect(link).toHaveAttribute('href', 'https://forum.bangdream.org')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Communities column has 2 links when only discord+forum enabled', async () => {
    renderWithProviders(<Footer />, { route: '/' })
    const heading = await screen.findByRole('heading', {
      level: 3,
      name: /^communities$/i,
    })
    const column = heading.closest('.footer-column')
    expect(column.querySelectorAll('a').length).toBe(2)
  })
})
