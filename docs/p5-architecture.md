# `bangdream-na` Phase 5 — Architecture Specification (Visual Revamp + IA)

**Status**: Architect deliverable for task #2 in team `bangdream-na-phase5`. Ready for Developer dispatch (task #3) once Designer (task #1) is also complete.

**Scope**: Visual revamp + information-architecture changes inspired by `bang-dream.com`. Adds `/news` and `/about` routes, a `中/EN` UI-language toggle (UI chrome only — never content), a 5-platform `social.json` source of truth, a hero carousel, an events calendar/list view toggle, sidebar filters mirroring the `bang-dream.com` pattern, and a mobile drawer. Layered internally as **P5A** (IA + chrome — lower risk) → **P5B** (rich event/news widgets — riskier), shipped as a single PR with commit-level separation for review clarity.

**What does NOT change**: stack (`react@19`, `vite@8`, `react-router-dom@7`, `vitest@3`), `package.json` dependencies (no new deps), `eslint.config.js`, `vercel.json`, `.gitignore`, `index.html`, `src/main.jsx`, `src/theme/themes.js` / `themeContextValue.js` / `useTheme.js` / `ThemeContext.jsx`, all Phase 1-3 utility libs (`src/lib/events.js`, `src/lib/members.js`). Existing components survive structurally; some get additive props or one-line replacement of date formatting.

**What changes**: Routes table grows. `Navbar`, `Footer`, `Hero`, `EventCard`, `Events page`, `Home page` get edits. `theme.css` gets one new utility class. New: 9 components, 3 lib modules, 4 data files, 2 pages.

---

## 1. Final directory delta

```
src/
├── App.jsx                                      # MOD — new routes + conditional chrome (future-proof for P4 /admin)
├── pages/
│   ├── Home.jsx                                 # MOD — Hero stays; ComingSoonCards → HeroCarousel + 2 stat tiles
│   ├── Home.test.jsx                            # MOD — assertion shift to HeroCarousel/StatTile
│   ├── Events.jsx                               # MOD — sidebar layout + ?view=list|calendar toggle
│   ├── Events.test.jsx                          # MOD — exercise both views
│   ├── News.jsx                                 # NEW
│   ├── News.css                                 # NEW
│   ├── News.test.jsx                            # NEW
│   ├── About.jsx                                # NEW
│   ├── About.css                                # NEW
│   ├── About.test.jsx                           # NEW
│   ├── Members.jsx                              # unchanged (date "since" not displayed yet)
│   └── pages.test.jsx                           # MOD — add /news, /about smoke
├── components/
│   ├── Navbar/                                  # MOD — 5 tabs + LangToggle + drawer trigger
│   ├── Footer/                                  # MOD — 3-column rewrite + social row
│   ├── Hero/                                    # MOD — bilingual heading order; carousel below
│   ├── EventCard/                               # MOD — formatDate(), .card-thumb-16-9
│   ├── HeroCarousel/                            # NEW — rotating top 5 upcoming events
│   │   ├── HeroCarousel.jsx
│   │   ├── HeroCarousel.css
│   │   └── HeroCarousel.test.jsx
│   ├── EventCalendar/                           # NEW — month grid view
│   │   ├── EventCalendar.jsx
│   │   ├── EventCalendar.css
│   │   └── EventCalendar.test.jsx
│   ├── EventSidebar/                            # NEW — multi-dim filter (category + band + date range + keyword)
│   │   ├── EventSidebar.jsx
│   │   ├── EventSidebar.css
│   │   └── EventSidebar.test.jsx
│   ├── NewsCard/                                # NEW
│   │   ├── NewsCard.jsx
│   │   ├── NewsCard.css
│   │   └── NewsCard.test.jsx
│   ├── NewsList/                                # NEW
│   │   ├── NewsList.jsx
│   │   ├── NewsList.css
│   │   └── NewsList.test.jsx
│   ├── NewsSidebar/                             # NEW — mirrors EventSidebar
│   │   ├── NewsSidebar.jsx
│   │   ├── NewsSidebar.css
│   │   └── NewsSidebar.test.jsx
│   ├── PlatformIcon/                            # NEW — 5 SVGs + disabled + QR popover
│   │   ├── PlatformIcon.jsx
│   │   ├── PlatformIcon.css
│   │   └── PlatformIcon.test.jsx
│   ├── LangToggle/                              # NEW — 中/EN persisted to localStorage
│   │   ├── LangToggle.jsx
│   │   ├── LangToggle.css
│   │   └── LangToggle.test.jsx
│   ├── MobileDrawer/                            # NEW — hamburger drawer for nav <540px
│   │   ├── MobileDrawer.jsx
│   │   ├── MobileDrawer.css
│   │   └── MobileDrawer.test.jsx
│   └── (unchanged) DiscordCTA, ThemeSwitcher, ComingSoonCard, EventFilter,
│                   EventList, MemberCard, MemberFilter, MemberGrid, RoleBadge, TypeBadge
├── lib/
│   ├── dateFormat.js + dateFormat.test.js       # NEW — Tier A
│   ├── carousel.js   + carousel.test.js         # NEW — Tier A
│   ├── uiLanguage.js + uiLanguage.test.js       # NEW — Tier A
│   ├── (unchanged) events.js, members.js
├── data/
│   ├── site.json                                # MOD — add communityNameJp
│   ├── news.json                                # NEW — ships []
│   ├── social.json                              # NEW — 5-platform array (Discord enabled)
│   ├── about.json                               # NEW — mission/history/faq/coc/joinInstructions
│   ├── i18n.json                                # NEW — { en: {...}, zh: {...} } chrome only
│   └── (unchanged) events.json, members.json
└── theme/
    └── theme.css                                # MOD — add `.card-thumb-16-9` utility class
```

