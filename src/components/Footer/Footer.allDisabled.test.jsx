import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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

describe('<Footer /> with all-disabled social', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockResolvedValue({ items: [] })
    // Server filters by active=1, so an all-disabled social table just
    // returns empty items — no "Communities" column should render.
    vi.mocked(fetchSocial).mockResolvedValue({ items: [], total: 0 })
  })

  it('omits Communities column entirely when no enabled+url entries', async () => {
    const { container } = renderWithProviders(<Footer />, { route: '/' })
    // Wait one tick for the fetch promise to flush.
    await waitFor(() => {
      const headings = container.querySelectorAll('.footer-heading')
      expect(headings.length).toBe(2)
    })
    expect(
      screen.queryByRole('heading', { level: 3, name: /^communities$/i }),
    ).toBeNull()
  })
})
