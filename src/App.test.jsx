import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'
const site = {
  discordInvite: 'https://discord.gg/WfMBKaW8Br',
  communityName: 'BanG Dream North America Chinese Community',
  communityNameZh: '北美炸梦同好会',
  communityNameJp: 'バンドリ北米華人コミュニティ',
}
const aboutJson = {
  mission: '北美炸梦同好会 / バンドリ北米華人コミュニティ — 北美华人 BanG Dream! 粉丝社群。',
  faq: [
    { q: '怎么加入？', a: '点击下方「加入 QQ 群」按钮直接进群即可。' },
    { q: '需要会中文或日语吗？', a: '中文为主，英文 / 日文也都欢迎。' },
  ],
  coc: '① 禁止恶意攻击作品相关声优、角色、团体。',
  joinInstructions: '加入我们就直接加 QQ 群即可。',
}
const socialJson = [
  { platform: 'discord', label: 'Discord', url: 'https://discord.gg/WfMBKaW8Br', enabled: true },
  { platform: 'qq', label: 'QQ群', url: 'https://qm.qq.com/q/Dir9OC5TYA', enabled: true },
  { platform: 'xiaohongshu', label: 'Xiaohongshu', url: 'https://xhslink.com/m/1s9XmQRoAug', enabled: true },
  { platform: 'x', label: 'X', url: 'https://x.com/BandoriNACC', enabled: true },
  { platform: 'wechat', label: '微信', url: '', enabled: false },
  { platform: 'forum', label: 'Forum', url: 'https://forum.bangdream.org', enabled: true },
]
import { _resetForTests, setLanguage } from './lib/uiLanguage.js'
import * as api from './lib/api.js'

function siteRowsFromFixture() {
  const items = []
  for (const [k, v] of Object.entries(site)) {
    if (typeof v !== 'string' || v.length === 0) continue
    items.push({ key: `site.${k}`, value: v })
  }
  return { items }
}

function aboutRowsFromFixture() {
  const items = [
    { id: 1, slug: 'mission', title_zh: '使命', body_md: aboutJson.mission, sort_order: 0 },
    {
      id: 2,
      slug: 'joinInstructions',
      title_zh: '加入',
      body_md: aboutJson.joinInstructions,
      sort_order: 10,
    },
    { id: 3, slug: 'coc', title_zh: '群规', body_md: aboutJson.coc, sort_order: 20 },
    { id: 4, slug: 'faq', title_zh: 'FAQ', body_md: JSON.stringify(aboutJson.faq), sort_order: 30 },
  ]
  return { items }
}

function socialRowsFromFixture() {
  const items = socialJson
    .filter((s) => s.enabled)
    .map((s, i) => ({
      id: i + 1,
      platform: s.platform,
      label_zh: s.label,
      url: s.url,
      icon: null,
      sort_order: i,
      active: 1,
    }))
  return { items, total: items.length }
}

