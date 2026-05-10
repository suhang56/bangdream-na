import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import Rules from './Rules.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchAbout: vi.fn(),
  }
})

import { fetchAbout } from '../lib/api.js'

function aboutRows(coc) {
  return {
    items: [
      { id: 1, slug: 'mission', title_zh: '使命', body_md: 'test mission', sort_order: 0 },
      { id: 2, slug: 'coc', title_zh: '群规', body_md: coc, sort_order: 20 },
    ],
  }
}

describe('<Rules />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchAbout).mockReset()
  })

  afterEach(() => {
    _resetForTests()
  })

  it('renders page hero with // 群规 tag', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows('① 禁止恶意攻击。'))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.ph-tag')).not.toBeNull()
    expect(container.querySelector('.ph-tag').textContent).toContain('群规')
  })

  it('renders rules title heading', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows('① 规则一。'))
    renderWithProviders(<Rules />, { route: '/rules' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /群规/ }),
    ).toBeInTheDocument()
  })

  it('empty rule list shows noCoc fallback, footer still present', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows(''))
    renderWithProviders(<Rules />, { route: '/rules' })
    expect(await screen.findByText(/COC pending/i)).toBeInTheDocument()
    expect(screen.getByText(/违反群规/)).toBeInTheDocument()
  })

  it('single rule renders exactly 1 bf-rule card', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows('① 禁止恶意攻击。'))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-rule').length).toBe(1)
    })
  })

  it('many rules (20) renders 20 bf-rule cards', async () => {
    const rules = Array.from({ length: 20 }, (_, i) => `规则 ${i + 1} 的内容。`).join('\n\n')
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows(rules))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-rule').length).toBe(20)
    })
  })

  it('long rule text (>500 chars) renders without truncation', async () => {
    const longText = '这是一条很长的群规内容。'.repeat(50)
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows(longText))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      const card = container.querySelector('.bf-rule')
      expect(card).not.toBeNull()
    })
    const ruleText = container.querySelector('.bf-rule-text')
    expect(ruleText).not.toBeNull()
    expect(ruleText.textContent.length).toBeGreaterThan(100)
  })

  it('bf-rule cards exist (border-left class present)', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows('① 禁止。\n\n② 不准。'))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      const cards = container.querySelectorAll('.bf-rule')
      expect(cards.length).toBe(2)
      cards.forEach((c) => expect(c.className).toContain('bf-rule'))
    })
  })

  it('footer note always visible', async () => {
    vi.mocked(fetchAbout).mockResolvedValue(aboutRows('① 规则。'))
    renderWithProviders(<Rules />, { route: '/rules' })
    expect(await screen.findByText(/违反群规/)).toBeInTheDocument()
  })

  it('shows LoadingState while fetch is pending', () => {
    vi.mocked(fetchAbout).mockImplementation(() => new Promise(() => {}))
    const { container } = renderWithProviders(<Rules />, { route: '/rules' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
  })

  it('shows ErrorState on fetch reject', async () => {
    vi.mocked(fetchAbout).mockRejectedValue(new Error('5xx'))
    renderWithProviders(<Rules />, { route: '/rules' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
  })
})
