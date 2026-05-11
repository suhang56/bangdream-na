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

  it('community list ends with a single mailto:contact@bangdream.org link', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    const mailLinks = container.querySelectorAll(
      '.bf-foot a[href="mailto:contact@bangdream.org"]',
    )
    expect(mailLinks.length).toBe(1)
    const li = mailLinks[0].closest('li')
    const ul = li.parentElement
    expect(ul.lastElementChild).toBe(li)
  })

  it('mailto link carries CN speller-form aria-label (Footer is CN-only chrome)', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    const mail = container.querySelector(
      '.bf-foot a[href="mailto:contact@bangdream.org"]',
    )
    expect(mail).not.toBeNull()
    expect(mail.getAttribute('aria-label')).toBe(
      '发送邮件至 contact at bangdream dot org',
    )
  })

  it('mailto link textContent includes both ✉ glyph and the email literal', () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    const mail = container.querySelector(
      '.bf-foot a[href="mailto:contact@bangdream.org"]',
    )
    expect(mail.textContent).toContain('✉')
    expect(mail.textContent).toContain('contact@bangdream.org')
  })
})
