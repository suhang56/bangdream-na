import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UtilityBar from './UtilityBar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import * as api from '../../lib/api.js'
import { cache } from '../../lib/cache.js'

function renderBar() {
  return render(
    <MemoryRouter>
      <UtilityBar />
    </MemoryRouter>,
  )
}

describe('<UtilityBar />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    cache.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cache.clear()
  })

  it('renders pulse + 在线 + disclaimer + LangToggle', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderBar()
    expect(container.querySelector('.bf-utility')).toBeInTheDocument()
    expect(container.querySelector('.bf-pulse')).toBeInTheDocument()
    expect(container.textContent).toContain('在线')
    expect(container.textContent).toContain('非官方')
    expect(container.querySelector('[role="group"]')).toBeInTheDocument()
  })

  it('pulse has exact green color #7be0a3 (locked per Designer §5)', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderBar()
    const pulse = container.querySelector('.bf-pulse')
    expect(pulse).toBeInTheDocument()
    expect(pulse.className).toBe('bf-pulse')
  })

  it('H7: .bf-uleft contains span with 更新于 JST timestamp on initial render', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderBar()
    const uleft = container.querySelector('.bf-uleft')
    // Timestamp is computed on initial render (lazy useState)
    expect(uleft.textContent).toContain('更新于')
    expect(uleft.textContent).toMatch(/更新于 \d{4}\.\d{2}\.\d{2}/)
    expect(uleft.textContent).toContain('JST')
  })

  it('D9-HOTFIX: member chip shows real fetchMembers count (no + suffix)', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 147 })
    const { container } = renderBar()
    await waitFor(() => {
      const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
      expect(hideMobile).toBeInTheDocument()
      expect(hideMobile.textContent).toContain('147')
    })
    const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
    expect(hideMobile.textContent).not.toContain('+')
    expect(hideMobile.textContent).not.toContain('150')
  })

  it('D9-HOTFIX: member chip hidden during pending fetch (no 0/placeholder leak)', () => {
    // Never-resolving promise simulates pending
    vi.spyOn(api, 'fetchMembers').mockReturnValue(new Promise(() => {}))
    const { container } = renderBar()
    const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
    expect(hideMobile).toBeNull()
  })

  it('D9-HOTFIX: member chip hidden on fetch error (silent fallback, no broken text)', async () => {
    vi.spyOn(api, 'fetchMembers').mockRejectedValue(new Error('net'))
    const { container } = renderBar()
    // Wait long enough for the rejected promise to flush microtasks
    await waitFor(() => {
      const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
      expect(hideMobile).toBeNull()
    })
  })

  it('D9-HOTFIX: prefers total over items.length when both present', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({
      items: [{ id: 1 }, { id: 2 }],
      total: 42,
    })
    const { container } = renderBar()
    await waitFor(() => {
      const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
      expect(hideMobile?.textContent).toContain('42')
    })
  })

  it('D9-HOTFIX: falls back to items.length when total missing', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })
    const { container } = renderBar()
    await waitFor(() => {
      const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
      expect(hideMobile?.textContent).toContain('3')
    })
  })
})
