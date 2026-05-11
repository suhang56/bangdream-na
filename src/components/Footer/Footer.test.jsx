import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, findByLabelText } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import Footer from './Footer.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'
import * as api from '../../lib/api.js'
import { cache } from '../../lib/cache.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  it('LOW-D1: en locale renders English aria-label after switch (no reload)', async () => {
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    const { container } = renderFoot()
    setLanguage('en')
    const mail = await findByLabelText(
      container,
      'Send email to contact at bangdream dot org',
    )
    expect(mail.getAttribute('href')).toBe('mailto:contact@bangdream.org')
  })

  it('LOW-D1: Footer.jsx no longer carries the CONTACT_ARIA_ZH literal', () => {
    const src = readFileSync(resolve(__dirname, 'Footer.jsx'), 'utf8')
    expect(src).not.toContain('CONTACT_ARIA_ZH')
  })

  it('LOW-D2: Footer.css mobile @700 block contains min-height: 44px rule', () => {
    const css = readFileSync(resolve(__dirname, 'Footer.css'), 'utf8')
    expect(
      /@media[^{]*\(max-width:\s*700px\)[^]*?min-height:\s*44px/.test(css),
    ).toBe(true)
  })

  it('LOW-D2: Footer.css mobile block bumps ul gap to 8px', () => {
    const css = readFileSync(resolve(__dirname, 'Footer.css'), 'utf8')
    expect(
      /@media[^{]*\(max-width:\s*700px\)[^]*?\.bf-foot ul[^}]*gap:\s*8px/.test(
        css,
      ),
    ).toBe(true)
  })
})