describe('<App />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
    window.history.replaceState(null, '', '/')
    vi.spyOn(api, 'fetchMe').mockResolvedValue(null)
    vi.spyOn(api, 'fetchNews').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchEvents').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchMembers').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchPosts').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'fetchSocial').mockResolvedValue(socialRowsFromFixture())
    vi.spyOn(api, 'fetchSite').mockResolvedValue(siteRowsFromFixture())
    vi.spyOn(api, 'fetchAbout').mockResolvedValue(aboutRowsFromFixture())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders LayoutShell (utility + masthead + nav + footer) + Home at "/"', async () => {
    const { container } = render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    // wait for masthead logo with the brand wordmark to appear (proves shell mounted)
    await waitFor(() => {
      expect(container.querySelector('.bf-logo')).toBeInTheDocument()
    })
    // shell pieces all present
    expect(container.querySelector('.bf-utility')).toBeInTheDocument()
    expect(container.querySelector('.bf-mast')).toBeInTheDocument()
    expect(container.querySelector('.bf-nav')).toBeInTheDocument()
    expect(container.querySelector('.bf-foot')).toBeInTheDocument()
    // primary nav has aria-label
    expect(
      screen.getByRole('navigation', { name: /主导航/ }),
    ).toBeInTheDocument()
    // footer disclaimer (CN, hardcoded per Designer §4)
    expect(container.textContent).toMatch(/与株式会社 Bushiroad/)
  })

  // HIGH-1 regression guard (PR #111 reviewer): the body background rule that
  // wins the cascade on public routes MUST read --bg (paper #f3f1ec), NOT
  // theme.css's legacy --color-bg (navy #0f0f19). jsdom's getComputedStyle
  // can't substitute CSS vars, so we walk document.styleSheets ourselves:
  // collect every body-matching `background` rule, take the last one in
  // document order (cascade tiebreak when specificity is equal), and assert
  // its value points at --bg.
  //
  // D7 dark-mode work that re-orders these stylesheets MUST keep this test
  // green — flipping order back would silently re-regress the visual.
  it('REGRESSION HIGH-1: winning body background rule reads var(--bg), not var(--color-bg)', async () => {
    await import('./index.css')
    await import('./theme/theme.css')
    await import('./theme/tokens.css')

    function bodyBgRules() {
      const out = []
      for (const sheet of document.styleSheets) {
        let rules
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        if (!rules) continue
        for (const rule of rules) {
          if (!rule.selectorText) continue
          // match `body`, `html body`, etc. — tokens.css uses html body to win
          // specificity ties; theme.css uses bare `body`.
          if (!/(^|,\s*)(html\s+)?body(\s|$|,)/.test(rule.selectorText)) continue
          const bg = rule.style?.background || rule.style?.backgroundColor
          if (bg && bg.length > 0) out.push({ selector: rule.selectorText, bg })
        }
      }
      return out
    }

    const rules = bodyBgRules()
    expect(rules.length).toBeGreaterThan(0)
    // Higher specificity wins regardless of order. `html body` (0,0,2) beats
    // `body` (0,0,1). Find the highest-specificity match.
    const htmlBody = rules.find((r) => /html\s+body/.test(r.selector))
    expect(htmlBody).toBeDefined()
    expect(htmlBody.bg).toMatch(/var\(--bg\)/)
    expect(htmlBody.bg).not.toMatch(/var\(--color-bg\)/)
  })

  it('renders Events page when initial pathname is /events', async () => {
    window.history.replaceState(null, '', '/events')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }),
    ).toBeInTheDocument()
  })

  it('renders Members page when initial pathname is /members', async () => {
    window.history.replaceState(null, '', '/members')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Members' }),
    ).toBeInTheDocument()
  })

  it('renders News page when initial pathname is /news', async () => {
    window.history.replaceState(null, '', '/news')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: /news|新闻/i }),
    ).toBeInTheDocument()
  })

  it('renders About page when initial pathname is /about', async () => {
    window.history.replaceState(null, '', '/about')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    // About page <h1> still renders the community name; LayoutShell wraps it.
    expect(
      await screen.findByRole('heading', { level: 1, name: site.communityNameZh }),
    ).toBeInTheDocument()
  })

  it('renders Admin without public Navbar/Footer when pathname is /admin', async () => {
    window.history.replaceState(null, '', '/admin')
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    // Admin OAuth login is shown after fetchMe resolves null
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /使用 GitHub 登录/ })).toBeInTheDocument(),
    )
    // Public LayoutShell (utility bar + masthead + primary nav + footer) is NOT
    // in DOM on /admin — admin routes bypass the shell per App.jsx isAdmin gate.
    expect(document.body.querySelector('.bf-utility')).toBeNull()
    expect(document.body.querySelector('.bf-mast')).toBeNull()
    expect(document.body.querySelector('.bf-nav')).toBeNull()
    expect(document.body.querySelector('.bf-foot')).toBeNull()
  })
})