**Net file count**: 9 new components × 3 files = 27, + 3 lib × 2 = 6, + 4 data, + 2 pages × 3 = 6 ≈ **43 new files**, ~10 modifications.

---

## 2. Routing changes — `src/App.jsx`

### 2.1 Route table

```jsx
<Routes>
  <Route path="/"        element={<Home />} />
  <Route path="/events"  element={<Events />} />   {/* now reads ?view=list|calendar */}
  <Route path="/members" element={<Members />} />
  <Route path="/news"    element={<News />} />     {/* NEW */}
  <Route path="/about"   element={<About />} />    {/* NEW */}
</Routes>
```

No nested routes. No lazy loading (bundle is small; defer code-splitting until P4 admin which has heavier deps).

### 2.2 `?view=list|calendar` parsing

Read in `Events.jsx` via React Router 7's `useSearchParams()` hook (already a transitive of `react-router-dom@^7.13.2` — no new dep).

```jsx
import { useSearchParams } from 'react-router-dom'

function Events() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'calendar' ? 'calendar' : 'list'  // default: list
  const setView = (next) => {
    const sp = new URLSearchParams(searchParams)
    if (next === 'list') sp.delete('view')        // keep URL clean for default
    else sp.set('view', next)
    setSearchParams(sp, { replace: true })        // replace so back button skips view churn
  }
  // ...
}
```

**Edge cases enforced**:
- `?view=foo` (unknown value) → falls back to `'list'`
- `?view=` (empty) → `'list'`
- absence of `view` → `'list'`
- `replace: true` so toggle clicks don't pollute history stack.

### 2.3 Conditional chrome (forward-looking for P4)

Phase 5 still renders `Navbar` + `Footer` for all routes (no `/admin` exists yet). The plan calls out conditional chrome for P4. To avoid an immediate refactor in P4, **introduce the gate now but unconditionally true**:

```jsx
// src/App.jsx
function ChromeFrame({ children }) {
  const { pathname } = useLocation()
  const showChrome = !pathname.startsWith('/admin')   // future P4 gate
  return (
    <>
      {showChrome && <Navbar />}
      {children}
      {showChrome && <Footer communityName={site.communityName} />}
    </>
  )
}
```

This is **optional** for P5A — Developer may choose to defer the wrapper to P4. Document the decision in commit message either way.

---

## 3. New utility modules — `src/lib/`

### 3.1 `dateFormat.js`

```js
/**
 * @param {unknown} iso - ISO 8601 string or any value
 * @param {'en'|'zh'} [_lang='en'] - reserved for future locale-specific behavior;
 *                                   currently format is locale-independent dot form
 * @returns {string} "YYYY.MM.DD" or "" if input is unparseable
 */
export function formatDate(iso, _lang = 'en') { ... }
```

**Format**: `YYYY.MM.DD` regardless of `_lang` (per `bang-dream.com` reference; matches both EN and ZH conventions). Pad month/day to 2 digits.

**Edge cases / test plan** (Tier A — must hit ≥80% per-file):
- valid ISO `"2025-04-30T19:00:00-07:00"` → `"2025.04.30"`
- valid ISO without time `"2025-04-30"` → `"2025.04.30"`
- leap year `"2024-02-29"` → `"2024.02.29"`
- single-digit month/day `"2025-1-5"` → `"2025.01.05"` (zero-pad)
- empty string `""` → `""`
- non-string `null`, `undefined`, `0`, `42`, `{}`, `[]` → `""`
- malformed `"not-a-date"`, `"2025-13-40"`, `"yesterday"` → `""`
- whitespace-only `"   "` → `""`
- ISO with timezone offset producing a different LOCAL day than UTC day → use UTC fields (`getUTCFullYear/Month/Date`) so output is timezone-stable for testing

**Implementation note**: Use `new Date(iso)` to parse, but read fields via `getUTCFullYear()` / `getUTCMonth() + 1` / `getUTCDate()` so tests are deterministic across CI timezones. Document this explicitly at the top of the file — same gotcha bit Phase 2 (`docs/p2-architecture.md` notes Intl tests passed locally but flaked in CI before they were swept).

### 3.2 `carousel.js`

Pure rotation logic — **no React imports**, no DOM, no timers. Tests run with bare vitest, no jsdom dependency.

```js
/**
 * @param {number} currentIndex
 * @param {number} length - total slides
 * @returns {number} next index, wraps around
 */
export function next(currentIndex, length) { ... }

/**
 * @param {number} currentIndex
 * @param {number} length
 * @returns {number} previous index, wraps to length-1 from 0
 */
export function prev(currentIndex, length) { ... }

/**
 * @param {{ paused: boolean, length: number }} state
 * @param {number} lastInteractionTs - epoch ms of last user interaction
 * @param {number} nowTs              - epoch ms (caller-injected for testability)
 * @param {number} [intervalMs=6000]  - auto-advance cadence
 * @returns {boolean}
 */
export function shouldAutoAdvance(state, lastInteractionTs, nowTs, intervalMs = 6000) { ... }
```

