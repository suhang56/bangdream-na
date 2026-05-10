import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils.jsx'
import { cache } from '../lib/cache.js'

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchMembers: vi.fn(),
  }
})

import { fetchMembers } from '../lib/api.js'
import Members from './Members.jsx'

const sampleApiRows = [
  {
    id: 1,
    external_id: 'a1',
    display_name: 'Alice Anderson',
    city: 'San Francisco, CA',
    oshi_character: 'Yukina Minato',
    oshi_band: 'roselia',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 2,
    external_id: 'b1',
    display_name: 'Bob Brown',
    city: 'Los Angeles, CA',
    oshi_character: null,
    oshi_band: 'mygo',
    avatar_url: null,
    expedition_member: 0,
  },
  {
    id: 3,
    external_id: 'c1',
    display_name: '戸山香澄',
    city: 'New York, NY',
    oshi_character: 'Kasumi Toyama',
    oshi_band: 'popipa',
    avatar_url: null,
    expedition_member: 0,
  },
]

function mockResolved(rows) {
  vi.mocked(fetchMembers).mockResolvedValue({ items: rows, total: rows.length })
}

beforeEach(() => {
  cache.clear()
  vi.mocked(fetchMembers).mockReset()
  mockResolved(sampleApiRows)
})

afterEach(() => {
  cache.clear()
  vi.clearAllMocks()
})

describe('Members page — page hero', () => {
  it('renders ph-tag with // 成员', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.ph-tag')).not.toBeNull()
    })
    expect(container.querySelector('.ph-tag').textContent).toContain('// 成员')
  })

  it('renders h1 with 成员', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('成员')
  })

  it('renders ph-meta with roster description', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.ph-meta')).not.toBeNull()
    })
    expect(container.querySelector('.ph-meta').textContent).toContain('北美 BanG Dream')
  })
})

describe('Members page — helper block', () => {
  it('renders bf-helper with bf-helper-tag', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.bf-helper')).not.toBeNull()
    })
    expect(container.querySelector('.bf-helper-tag').textContent).toContain('// 组织者')
  })

  it('shows member count from API in the helper', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.bf-helper strong')).not.toBeNull()
    })
    expect(container.querySelector('.bf-helper strong').textContent).toBe('3')
  })
})

describe('Members page — grid', () => {
  it('renders bf-members-grid', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.bf-members-grid')).not.toBeNull()
    })
  })

  it('renders one bf-member tile per member', async () => {
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-member').length).toBe(3)
    })
  })

  it('each member name is visible in a bf-member tile', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    expect(await screen.findByText('Alice Anderson')).toBeInTheDocument()
    expect(screen.getByText('Bob Brown')).toBeInTheDocument()
    expect(screen.getByText('戸山香澄')).toBeInTheDocument()
  })

  it('does NOT render band filter chips', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByText('Alice Anderson')
    expect(screen.queryByRole('button', { name: 'Roselia' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'MyGO!!!!!' })).toBeNull()
  })

  it('does NOT render a search input', async () => {
    renderWithProviders(<Members />, { route: '/members' })
    await screen.findByText('Alice Anderson')
    expect(screen.queryByLabelText('Search')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
})

describe('Members page — sort order', () => {
  it('renders members sorted by pinyin ascending', async () => {
    const unsortedRows = [
      { id: 1, external_id: 'z', display_name: '西瓜', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
      { id: 2, external_id: 'a', display_name: '啊明', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
      { id: 3, external_id: 'b', display_name: '北京', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
    ]
    vi.mocked(fetchMembers).mockResolvedValue({ items: unsortedRows, total: 3 })
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-member').length).toBe(3)
    })
    const tiles = Array.from(container.querySelectorAll('.bf-member')).map((el) => el.textContent)
    const ahIdx = tiles.indexOf('啊明')
    const beiIdx = tiles.indexOf('北京')
    const xiIdx = tiles.indexOf('西瓜')
    expect(ahIdx).toBeLessThan(beiIdx)
    expect(beiIdx).toBeLessThan(xiIdx)
  })
})

describe('Members page — edge cases', () => {
  it('empty list renders helper with count 0 and no bf-member tiles', async () => {
    vi.mocked(fetchMembers).mockResolvedValue({ items: [], total: 0 })
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.bf-helper')).not.toBeNull()
    })
    expect(container.querySelector('.bf-helper strong').textContent).toBe('0')
    expect(container.querySelectorAll('.bf-member').length).toBe(0)
  })

  it('single member renders exactly 1 bf-member tile', async () => {
    vi.mocked(fetchMembers).mockResolvedValue({
      items: [sampleApiRows[0]],
      total: 1,
    })
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-member').length).toBe(1)
    })
  })

  it('member with very long name renders without throwing', async () => {
    const longName = 'A'.repeat(60) + ' 超長名前テスト Very Long Display Name For Testing'
    vi.mocked(fetchMembers).mockResolvedValue({
      items: [{ id: 99, external_id: 'long', display_name: longName, city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 }],
      total: 1,
    })
    expect(() => renderWithProviders(<Members />, { route: '/members' })).not.toThrow()
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-member').length).toBeGreaterThan(0)
    })
  })

  it('member with special chars (emoji, brackets, slashes) renders without throwing', async () => {
    const specialRows = [
      { id: 1, external_id: 's1', display_name: '🍊噶', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
      { id: 2, external_id: 's2', display_name: '[湾区] 红白', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
      { id: 3, external_id: 's3', display_name: '美西/北京 海鸥', city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 },
    ]
    vi.mocked(fetchMembers).mockResolvedValue({ items: specialRows, total: 3 })
    expect(() => renderWithProviders(<Members />, { route: '/members' })).not.toThrow()
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelectorAll('.bf-member').length).toBe(3)
    })
  })

  it('member with null name renders gracefully (no crash)', async () => {
    vi.mocked(fetchMembers).mockResolvedValue({
      items: [{ id: 1, external_id: 'n1', display_name: null, city: '', oshi_character: null, oshi_band: null, avatar_url: null, expedition_member: 0 }],
      total: 1,
    })
    expect(() => renderWithProviders(<Members />, { route: '/members' })).not.toThrow()
  })
})

describe('Members page — loading and error states', () => {
  it('shows LoadingState while API is pending', async () => {
    let resolve
    vi.mocked(fetchMembers).mockImplementation(() => new Promise((r) => { resolve = r }))
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    expect(container.querySelector('.members-loading')).not.toBeNull()
    resolve({ items: sampleApiRows, total: 3 })
    await waitFor(() => {
      expect(container.querySelector('.members-loading')).toBeNull()
    })
  })

  it('shows ErrorState with retry button on API failure', async () => {
    vi.mocked(fetchMembers).mockRejectedValueOnce(new Error('5xx'))
    const { container } = renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(container.querySelector('.members-error')).not.toBeNull()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('clicking retry re-fetches members after error', async () => {
    vi.mocked(fetchMembers)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ items: sampleApiRows, total: 3 })
    renderWithProviders(<Members />, { route: '/members' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
    screen.getByRole('button', { name: /retry/i }).click()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry/i })).toBeNull()
    })
    expect(await screen.findByText('Alice Anderson')).toBeInTheDocument()
  })
})
