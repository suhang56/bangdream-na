import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test/utils.jsx'
import About from './About.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'
import { cache } from '../lib/cache.js'
import i18n from '../data/i18n.json'
import { QQ_GROUP_URL } from '../data/socialLinks.js'

const siteJson = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}

vi.mock('../lib/api.js', async () => {
  const actual = await vi.importActual('../lib/api.js')
  return {
    ...actual,
    fetchSite: vi.fn(),
    fetchMembers: vi.fn(),
    fetchEvents: vi.fn(),
  }
})

import { fetchSite, fetchMembers, fetchEvents } from '../lib/api.js'

function siteRows() {
  const items = []
  for (const [k, v] of Object.entries(siteJson)) {
    if (typeof v !== 'string' || v.length === 0) continue
    items.push({ key: `site.${k}`, value: v })
  }
  return { items }
}

const NARRATIVE_BODY_KEYS = [
  'about.lead',
  'about.body1',
  'about.body2',
  'about.body3',
  'about.body4',
  'about.body5',
  'about.closing',
]

describe('<About />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    cache.clear()
    vi.mocked(fetchSite).mockReset()
    vi.mocked(fetchMembers).mockReset()
    vi.mocked(fetchEvents).mockReset()
    vi.mocked(fetchSite).mockResolvedValue(siteRows())
    vi.mocked(fetchMembers).mockResolvedValue({ items: [], total: 42 })
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 17 })
  })

  afterEach(() => {
    _resetForTests()
    cache.clear()
  })

  it('renders tri-lingual hero (JP + ZH H1 + EN)', async () => {
    renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(screen.getByText('北美炸梦同好会')).toBeInTheDocument()
    expect(
      screen.getByText('BanG Dream North America Chinese Community'),
    ).toBeInTheDocument()
  })

  it('Chinese name carries the H1 (canonical)', async () => {
    renderWithProviders(<About />, { route: '/about' })
    expect(
      await screen.findByRole('heading', { level: 1, name: /北美炸梦同好会/ }),
    ).toBeInTheDocument()
  })

  it('renders narrative section + contact + stats in DOM order', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const narrative = container.querySelector('#story')
    const contact = container.querySelector('#contact')
    const stats = container.querySelector('.about-stats-block')
    expect(narrative).not.toBeNull()
    expect(contact).not.toBeNull()
    expect(stats).not.toBeNull()
    const o1 = narrative.compareDocumentPosition(contact)
    expect(o1 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const o2 = contact.compareDocumentPosition(stats)
    expect(o2 & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('narrative renders 7 paragraphs each > 30 chars (EN)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const narrative = container.querySelector('[data-testid="about-narrative"]')
    expect(narrative).not.toBeNull()
    const paragraphs = narrative.querySelectorAll('p')
    expect(paragraphs.length).toBe(7)
    paragraphs.forEach((p) => {
      // missing-key fallback returns the key literal (e.g. "about.lead", len 10);
      // require > 30 chars to trip on any missing translation
      expect(p.textContent.length).toBeGreaterThan(30)
    })
  })

  it('EN lang renders EN narrative copy with band names + brand words preserved', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const narrative = container.querySelector('[data-testid="about-narrative"]')
    expect(narrative.textContent).toContain('BD!NA')
    expect(narrative.textContent).toContain('Kirakira Dokidoki')
    expect(narrative.textContent).toContain('MyGO!!!!!')
    expect(narrative.textContent).toContain("Poppin'Party")
    expect(narrative.textContent).toContain('RAISE A SUILEN')
  })

  it('ZH lang renders ZH narrative copy verbatim with brand words preserved', async () => {
    setLanguage('zh')
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const narrative = container.querySelector('[data-testid="about-narrative"]')
    expect(narrative.textContent).toContain('北美邦多利同好会')
    expect(narrative.textContent).toContain('Kirakira Dokidoki')
    expect(narrative.textContent).toContain('MyGO!!!!!')
    expect(narrative.textContent).toContain('欢迎来到北美邦')
    const paragraphs = narrative.querySelectorAll('p')
    expect(paragraphs.length).toBe(7)
  })

  it('Contact section has localized mailto link + aria-label (en + zh)', async () => {
    const { container, unmount } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const enLink = container.querySelector(
      '#contact a[href="mailto:contact@bangdream.org"]',
    )
    expect(enLink).not.toBeNull()
    expect(enLink.getAttribute('aria-label')).toBe(
      'Send email to contact at bangdream dot org',
    )
    expect(enLink.textContent).toContain('✉')
    expect(enLink.textContent).toContain('contact@bangdream.org')
    unmount()

    setLanguage('zh')
    const zhResult = renderWithProviders(<About />, { route: '/about' })
    await zhResult.findByText('バンドリ北米華人コミュニティ')
    const zhLink = zhResult.container.querySelector(
      '#contact a[href="mailto:contact@bangdream.org"]',
    )
    expect(zhLink).not.toBeNull()
    expect(zhLink.getAttribute('aria-label')).toBe(
      '发送邮件至 contact at bangdream dot org',
    )
  })

  it('Stats block renders 4 cards', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const stats = container.querySelector('.bf-about-stats')
    expect(stats).not.toBeNull()
    expect(stats.children.length).toBe(4)
  })

  it('Stats wires live members count from fetchMembers().total', async () => {
    vi.mocked(fetchMembers).mockResolvedValue({ items: [], total: 87 })
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await waitFor(() => {
      const cell = container.querySelector('[data-testid="stat-members"] .num')
      expect(cell).not.toBeNull()
      expect(cell.textContent).toBe('87')
    })
    // raw int, no "+" suffix
    expect(
      container.querySelector('[data-testid="stat-members"]').textContent,
    ).not.toContain('+')
  })

  it('Stats wires live event count from fetchEvents({scope:all}).total', async () => {
    vi.mocked(fetchEvents).mockResolvedValue({ items: [], total: 33 })
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await waitFor(() => {
      const cell = container.querySelector('[data-testid="stat-events"] .num')
      expect(cell).not.toBeNull()
      expect(cell.textContent).toBe('33')
    })
    expect(vi.mocked(fetchEvents)).toHaveBeenCalledWith({ scope: 'all' })
    expect(
      container.querySelector('[data-testid="stat-events"]').textContent,
    ).not.toContain('+')
  })

  it('Stats members shows loading skeleton until fetch resolves', async () => {
    let resolveMembers
    vi.mocked(fetchMembers).mockImplementation(
      () => new Promise((r) => { resolveMembers = r }),
    )
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const skeleton = container.querySelector(
      '[data-testid="stat-members"] .num-skeleton',
    )
    expect(skeleton).not.toBeNull()
    resolveMembers({ items: [], total: 11 })
    await waitFor(() => {
      const cell = container.querySelector('[data-testid="stat-members"] .num')
      expect(cell.textContent).toBe('11')
    })
  })

  it('Stats events shows fallback dash on fetch error', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('5xx'))
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await waitFor(() => {
      const fallback = container.querySelector(
        '[data-testid="stat-events"] .num-fallback',
      )
      expect(fallback).not.toBeNull()
      expect(fallback.textContent).toBe('—')
    })
  })

  it('Chapters stat stays hardcoded 9 (no API yet)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const chaptersNum = container.querySelector(
      '[data-testid="stat-chapters"] .num',
    )
    expect(chaptersNum).not.toBeNull()
    expect(chaptersNum.textContent).toBe('9')
  })

  it('Founded stat stays hardcoded 2024', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const founded = container.querySelector(
      '[data-testid="stat-founded"] .num',
    )
    expect(founded).not.toBeNull()
    expect(founded.textContent).toBe('2024')
  })

  it('no leftover Mission / FAQ / Disclaimer sections (EN) — Join restored', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(screen.queryByRole('heading', { level: 2, name: /^mission$/i })).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: /^faq$/i })).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: /^disclaimer$/i })).toBeNull()
    expect(container.querySelector('#mission')).toBeNull()
    expect(container.querySelector('#faq')).toBeNull()
    expect(container.querySelector('#disclaimer')).toBeNull()
  })

  it('no leftover Mission / FAQ / Disclaimer sections (ZH) — Join restored', async () => {
    setLanguage('zh')
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(screen.queryByRole('heading', { level: 2, name: /^使命$/ })).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: /^常见问题$/ })).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: /^免责声明$/ })).toBeNull()
    expect(container.querySelector('#mission')).toBeNull()
    expect(container.querySelector('#faq')).toBeNull()
    expect(container.querySelector('#disclaimer')).toBeNull()
  })

  it('i18n key completeness: all narrative keys exist in en + zh', () => {
    const keys = ['about.helperTag', ...NARRATIVE_BODY_KEYS]
    for (const key of keys) {
      expect(typeof i18n.en[key], `en missing ${key}`).toBe('string')
      expect(i18n.en[key].length, `en empty ${key}`).toBeGreaterThan(0)
      expect(typeof i18n.zh[key], `zh missing ${key}`).toBe('string')
      expect(i18n.zh[key].length, `zh empty ${key}`).toBeGreaterThan(0)
    }
  })

  it('no smart quotes in narrative i18n strings (edge guard)', () => {
    const smartQuoteRe = /[‘’“”]/
    const keys = ['about.helperTag', ...NARRATIVE_BODY_KEYS]
    for (const key of keys) {
      expect(smartQuoteRe.test(i18n.en[key]), `en ${key} has smart quote`).toBe(
        false,
      )
      expect(smartQuoteRe.test(i18n.zh[key]), `zh ${key} has smart quote`).toBe(
        false,
      )
    }
  })

  it('shows LoadingState while site fetch is pending', () => {
    let resolveSite
    vi.mocked(fetchSite).mockImplementation(
      () => new Promise((r) => { resolveSite = r }),
    )
    const { container } = renderWithProviders(<About />, { route: '/about' })
    expect(container.querySelector('.loading-state')).not.toBeNull()
    resolveSite(siteRows())
  })

  it('shows ErrorState with retry on site fetch reject', async () => {
    vi.mocked(fetchSite).mockRejectedValueOnce(new Error('5xx'))
    renderWithProviders(<About />, { route: '/about' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i)
    const retry = screen.getByRole('button', { name: /retry/i })
    vi.mocked(fetchSite).mockResolvedValueOnce(siteRows())
    await userEvent.click(retry)
    await screen.findByText('バンドリ北米華人コミュニティ')
  })

  it('JP/ZH/EN spans carry lang attributes', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(container.querySelector('[lang="ja"]')).not.toBeNull()
    expect(container.querySelector('[lang="zh"]')).not.toBeNull()
    expect(container.querySelector('[lang="en"]')).not.toBeNull()
  })

  it('Join section rendered between Contact and Stats (DOM order)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const narrative = container.querySelector('#story')
    const contact = container.querySelector('#contact')
    const join = container.querySelector('[data-testid="about-join"]')
    const stats = container.querySelector('.about-stats-block')
    expect(narrative).not.toBeNull()
    expect(contact).not.toBeNull()
    expect(join).not.toBeNull()
    expect(stats).not.toBeNull()
    expect(join.id).toBe('join')
    expect(
      contact.compareDocumentPosition(join) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      join.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('Join section renders classic shape: heading + 2 prose paragraphs + single QQ CTA (EN)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const join = container.querySelector('[data-testid="about-join"]')
    expect(join).not.toBeNull()
    const heading = join.querySelector('h2')
    expect(heading.textContent).toBe('Join Us')
    const paragraphs = join.querySelectorAll('p')
    expect(paragraphs.length).toBe(2)
    expect(paragraphs[0].textContent).toContain('QQ group')
    expect(paragraphs[1].textContent).toContain('NA expedition group')
    const anchors = join.querySelectorAll('a')
    expect(anchors.length).toBe(1)
    const cta = anchors[0]
    expect(cta.classList.contains('about-join-cta')).toBe(true)
    expect(cta.getAttribute('href')).toBe(QQ_GROUP_URL)
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(cta.getAttribute('rel')).toMatch(/noopener/)
    expect(cta.getAttribute('rel')).toMatch(/noreferrer/)
    expect(cta.textContent).toBe('Join QQ Group')
  })

  it('Join section renders classic shape ZH: 加入我们 heading + QQ 群 CTA + 北美邦远征组 prose', async () => {
    setLanguage('zh')
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    const join = container.querySelector('[data-testid="about-join"]')
    expect(join.querySelector('h2').textContent).toBe('加入我们')
    const paragraphs = join.querySelectorAll('p')
    expect(paragraphs.length).toBe(2)
    expect(paragraphs[0].textContent).toContain('QQ 群')
    expect(paragraphs[1].textContent).toContain('「北美邦远征组」')
    const cta = join.querySelector('a.about-join-cta')
    expect(cta).not.toBeNull()
    expect(cta.getAttribute('href')).toBe(QQ_GROUP_URL)
    expect(cta.textContent).toBe('加入 QQ 群')
  })

  it('Join section: no 4-tile artifacts left (no .about-join-link, no .about-join-list)', async () => {
    const { container } = renderWithProviders(<About />, { route: '/about' })
    await screen.findByText('バンドリ北米華人コミュニティ')
    expect(container.querySelector('.about-join-link')).toBeNull()
    expect(container.querySelector('.about-join-list')).toBeNull()
    expect(container.querySelector('.about-join-intro')).toBeNull()
    expect(container.querySelector('.ajl-name')).toBeNull()
    expect(container.querySelector('.ajl-desc')).toBeNull()
    expect(container.querySelector('.ajl-arrow')).toBeNull()
  })

  it('Join section: classic i18n keys present + non-empty in both locales; removed tile keys gone', () => {
    const presentKeys = [
      'about.joinHeading',
      'about.joinHelperTag',
      'about.joinBody1',
      'about.joinBody2',
      'btn.joinQQ',
    ]
    for (const key of presentKeys) {
      expect(typeof i18n.en[key], `en missing ${key}`).toBe('string')
      expect(i18n.en[key].length, `en empty ${key}`).toBeGreaterThan(0)
      expect(typeof i18n.zh[key], `zh missing ${key}`).toBe('string')
      expect(i18n.zh[key].length, `zh empty ${key}`).toBeGreaterThan(0)
    }
    const removedKeys = [
      'about.joinIntro',
      'about.join.qqName',
      'about.join.qqDesc',
      'about.join.discordName',
      'about.join.discordDesc',
      'about.join.xName',
      'about.join.xDesc',
      'about.join.emailName',
      'about.join.emailDesc',
    ]
    for (const key of removedKeys) {
      expect(i18n.en[key], `en still has removed key ${key}`).toBeUndefined()
      expect(i18n.zh[key], `zh still has removed key ${key}`).toBeUndefined()
    }
  })
})