**Edge cases / test plan** (Tier A):
- `next(0, 1)` → `0` (single slide; stays put)
- `next(0, 0)` → `0` (empty; never NaN, never out-of-bounds)
- `next(4, 5)` → `0` (wrap)
- `next(-1, 5)` → `0` (negative input clamps before wrap)
- `next(99, 5)` → `0` (out-of-range input wraps via modulo)
- `next(NaN, 5)` → `0` (defensive)
- `prev(0, 5)` → `4` (wrap reverse)
- `prev(0, 1)` → `0` (single slide)
- `shouldAutoAdvance({ paused: true, length: 5 }, t, t, 6000)` → `false`
- `shouldAutoAdvance({ paused: false, length: 0 }, ...)` → `false` (no slides, never advance)
- `shouldAutoAdvance({ paused: false, length: 1 }, ...)` → `false` (only one — pointless)
- `shouldAutoAdvance({ paused: false, length: 3 }, 0, 5999, 6000)` → `false` (just under)
- `shouldAutoAdvance({ paused: false, length: 3 }, 0, 6000, 6000)` → `true` (exactly at)
- `shouldAutoAdvance({ paused: false, length: 3 }, 0, 100000, 6000)` → `true`

**Recommended auto-advance interval**: **6000ms** (6s). Rationale: long enough to read a card title + glance at date, short enough that a 3-card carousel cycles in 18s before the user loses interest. Pause on hover / focus / `prefers-reduced-motion`.

### 3.3 `uiLanguage.js`

```js
/** @typedef {'en'|'zh'} UiLang */

const STORAGE_KEY = 'bangdream-na:uiLanguage'
const VALID = new Set(['en', 'zh'])
const DEFAULT_LANG = 'en'

/** Read current lang. Falls back to 'en' on any error or invalid stored value. */
export function getLanguage(): UiLang
/** Set lang. Persists to localStorage. No-op + console.warn if invalid lang code. Notifies subscribers. */
export function setLanguage(lang: UiLang): void
/** Subscribe to changes. Returns unsubscribe fn. Idempotent — same cb subscribed twice = unsubscribed once. */
export function subscribeLanguage(cb: (lang: UiLang) => void): () => void
```

(Written in JSDoc form to stay TypeScript-free per repo convention. Above is illustrative.)

**Subscriber implementation**: in-module `Set<Function>`. Cross-tab sync via `window.addEventListener('storage', ...)` listener that re-broadcasts when `STORAGE_KEY` changes externally. The listener is registered lazily on first `subscribeLanguage()` call to avoid touching `window` at module-load time (matters for any future SSR — currently N/A but cheap insurance).

**Edge cases / test plan** (Tier A):
- `localStorage` throws (private browsing, quota exceeded, disabled): `getLanguage()` → `'en'`, `setLanguage()` swallows + logs
- Stored value is `"de"` (not in VALID): `getLanguage()` → `'en'`
- Stored value is `null`: `getLanguage()` → `'en'`
- Stored value is `""`: `getLanguage()` → `'en'`
- Stored value is `'{"a":1}'` JSON: `getLanguage()` → `'en'`
- `setLanguage('zh')` then `getLanguage()` → `'zh'`
- `setLanguage('fr')` → no-op, no throw, console.warn called once, stored value unchanged
- `subscribeLanguage(cb)` — `cb` called on every `setLanguage` change (not on no-op)
- Returned unsubscribe fn — after call, `cb` no longer fires
- `storage` event from another tab → subscribers fire with new lang
- `storage` event with bad value → subscribers DO NOT fire (silent ignore)

---

## 4. New data files — `src/data/`

All ship in `src/data/` so vite imports them as static JSON; coverage config excludes `src/data/**` (already excluded — `vite.config.js:24`).

### 4.1 `news.json`

Ships as: `[]`

**Schema** (per item):
```jsonc
{
  "id": "string",                  // required; stable e.g. "2025-04-30-spring-meetup"
  "date": "string",                // required; ISO date "YYYY-MM-DD" or ISO 8601 datetime
  "title": "string",               // required
  "body": "string",                // required; markdown-flavored plain text (no MD parser yet — render as paragraphs split on \n\n)
  "category": "announcement"
              | "event"
              | "community"
              | "release",         // required enum
  "image": "string?"               // optional URL or "/news/<slug>.jpg"
}
```

**Schema validation**: NOT enforced at runtime in P5 (consistent with `events.json` / `members.json` pattern — JSON authored manually or via P4 admin). NewsCard component handles missing fields the same way `EventCard` does today (conditional rendering).

### 4.2 `social.json`

Ships per plan §"Social platforms":
```json
[
  { "platform": "discord",     "label": "Discord",     "url": "https://discord.gg/WfMBKaW8Br", "qrImage": null,                "enabled": true  },
  { "platform": "qq",          "label": "QQ群",         "url": "",                              "qrImage": "/social/qq-qr.png", "enabled": false },
  { "platform": "xiaohongshu", "label": "小红书",       "url": "",                              "qrImage": null,                "enabled": false },
  { "platform": "x",           "label": "X (Twitter)", "url": "",                              "qrImage": null,                "enabled": false },
  { "platform": "wechat",      "label": "微信",         "url": "",                              "qrImage": null,                "enabled": false }
]
```

