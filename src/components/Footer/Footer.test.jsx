import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import * as api from '../../lib/api.js'
import { cache } from '../../lib/cache.js'

function renderFoot() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

describe('<Footer />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    cache.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cache.clear()
  })

  it('D9-HOTFIX: .bf-foot-bottom embeds live member count, no 150+ suffix', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 84 })
    const { container } = renderFoot()
    await waitFor(() => {
      const bottom = container.querySelector('.bf-foot-bottom')
      expect(bottom.textContent).toContain('84')
    })
    const bottom = container.querySelector('.bf-foot-bottom')
    expect(bottom.textContent).not.toContain('150+')
    expect(bottom.textContent).not.toContain('150 ')
  })

  it('D9-HOTFIX: .bf-foot-bottom hides count fragment while fetchMembers pending', () => {
    vi.spyOn(api, 'fetchMembers').mockReturnValue(new Promise(() => {}))
    const { container } = renderFoot()
    const bottom = container.querySelector('.bf-foot-bottom')
    expect(bottom).toBeInTheDocument()
    expect(bottom.textContent).not.toContain('150+')
    expect(bottom.textContent).not.toContain('···')
    expect(bottom.textContent).not.toContain('同好 0')
  })

  it('D9-HOTFIX: .bf-foot-bottom hides count fragment on fetchMembers error', async () => {
    vi.spyOn(api, 'fetchMembers').mockRejectedValue(new Error('net'))
    const { container } = renderFoot()
    await waitFor(() => {
      // Other bottom-bar pieces still render (build date / copyright)
      const bottom = container.querySelector('.bf-foot-bottom')
      expect(bottom.textContent).toContain('build')
    })
    const bottom = container.querySelector('.bf-foot-bottom')
    expect(bottom.textContent).not.toContain('150+')
    expect(bottom.textContent).not.toContain('同好 —')
  })

  it('D9-HOTFIX: falls back to items.length when total missing', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    })
    const { container } = renderFoot()
    await waitFor(() => {
      const bottom = container.querySelector('.bf-foot-bottom')
      expect(bottom.textContent).toContain('5')
    })
  })

  it('renders 4-column grid (about / community / resources / external)', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    expect(container.querySelector('.bf-foot-grid')).toBeInTheDocument()
    const cols = container.querySelectorAll('.bf-foot-grid > div')
    expect(cols.length).toBe(4)
  })

  it('community list contains 成员 link to /members (route remains accessible)', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    const membersLink = container.querySelector('.bf-foot a[href="/members"]')
    expect(membersLink).toBeInTheDocument()
    expect(membersLink.textContent).toContain('成员')
  })
})