**Schema**:
```jsonc
{
  "platform": "discord"|"qq"|"xiaohongshu"|"x"|"wechat",  // stable key; component looks up SVG by this
  "label": "string",                                       // display label
  "url": "string",                                         // empty string when not yet configured
  "qrImage": "string|null",                                // path to QR PNG for QR-only platforms (WeChat)
  "enabled": "boolean"                                     // false = greyed pill, "coming soon" tooltip
}
```

**Source of truth rule**: `site.json` MUST NOT contain platform URLs. Anything that referenced `site.discordInvite` for the Discord URL **continues to work** (don't break Phase 1 contract) but Footer reads from `social.json`. Hero `DiscordCTA` continues to read `site.discordInvite` until P4 admin can edit `social.json`. Architectural note: in Phase 6+ we may consolidate by reading `social.json[platform=discord].url` everywhere, but keeping `site.discordInvite` for P5 reduces blast radius.

### 4.3 `about.json`

```json
{
  "mission": "BanG Dream NA is a North-America-based fan community for BanG Dream! and its bands. We organize meetups, share concert info, and welcome new fans.",
  "history": "Founded in 2024 by fans across LA, NYC, SF, Seattle, and Toronto. Started as a Discord group, grew into local cover bands and event meetups.",
  "faq": [
    { "q": "How do I join?", "a": "Click the Discord button anywhere on the site." },
    { "q": "Do I need to speak Japanese?", "a": "No — English, Chinese, and Japanese are all welcome." },
    { "q": "Are there local chapters?", "a": "Informal city groups exist within the Discord. Check the #regions channels." }
  ],
  "coc": "Be respectful. No harassment, no doxxing, no NSFW. English / Chinese / Japanese all welcome. Idol/band-bashing toward other Bushiroad properties not allowed.",
  "joinInstructions": "1. Join Discord. 2. Read the rules. 3. Introduce yourself in #intros. 4. Pick city / oshi / interest roles."
}
```

Authored single-language (English with mixed CJK in COC). LangToggle does NOT translate this content — see §6.

### 4.4 `i18n.json`

Strict scope: **UI chrome only**. ≤30 string keys, EN + ZH. **Header comment in the file is not legal JSON** so we put the documentation in `docs/p5-architecture.md` (this file) AND in a `_meta` key in the JSON itself:

```jsonc
{
  "_meta": {
    "scope": "UI chrome ONLY: nav links, footer headings, empty-state copy, button labels, form field labels. Page CONTENT (events, news bodies, member bios, about page text) is NOT translated — it stays as authored.",
    "owner": "Phase 5 (LangToggle); Phase 4 admin must NOT add page-content keys here."
  },
  "en": {
    "nav.home": "Home",
    "nav.news": "News",
    "nav.events": "Events",
    "nav.members": "Members",
    "nav.about": "About",
    "footer.quickLinks": "Quick Links",
    "footer.communities": "Communities",
    "footer.about": "About & Legal",
    "footer.disclaimer": "Fan community. Not affiliated with Bushiroad or Craft Egg.",
    "empty.events": "No upcoming events. Check back soon.",
    "empty.events.past": "No past events on record.",
    "empty.news": "No news yet.",
    "empty.members": "No members listed yet.",
    "btn.viewAll": "View all",
    "btn.viewList": "List view",
    "btn.viewCalendar": "Calendar view",
    "btn.filter": "Filter",
    "btn.clearFilters": "Clear filters",
    "btn.next": "Next",
    "btn.prev": "Previous",
    "btn.close": "Close",
    "btn.menu": "Menu",
    "btn.joinDiscord": "Join Discord",
    "label.search": "Search",
    "label.category": "Category",
    "label.band": "Band",
    "label.dateRange": "Date range",
    "label.uiLanguage": "UI language",
    "platform.comingSoon": "Coming soon",
    "platform.scanQr": "Scan QR"
  },
  "zh": {
    "nav.home": "首页",
    "nav.news": "新闻",
    "nav.events": "活动",
    "nav.members": "成员",
    "nav.about": "关于",
    "footer.quickLinks": "快速导航",
    "footer.communities": "社群",
    "footer.about": "关于与声明",
    "footer.disclaimer": "粉丝社群，与 Bushiroad、Craft Egg 无关。",
    "empty.events": "暂无即将到来的活动。",
    "empty.events.past": "暂无过往活动记录。",
    "empty.news": "暂无新闻。",
    "empty.members": "暂无成员。",
    "btn.viewAll": "查看全部",
    "btn.viewList": "列表视图",
    "btn.viewCalendar": "日历视图",
    "btn.filter": "筛选",
    "btn.clearFilters": "清除筛选",
    "btn.next": "下一个",
    "btn.prev": "上一个",
    "btn.close": "关闭",
    "btn.menu": "菜单",
    "btn.joinDiscord": "加入 Discord",
    "label.search": "搜索",
    "label.category": "分类",
    "label.band": "乐团",
    "label.dateRange": "时间范围",
    "label.uiLanguage": "界面语言",
    "platform.comingSoon": "敬请期待",
    "platform.scanQr": "扫码"
  }
}
```

**29 keys × 2 languages = 58 entries**. Stays under the ≤30 keys ballpark.

Acceptance: a Designer/Developer may PR additions to this file, but Reviewer rejects any key whose value is page CONTENT (e.g., adding a translated event title key here = NACK).

### 4.5 `site.json` mod — add `communityNameJp`

```jsonc
{
  "discordInvite": "...",
  "communityName": "BanG Dream! Fan Community NA",
  "communityNameZh": "北美炸梦同好会",
  "communityNameJp": "BanG Dream! ファン北米支部",   // NEW — tri-lingual per plan
  "tagline": "..."
}
```

`Hero.jsx` displays per LangToggle (zh selected → ZH first; en selected → EN first; JP appears as small tertiary line below). LangToggle is binary EN/ZH — JP never alone, only as supplementary text.

---

## 5. Key signatures (lib + component contracts)

### 5.1 `dateFormat.js`

```js
export function formatDate(iso: string|null|undefined, lang?: 'en'|'zh'): string
```

### 5.2 `carousel.js`

```js
export function next(currentIndex: number, length: number): number
export function prev(currentIndex: number, length: number): number
export function shouldAutoAdvance(
  state: { paused: boolean, length: number },
  lastInteractionTs: number,
  nowTs: number,
  intervalMs?: number,
): boolean
```

### 5.3 `uiLanguage.js`

```js
export function getLanguage(): 'en'|'zh'
export function setLanguage(lang: 'en'|'zh'): void
export function subscribeLanguage(cb: (lang: 'en'|'zh') => void): () => void
// internal:
export const STORAGE_KEY: 'bangdream-na:uiLanguage'
```

### 5.4 `<HeroCarousel events={EventEntry[]} max={5} intervalMs?={6000} />`

- Reads `events`, calls `groupEventsByTime` from `lib/events.js`, then `sortEventsByDate('asc').slice(0, max)`.
- Renders single visible slide + dot indicators + prev/next buttons.
- Auto-advances using `shouldAutoAdvance` against a `setInterval` (1Hz polling — keeps the timing logic pure, separates side effect from decision).
- Pauses on hover, focus-within, and when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- Empty (`events=[]` or all past) → renders empty state ("No upcoming events. Check back soon.") via `i18n['empty.events']`.

### 5.5 `<EventCalendar events={EventEntry[]} now={Date} />`

- Month grid (Sun-start). Default `now`: `new Date()`. Prev/next month buttons; **no jump-to-year for MVP**.
- Each cell: list of event `<TypeBadge>` chips (max 3, then "+N more") with link `to="/events?view=list&focus=<id>"`.
- Empty month → "No events this month." Use `formatDate` on each cell's event hover/aria.
- **No** week view, no day view, no drag-to-reschedule. Read-only.

### 5.6 `<EventSidebar filterState onChange events />`

- Vertical filter panel: 4 sections — category (= type checkboxes), band (oshi-band tag set; derived from events.json `band` field if present, else hide section), date range (start + end inputs), keyword (debounced 150ms — same pattern as Phase 3 `MemberFilter`).
- `filterState` shape:
  ```js
  { types: Set<string>, bands: Set<string>, from: string|null, to: string|null, keyword: string }
  ```
- Pure prop-driven; `onChange(newState)` produces a new state object (immutability — memory `principles.md` immutability rule).

### 5.7 `<NewsSidebar />`

Same shape as EventSidebar but operating on `news.json` schema (`category` enum + `from`/`to` + `keyword`). No band field.

### 5.8 `<NewsCard news={NewsEntry} />`

Identical layout to `EventCard`: 16:9 thumb (`.card-thumb-16-9`) + meta (date via `formatDate` + category badge) + title + excerpt (first paragraph of `body`). External-link styling reserved for future "read more" link.

### 5.9 `<NewsList news={NewsEntry[]} />`

Pure presentational grid wrapper; mirrors `<EventList>`.

### 5.10 `<PlatformIcon platform={string} url={string} qrImage={string|null} enabled={bool} label={string} />`

- `enabled && url` → `<a href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>` with SVG icon.
- `enabled && qrImage && !url` → `<button>` opens popover with `<img src={qrImage} alt={"QR for " + label} />`. Popover closes on Escape, outside click, or button re-click.
- `!enabled` → `<span className="platform-icon platform-icon--disabled" title={i18n['platform.comingSoon']}>` (non-interactive).
- 5 inline SVGs — keep simple, no external icon library.

### 5.11 `<LangToggle />`

- Two pill buttons "中" / "EN" (label not from i18n, lang chars are universal).
- Reads via `useSyncExternalStore` (React 18+) or `useEffect`+`useState` subscribing to `subscribeLanguage`.
- Click → `setLanguage('zh' or 'en')`.
- ARIA: `<div role="group" aria-label={i18n['label.uiLanguage']}>` + each button has `aria-pressed={lang === 'xx'}`.
- **Tier C** — assertions are role/text/aria, not synthetic line targets.

### 5.12 `<MobileDrawer open onClose>{children}</MobileDrawer>`

- Renders nothing when `open=false`; when true, fixed full-screen overlay below `<540px`. Body scroll-lock on open. Escape closes. Outside-click closes.
- Hamburger button lives in `Navbar` with `aria-expanded` reflecting `open` state.
- Drawer contents: nav links + LangToggle + ThemeSwitcher (the desktop tail moves into the drawer on mobile).

---

## 6. Modified files inventory

| File | Change type | Description |
|---|---|---|
| `src/App.jsx` | additive | +2 routes; ChromeFrame wrapper optional (defer to P4 if Developer prefers) |
| `src/data/site.json` | additive | +`communityNameJp` field |
| `src/components/Navbar/Navbar.jsx` | structural | NAV_LINKS grows to 5; `<LangToggle>` next to `<ThemeSwitcher>`; hamburger button visible <540px wires `<MobileDrawer>` |
| `src/components/Navbar/Navbar.css` | structural | media query <540px hides `.navbar-links` and `.navbar-tail`, shows hamburger; widen container to fit 5 tabs at desktop |
| `src/components/Footer/Footer.jsx` | full rewrite | 3-column: Quick Links / Communities (5 PlatformIcons) / About&Legal. `communityName` prop kept for back-compat; reads `social.json` directly. |
| `src/components/Footer/Footer.css` | full rewrite | grid layout, mobile stacks |
| `src/components/Hero/Hero.jsx` | additive | Order of `communityName` / `communityNameZh` flips with LangToggle (use `getLanguage()` via subscribe). JP line added if `communityNameJp` provided. |
| `src/components/EventCard/EventCard.jsx` | targeted | replace `formatAbsolute(date)` (Intl.DateTimeFormat) with `formatDate(event.date)` from `lib/dateFormat.js` for a uniform `YYYY.MM.DD`. Keep `formatRelative` (the "in 3 days" badge) — it's separate and complementary. Replace inline `event-card__image` with the shared `.card-thumb-16-9` class. |
| `src/components/EventCard/EventCard.css` | targeted | drop the `.event-card__image` aspect-ratio block; defer to `.card-thumb-16-9` |
| `src/pages/Events.jsx` | structural | grid layout: `<EventSidebar>` left + `<EventList>` OR `<EventCalendar>` right. View toggle buttons in page header. Read `?view=` searchParam. **Keep `<EventFilter>` import deletable** — sidebar replaces it; remove if unused after wiring. |
| `src/pages/Events.css` | new (small) | grid: `1fr` mobile (sidebar collapses to drawer/accordion) / `260px 1fr` desktop |
| `src/pages/Home.jsx` | structural | `<Hero>` → `<HeroCarousel events={events} max={5}>` below Hero → 2 stat tiles (member count, upcoming-event count). Drop `<ComingSoonCard>`s. |
| `src/pages/Home.test.jsx` | structural | new assertions: HeroCarousel mounts; stat tiles render computed values; old "Coming Soon" assertion removed |
| `src/theme/theme.css` | additive | `.card-thumb-16-9 { aspect-ratio: 16/9; background-position: center; background-size: cover; ... }` |

Pages tests `pages.test.jsx` add smoke routes for `/news` + `/about`.

---

## 7. Test framework & coverage tier strategy

### 7.1 Framework

**No new deps.** Continue with:
- `vitest@^3.2.4` for runner
- `@testing-library/react@^16.3.0` + `@testing-library/jest-dom` + `@testing-library/user-event` for component tests
- `jsdom@^25.0.1` environment
- `@vitest/coverage-v8` for coverage

`src/test/setup.js` and `src/test/utils.jsx` already exist and will be reused. Add to setup.js:
- `window.matchMedia` mock if not present (HeroCarousel uses `(prefers-reduced-motion: reduce)`)
- `localStorage` is provided by jsdom; no mock needed unless we explicitly throw to test fallback

### 7.2 Coverage tier strategy (per approved plan §"Coverage gate")

Three tiers, enforced by Reviewer per-file audit (config-level threshold stays a global floor, not the per-file gate — `vite.config.js` lacks per-glob thresholds in v8 coverage without major rework, so we lean on Reviewer):

| Tier | What | Files | Target | How verified |
|---|---|---|---|---|
| **A** | Pure logic | `src/lib/dateFormat.js`, `src/lib/carousel.js`, `src/lib/uiLanguage.js` | ≥80% lines/branches/functions/statements | Coverage report; Reviewer reads `coverage/index.html` and confirms each file ≥80% |
| **B** | Components with branching logic | `HeroCarousel`, `EventSidebar`, `EventCalendar`, `NewsSidebar`, `MobileDrawer` | ≥80% branch/function (line/statement may dip if presentational JSX dominates) | Coverage + Reviewer reads each test file and confirms each visible state path is exercised |
| **C** | Presentational | `PlatformIcon`, `NewsCard`, `LangToggle`, `NewsList` | NO synthetic line targets. Tests assert: role/text/aria, not div counts or class names. Reviewer manual audit of test file. | Reviewer reads test file; rejects `expect(container.querySelectorAll('.foo').length).toBe(7)` style |

### 7.3 `vite.config.js` change

Keep existing 80% global thresholds — they remain a floor for the codebase as a whole. **Do not** lower them; the new presentational components add small JSX surface area that still gets exercised by the page-level integration tests in `pages/`.

**Optional refinement** (Developer's call — not required for P5A): exclude pure presentational dirs from coverage entirely so they don't drag the global average:

```js
// vite.config.js (proposed addition — leave commented unless needed)
coverage: {
  // ...existing...
  exclude: [
    ...existing,
    // 'src/components/PlatformIcon/**',  // Tier C — verified by behavior tests
    // 'src/components/NewsCard/**',
  ],
}
```

**Recommended**: leave the exclude list unchanged for P5A; revisit only if Reviewer reports the global average dropped below 80%.

### 7.4 Edge tests checklist (mandatory per memory `feedback_edge_testing_soul.md`)

Each new lib + each Tier B component MUST exercise:

- `dateFormat.js` — see §3.1 (12 cases)
- `carousel.js` — see §3.2 (12 cases)
- `uiLanguage.js` — see §3.3 (11 cases)
- `HeroCarousel` — empty events array, single event, prev/next button, auto-advance pauses on hover, prefers-reduced-motion respected
- `EventSidebar` — empty filters, all-filters set, keyword debounce, clear-all button, malformed event entries don't break filter
- `EventCalendar` — month with zero events, month with multiple-per-day events, prev/next month wraps year boundary correctly, today's cell visually distinct
- `NewsSidebar` — same pattern as EventSidebar minus band
- `MobileDrawer` — Escape closes, outside-click closes, body scroll-lock applied/removed, `aria-expanded` toggle on trigger, focus-trap when open
- `PlatformIcon` (Tier C, behavior only) — enabled+url renders `<a>`, enabled+qrImage renders `<button>` opening popover, !enabled renders disabled chip with tooltip
- `LangToggle` (Tier C) — pressing 中 calls `setLanguage('zh')`; pressing EN calls `setLanguage('en')`; pressed-state ARIA matches current lang

---

## 8. Internal commit ordering (P5A → P5B)

Single PR `feat/phase-5 → main`. Commits land in this order so reviewers can audit P5A before reading P5B.

### P5A — IA + chrome (lower risk)

1. `chore(p5): add tri-lingual community name + scaffold data files`
   - `src/data/site.json` — add `communityNameJp`
   - `src/data/i18n.json` — add (with `_meta` scope note)
   - `src/data/news.json` — add `[]`
   - `src/data/social.json` — add 5-platform array
   - `src/data/about.json` — add mission/history/faq/coc/joinInstructions
2. `feat(lib): add formatDate utility (YYYY.MM.DD, locale-stable)`
   - `src/lib/dateFormat.js` + `dateFormat.test.js`
3. `feat(lib): add uiLanguage get/set/subscribe with localStorage fallback`
   - `src/lib/uiLanguage.js` + `uiLanguage.test.js`
4. `feat(components): add LangToggle 中/EN with ARIA group`
   - `src/components/LangToggle/`
5. `feat(components): add PlatformIcon with enabled/url/qr branches`
   - `src/components/PlatformIcon/`
6. `feat(navbar): add News + About tabs and LangToggle, prep for mobile drawer`
   - `src/components/Navbar/Navbar.{jsx,css}`
7. `feat(footer): rewrite Footer to 3-column with social row from social.json`
   - `src/components/Footer/Footer.{jsx,css}`
8. `feat(pages): add /news route and empty state`
   - `src/pages/News.{jsx,css,test.jsx}`, NewsCard, NewsList
   - `src/App.jsx` route addition
9. `feat(pages): add /about route reading from about.json`
   - `src/pages/About.{jsx,css,test.jsx}`
10. `refactor(eventcard): use formatDate(YYYY.MM.DD) and shared card-thumb-16-9`
    - `src/components/EventCard/EventCard.{jsx,css}`
    - `src/theme/theme.css` add `.card-thumb-16-9`

### P5B — Events upgrade + Home polish (riskier, depends on P5A)

11. `feat(lib): add carousel rotation logic (pure)`
    - `src/lib/carousel.js` + `carousel.test.js`
12. `feat(components): add HeroCarousel with auto-advance + reduced-motion respect`
    - `src/components/HeroCarousel/`
13. `feat(home): replace ComingSoonCards with HeroCarousel + 2 stat tiles`
    - `src/pages/Home.jsx` + test update
14. `feat(components): add EventSidebar multi-dim filter`
    - `src/components/EventSidebar/`
15. `feat(components): add EventCalendar month grid view`
    - `src/components/EventCalendar/`
16. `feat(events): add ?view=list|calendar toggle wiring sidebar + calendar`
    - `src/pages/Events.{jsx,css,test.jsx}` rewrite
17. `feat(components): add NewsSidebar mirroring EventSidebar`
    - `src/components/NewsSidebar/`
    - `src/pages/News.jsx` wires sidebar (replaces empty-state-only render)
18. `feat(components): add MobileDrawer hamburger nav for <540px`
    - `src/components/MobileDrawer/`
    - `src/components/Navbar/Navbar.{jsx,css}` add hamburger trigger
19. `chore(tests): add /news, /about pages.test smoke + integration sweep`

**Each commit must keep the build green** (`npm run build && npm test`). Developer commits in the listed order; if a commit needs to be split further for green-build reasons, that's allowed but must be flagged in the PR description.

---

## 9. Open issues for Developer (Architect recommendations)

| # | Open issue | Architect recommendation |
|---|---|---|
| 1 | HeroCarousel auto-advance interval | **6000ms (6s)**. Pause on hover/focus/reduced-motion. |
| 2 | EventCalendar navigation granularity | Month-by-month only. **No** year jump, **no** week view, **no** day view in MVP. |
| 3 | LangToggle SSR consideration | **Not applicable.** Vite SPA — no SSR. Defer if/when SSR ever lands. |
| 4 | LangToggle initial paint flash | Read `localStorage` synchronously on first render via `useState(getLanguage)`. No flash. Acceptable cost: 1 sync localStorage read on mount. |
| 5 | LangToggle EN vs ZH on Hero name order | EN selected → English first, Chinese subtitle smaller; ZH selected → Chinese first, English subtitle smaller. JP always tertiary. Default = ZH (per plan §"User-confirmed defaults" #1: "Chinese-first"). |
| 6 | EventSidebar `band` field | If `events.json` entries don't have a `band` field, hide the band section entirely. Don't ship a section that's always empty. |
| 7 | HeroCarousel when 0 upcoming events | Render empty-state card with `i18n['empty.events']` + Discord CTA. Don't hide the carousel entirely (visual hierarchy collapses). |
| 8 | Mobile drawer focus-trap | Use a small inline focus-trap (track first/last focusable + cycle on Tab/Shift+Tab) — no new dep. ~30 LoC. Tests assert focus stays within drawer. |
| 9 | `social.json` and `site.discordInvite` duplication | **Keep both** for P5. `Hero/DiscordCTA` reads `site.discordInvite`; `Footer` reads `social.json`. Reconcile in P4 admin (admin edits both atomically) or P6 cleanup. |
| 10 | Stat tile values on Home (member count, upcoming events) | Compute at render: `members.length` and `groupEventsByTime(events).upcoming.length`. Static — no live API. |
| 11 | Calendar view default | **List**. Calendar opt-in via toggle. Per plan §"User-confirmed defaults" #2. |
| 12 | Bilingual Hero — should `LangToggle` swap content text? | **No.** UI chrome only. Hero `tagline` stays English (or whatever the author wrote in `site.json`). Plan §"Naming clarification" + memory `feedback_behavior_not_mode.md` informs: don't introduce a "translate everything" behavior under the LangToggle banner. |
| 13 | `i18n.json` consumption pattern | Recommend a tiny helper (no new dep): `function t(key) { const lang = getLanguage(); return i18n[lang]?.[key] ?? i18n.en[key] ?? key }`. Place in `src/lib/uiLanguage.js` as `export function t(key)`. Add tests. |
| 14 | `useSyncExternalStore` vs `useState`+`useEffect` for LangToggle | Either is fine. Recommend `useSyncExternalStore` (React 18+ idiom; tree-shakable; correct re-render semantics). |
| 15 | Testing `localStorage` errors | In a test, monkey-patch `Storage.prototype.getItem` / `setItem` to throw, then verify fallback. Restore in `afterEach`. |
| 16 | `prefers-reduced-motion` mock | Jsdom doesn't implement matchMedia; mock in `src/test/setup.js`: `window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: ()=>{}, removeEventListener: ()=>{} })`. Tests that need `matches: true` override per-test. |
| 17 | EventSidebar keyword debounce | Reuse Phase 3 `MemberFilter` debounce pattern (150ms `useEffect` + setTimeout). No new dep. |
| 18 | NewsCard image fallback | Same pattern as EventCard — gradient placeholder via `.card-thumb-16-9` background-color when `image` missing. |
| 19 | About page rendering of `body` paragraphs | Split `body`-style strings on `\n\n`, render each as `<p>`. **No** Markdown parser in P5 (no new dep). If/when needed, P6 can add `marked` or `micromark`. |
| 20 | Coverage config: presentational excludes | **Don't** add to `exclude` in `vite.config.js` for P5A. Revisit after Reviewer reports global coverage. |

---

## 10. Acceptance gate (Architect → Developer)

Developer is unblocked when:

- [x] This document exists at `docs/p5-architecture.md`
- [x] Designer's `docs/p5-design.md` exists (parallel task #1) — visual specifics, color tokens, spacing, exact icon SVGs
- [x] Both have been read by Developer before any code is written
- [x] No new npm deps. If Developer believes a dep is needed, escalate to team-lead before installing.
- [x] Each commit in the P5A → P5B order leaves build + tests green
- [x] Edge tests per §7.4 are non-negotiable (memory soul rule)
- [x] PR body separates P5A and P5B sections for Reviewer audit clarity

---

## 11. Cross-references

- Approved plan: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md`
- Phase 1 architecture (stack, vitest config, coverage pattern): `docs/architecture.md`
- Phase 2 architecture (events lib, EventCard pattern): `docs/p2-architecture.md`
- Phase 3 architecture (members lib, filter debounce, RoleBadge separation pattern): `docs/p3-architecture.md`
- React Router 7 `useSearchParams`: locked in package.json `react-router-dom@^7.13.2`
- `React 19` `useSyncExternalStore`: stable; no extra dep
- Memory rules applied: `feedback_edge_testing_soul.md` (edge tests), `feedback_behavior_not_mode.md` (LangToggle is UI chrome integration, not "translate everything mode"), `feedback_no_smart_quotes.md` (avoid smart quotes in code), `principles.md` immutability (filterState always returns new objects)
