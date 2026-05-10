# Feature: D1 — Foundation + Home

## Product Context

Sub-PR D1 of 7 for the bangdream-na Claude Design redesign. D1 is the **merge blocker**: it establishes the design token system, global layout shell, and rewrites the Home page. All other sub-PRs (D2–D7) depend on D1 having merged to `main` first.

The target visual language is a Wiki/IMDB-density site with a paper/beige palette, Futura BQ type stack, dark header shell, and high-information-density layouts — as established in the Bandori.fans design prototype and ratified by the user across the Claude Design chat session (`chats/chat1.md`, final state).

## User Stories

- As a visitor I want to see a hero section with the latest community report and next upcoming event so I can immediately catch up on what's happening.
- As a visitor I want to see 4 news cards below the hero so I can browse recent reports without going to the news page.
- As a visitor I want to see the upcoming events table so I can decide whether to attend.
- As a visitor I want to see recent photo albums so I can relive past events.
- As a visitor I want to see the Join Community section so I can find the QQ group and social links.
- As a mobile user I want the nav to horizontally scroll with a fade-mask, and the utility bar to collapse to status + language only.
- As a developer I want all design tokens in one file so that D2–D7 can import without duplication.

## Acceptance Criteria

### Design Tokens (`src/theme/tokens.css`)
- [ ] File `src/theme/tokens.css` exists and defines ALL of the following CSS custom properties on `:root`:
  - `--bg: #f3f1ec`, `--bg-2: #ebe8e0`, `--bg-3: #e3dfd4`, `--paper: #fbfaf6`
  - `--ink: #1f1d1a`, `--ink-2: #45413b`, `--ink-3: #7a7569`, `--ink-4: #a8a294`
  - `--rule: #d8d3c5`, `--rule-2: #c5beac`
  - `--accent: #1f1d1a`, `--accent-soft: rgba(31,29,26,0.08)`, `--accent-ink: #ffffff`
  - `--shadow-card: 0 1px 0 rgba(0,0,0,0.04)`
  - `--display`: `"Futura BQ","Futura PT","Futura","Avenir Next","Noto Sans SC",ui-sans-serif,system-ui,sans-serif`
  - `--sans`: same stack with `"PingFang SC","HarmonyOS Sans SC"` inserted before system fallbacks
  - `--mono`: `"JetBrains Mono","Roboto Mono",ui-monospace,SFMono-Regular,Menlo,monospace`
- [ ] `[data-theme="dark"]` block with dark-mode overrides as in prototype `styles.css` lines 26–37
- [ ] Google Fonts import (Noto Sans SC + JetBrains Mono) is in `index.html` or injected via `index.css`; Futura BQ loads via system fallback only (no webfont file needed)
- [ ] `src/theme/tokens.css` is imported ONCE, in `src/index.css` or equivalent global entry; NOT duplicated per-component

### Band Data (`src/data/bands.js`)
- [ ] File exports a `BANDS` array of 10 entries: `all` + 9 named bands exactly matching design prototype `data.jsx` lines 3–13 (id, name, jp, romaji, color, ink, accent fields)
- [ ] BandSwitcher is REMOVED — `BANDS` data is available for color lookups but the switcher UI is not rendered anywhere in D1

### Layout Shell (`LayoutShell` component)
- [ ] A new component wraps all public routes via `App.jsx` — replaces the current `Navbar` + `Footer` import pattern
- [ ] Shell renders in order: `<UtilityBar>` → `<Masthead>` → `<PrimaryNav>` → `{children}` → `<Footer>`
- [ ] Admin routes (`/admin/*`) skip the shell (preserved from current `App.jsx` logic)
- [ ] Shell does NOT render `BandSwitcher` anywhere

### UtilityBar component (`src/components/UtilityBar/`)
- [ ] Dark bar (`background: var(--ink)`, `color: #d9d5c8`, mono font, 28px height)
- [ ] Left: green pulse dot + "在线" + "非官方 / 非营利 / fan-run since 2024"
- [ ] Right: language selector — active label "简体" in white, inactive "日本語" / "EN" in muted; wires to existing `uiLanguage.js` / `LangToggle` logic (do NOT add new i18n keys unless a NEW label is introduced)
- [ ] Mobile (`≤700px`): hide "非官方…" and the "更新于" / member-count spans; keep pulse + "在线" + language toggle
- [ ] Mobile (`≤480px`): hide entire search row from Masthead (handled in Masthead)

### Masthead component (`src/components/Masthead/`)
- [ ] Paper background, 22px top / 16px bottom padding, bottom border `var(--rule)`
- [ ] 3-column grid: logo | description | search; collapses to 1-column on mobile
- [ ] **Logo lockup** (exact structure):
  - Wide-tracked tag: `F A N   C O M M U N I T Y` (mono, 11px, 0.42em letter-spacing)
  - CN wordmark: `北美炸梦` (color: `var(--ink)`) + `同好会` (same style), 38px, weight 900, Noto Sans SC
  - Bottom strip (mono, 10px): `BanG Dream! 北米華人コミュニティ` / `EST. 2024`
- [ ] Description column (desktop only): `// 关于` tag + 2-line CN description text (hardcoded — pulled from design `components.jsx` lines 49–51)
- [ ] Search bar: input + `⌘ K` kbd badge + 搜索 button; on `≤480px` entire search is `display:none`
- [ ] No i18n keys needed for logo/description (hardcoded CN)

### PrimaryNav component (`src/components/PrimaryNav/`)
- [ ] Sticky (`top:0; z-index:30`), paper background, 42px height, bottom border
- [ ] Links (in order, matching `SECONDARY_NAV` from design): 首页/TOP, 新闻/NEWS, 活动/EVENTS, 相册/GALLERY, 出票公告/TICKETS, 现地攻略/GUIDES, 成员/MEMBERS, 关于/ABOUT, 群规/RULES, 论坛/FORUM
- [ ] Each link: CN label (main, 12.5px weight 600) + EN label (mono, 10px, muted; desktop only via `.bf-hide-mobile`)
- [ ] Active link: `var(--accent)` 2px bottom border indicator
- [ ] Right side (desktop): "加入 QQ 群 ↗ · Discord ↗ · X @BandoriNACC ↗" in mono 10.5px muted
- [ ] Mobile: horizontal scroll, fade-mask right edge, hide 群规 and 论坛 links, no misc bar
- [ ] Nav links: 首页 → `/`, 新闻 → `/news`, 活动 → `/events`, 相册 → `/gallery`, 出票公告 → `/tickets` (if route exists, else `#`), 现地攻略 → `/guide` or `#`, 成员 → `/members`, 关于 → `/about`, 群规 → `/rules`, 论坛 → `#`

### Footer component (`src/components/Footer/`)
- [ ] Full rewrite matching design `components.jsx` Footer
- [ ] Dark background (`var(--ink)`), 4-column grid collapsing to 2-col at 800px
- [ ] Col 1: "北美炸梦同好会" wordmark (display, 26px) + disclaimer (mono, 10.5px, muted)
- [ ] Col 2–4: Social / 资讯 / 外链 lists (links matching design, with real routes where possible)
- [ ] Bottom bar: `© 2024–2026 北美炸梦同好会 / fan-run · 非营利 · 非官方` | `build [date] · 150+ 同好 · 9 分会 · since 2024`

### SectionTitle component (`src/components/SectionTitle/`)
- [ ] Reusable: accepts `cn` (required), `jp` (required), `more` (optional label, default "查看全部 →"), `href` (optional, default "#")
- [ ] Layout: flex row, baseline-aligned, space-between; bottom border `var(--ink)` 1px; `cn` in display 22px weight 700; `jp` in mono 11px, `var(--ink-3)`
- [ ] Mobile: `st-more` font-size 10px; `st-jp` drops to block below title

### Home page (`src/pages/Home.jsx` — FULL REWRITE)
- [ ] Single responsive component (no Mobile/Desktop split); deletes all split files (see Deletion List)
- [ ] Fetches from worker API on mount; shows `<LoadingState>` while pending, `<ErrorState>` with retry on failure

**Data fetching:**
- `GET /api/news?limit=5` → hero uses `items[0]`, cards use `items[1..4]`
- `GET /api/events?scope=upcoming&limit=4` → hero uses `items[0]` for NEXT EVENT, table shows all returned
- `GET /api/gallery?limit=6` → album grid

**Hero section (`.bf-home-hero`):**
- Feature card (left, 1.55fr): links to `/news/{items[0].slug}`
  - Background: `linear-gradient(135deg, <band-color> 0%, <band-accent> 100%)` derived from `band_theme` field — look up `BANDS.find(b => b.id === news[0].band_theme)` or fall back to `all` (ink/black)
  - Tag: `// 最新现地报告 · LATEST REPORT`
  - Date: `news[0].published_at` formatted as `YYYY.MM.DD` (Unix timestamp → Date)
  - Title: `news[0].title_zh`
  - Excerpt: `news[0].body_md` truncated to 160 chars (strip markdown)
  - CTA: `阅读全文 →`
- Side panel (right, 1fr):
  - NEXT EVENT card (`.bf-hh-next`): links to `/events/{events[0].slug}` (PR #110 fix — MUST use slug, not id)
    - Tag: `// 即将到来 · NEXT EVENT`
    - Date: `events[0].start_at` formatted as `YYYY.MM.DD` (Unix timestamp)
    - "Days out" badge: computed from `events[0].start_at` minus current Date — e.g. "5天后"
    - Title: `events[0].title_zh`
    - Meta grid: 城市 → `events[0].city ?? '—'`, 会场 → `events[0].venue ?? '—'`
    - Border-left color: `BANDS.find(b => b.id === events[0].band_theme)?.color ?? var(--ink)`
  - Stats row (`.bf-hh-stats`, 3 columns):
    - `150+` / `同好` (hardcoded — member count not exposed in public API)
    - `9` / `分会` (hardcoded)
    - `EVENTS_TOTAL` / `活动` where `EVENTS_TOTAL = upcomingEvents.total + pastEventsTotal`; since `/api/events?scope=upcoming` returns `{ items, total }`, use the `total` field from upcoming response + a second `GET /api/events?scope=past&limit=1` to read `total` only — or fetch both in parallel and sum. If either fails, render `—`

**最新现地报告 section (`.bf-section.bf-section--paper`):**
- `SectionTitle` with `cn="最新现地报告"` `jp="LATEST REPORTS"` `more="全部新闻 →"` `href="/news"`
- Grid of 4 `bf-news-card` items from `news[1..4]`; if fewer than 4 available, render what exists (no blank placeholders)
- Each card: thumbnail div with band gradient (from `band_theme`), nc-tag (from `category` field), date, title, excerpt (truncate 120 chars)
- Card links to `/news/{item.slug}`

**近期活动 section (`.bf-section`):**
- `SectionTitle` with `cn="近期活动"` `jp="UPCOMING EVENTS"` `more="全部活动 →"` `href="/events"`
- `bf-tbl` with columns: 日期 | 距今 | 活动 | 城市 (desktop) | 购票 button
- Date: `start_at` formatted `YYYY.MM.DD`; 距今: computed badge
- Event title: `title_zh`, links to `/events/{slug}`
- Sub-text: `description_md` first 80 chars (strip markdown)
- 城市: `city ?? '—'`
- 购票: render `<a class="td-buy" href="{ticket_url}">购票 →</a>` only when `ticket_url` is non-null; otherwise empty cell
- Mobile: table renders as stacked cards (`.bf-tbl` responsive CSS pattern from prototype)

**近期相册 section (`.bf-section.bf-section--paper`):**
- `SectionTitle` with `cn="近期相册"` `jp="GALLERY"` `more="全部相册 →"` `href="/gallery"`
- `bf-album-grid` 3-col → 2 → 1 grid, up to 6 items from `/api/gallery`
- Each album: `al-thumb` (colored div using `band_theme` via BANDS or fallback grey), `al-count` (not available from API — omit or show caption), `al-d` (format `taken_at` or `created_at`), `al-title` (`caption ?? event_title_zh ?? 'Photo'`), `al-band` (from `band_theme` → BANDS romaji, or omit)
- Album card links to `/gallery` (no individual album page in D1)

**加入社群 section (`.bf-section.bf-section--dark`):**
- `SectionTitle` with `cn="加入社群"` `jp="JOIN THE COMMUNITY"` `more="关于我们 →"` `href="/about"`
- `bf-join` grid: QQ 群 main card (left) + community links list (right)
- QQ card: tag "主要入口", title "QQ 群", sub "中文同好主社群 · 远征 / 出票 / 现地", CTA "加入 QQ 群 →"; `href="#"` (no real link available yet)
- Community links: hardcoded from design `data.jsx` `COMMUNITY_LINKS` (Discord, 小红书, X, 论坛) — NOT from `/api/social` in D1 (that's a D6/D7 concern); `href="#"` for all

### i18n keys
New UI labels introduced in D1 that need i18n keys (add to `src/data/i18n.json` under both `en` and `zh`):
- `home.hero.latestReport`: `// 最新现地报告 · LATEST REPORT` / `// 最新现地报告 · LATEST REPORT` (same for zh — it's already bilingual)
- `home.hero.nextEvent`: `// 即将到来 · NEXT EVENT`
- `home.hero.readFull`: `阅读全文 →` / `Read More →`
- `home.stats.members`: `同好` / `Members`
- `home.stats.chapters`: `分会` / `Chapters`
- `home.stats.events`: `活动` / `Events`
- `home.news.sectionCn`: `最新现地报告`
- `home.events.sectionCn`: `近期活动`
- `home.gallery.sectionCn`: `近期相册`
- `home.join.sectionCn`: `加入社群`
- `home.join.qqTag`: `主要入口`
- `home.join.qqSub`: `中文同好主社群 · 远征 / 出票 / 现地`
- `home.join.qqCta`: `加入 QQ 群 →` / `Join QQ Group →`

### Deletion List (Developer must delete these files)
Before or after creating new components (do NOT leave stubs):
- `src/pages/Home.desktop.jsx`
- `src/pages/Home.desktop.css`
- `src/pages/Home.desktop.test.jsx`
- `src/pages/Home.mobile.jsx`
- `src/pages/Home.mobile.css`
- `src/pages/Home.mobile.test.jsx`
- `src/pages/Home.test.jsx` (will be replaced by new test)

Do NOT delete: `src/pages/Home.jsx` — rewrite in-place.

## Scope

**Included:**
- `src/theme/tokens.css` (new file)
- `src/data/bands.js` (new file)
- `src/components/UtilityBar/` (new)
- `src/components/Masthead/` (new)
- `src/components/PrimaryNav/` (replaces `Navbar`)
- `src/components/SectionTitle/` (new)
- `src/components/Footer/` (rewrite)
- `src/pages/Home.jsx` (rewrite)
- `src/pages/Home.css` (new or rewrite)
- `src/pages/Home.test.jsx` (new test)
- `App.jsx` updated to use `LayoutShell`
- `src/data/i18n.json` updated with Home-specific keys above
- Deletion of 7 stale split files

**Excluded from D1 (belongs to D2–D7):**
- News, Events, Gallery, Members, About, Rules subpage redesigns
- EventDetail, NewsDetail page changes
- Admin pages
- `/api/social` integration (hardcoded links in D1)
- Members count from live API (hardcoded 150+)
- Futura BQ webfont file (system fallback only)
- Band-theme color switching (accent CSS var changes dynamically — out of scope; static `--accent: #1f1d1a` default only)

## API Field Map (verified against `worker/src/utils/row-mappers.ts`)

**`/api/news` item fields used in Home:**
| Design field | Worker field | Notes |
|---|---|---|
| title | `title_zh` | Use `title_en` as fallback if lang=EN |
| date | `published_at` | Unix timestamp (seconds); format as `YYYY.MM.DD` |
| excerpt | `body_md` | Truncate to 160 chars; strip markdown |
| band color | `band_theme` | nullable; look up in `BANDS` by id; fallback `all` |
| link | `slug` | `/news/{slug}` |
| category tag | `category` | raw slug from categories table |

**`/api/events?scope=upcoming` item fields used in Home:**
| Design field | Worker field | Notes |
|---|---|---|
| title | `title_zh` | Use `title_en` as fallback if lang=EN |
| date | `start_at` | Unix timestamp; format as `YYYY.MM.DD` |
| days out | computed | `Math.ceil((start_at - Date.now()/1000) / 86400)` + "天后" |
| venue | `venue` | nullable → `'—'` |
| city | `city` | nullable → `'—'` |
| ticket link | `ticket_url` | nullable; render buy button only when non-null |
| band color | `band_theme` | nullable; look up in BANDS |
| event link | `slug` | `/events/{slug}` (PR #110 requirement) |
| total count | `total` | top-level field in `{ items, total }` response |

**`/api/gallery` item fields used in Home:**
| Design field | Worker field | Notes |
|---|---|---|
| image | `image_url` | string |
| date | `taken_at` | nullable Unix timestamp; fallback `created_at` |
| caption/title | `caption` | nullable; fallback `event_title_zh`; fallback `'Photo'` |
| event link | `event_slug` | nullable; album links to `/gallery` in D1 |
| band | `band_theme` | NOT available in gallery — use accent or event color if event_slug matches |

> **FIELD MAP SURPRISE:** Gallery items have NO `band_theme` field. The design prototype used band-colored gradients on album thumbnails. In D1, use a fixed dark gradient (`var(--ink)` → `var(--ink-2)`) for all gallery thumbnails, or optionally derive color from `event_slug` by matching against a band lookup (complex — recommended: fixed fallback in D1, defer per-band gallery colors to D4).

> **SECOND SURPRISE:** News `category` is a raw slug string (e.g. `"event"`, `"announcement"`), not a display label. The design showed tag labels like `EVENT`, `ANNOUNCEMENT`. Developer must uppercase-map or keep raw with `text-transform: uppercase`.

## Edge Cases to Test (8 mandatory)

1. **Empty news API**: `GET /api/news` returns `{ items: [], total: 0 }` → Hero feature card shows a placeholder state (no crash); news cards section renders empty grid, not blank white space
2. **Empty events API**: `GET /api/events?scope=upcoming` returns `{ items: [], total: 0 }` → NEXT EVENT card shows "暂无即将到来的活动" placeholder; stats events count shows `0`
3. **Null `venue`/`city` in event**: `events[0].venue = null`, `events[0].city = null` → renders `—` in both places; no JS error
4. **Null `ticket_url`**: event row with `ticket_url: null` → no 购票 button renders; row does not shift layout
5. **Null `band_theme`**: news item and event with `band_theme: null` → fallback to `BANDS.find(b => b.id === 'all')` (black/ink); gradient and border still render
6. **Long title overflow**: `title_zh` = 60+ chars in hero feature card → title wraps correctly at 38px (design spec `hhf-title`); no horizontal overflow on 375px viewport
7. **Tap NEXT EVENT → /events/{slug}**: with a real event slug → navigates to `/events/roselia-anime-expo-2026` (React Router `<Link to>` not `<a href>`); tests verify the rendered `href` attribute matches slug pattern (PR #110 fix)
8. **Mobile nav overflow**: on 375px viewport, PrimaryNav renders with `overflow-x: auto` and right fade-mask; 群规 and 论坛 links are `display:none`; remaining links are all reachable by horizontal scroll

## Open Questions for Architect/Developer

1. Should `LayoutShell` be a new component file, or achieved by editing `App.jsx` inline? Recommendation: new `src/components/LayoutShell/LayoutShell.jsx` to keep `App.jsx` clean.
2. The existing `Navbar` component will be superseded by `PrimaryNav`. Delete `src/components/Navbar/` or keep as dead code? Recommendation: delete after verifying no other consumer.
3. The existing `Footer` component is at `src/components/Footer/`. Rewrite in-place or new file? Recommendation: rewrite in-place to avoid import updates across pages.
4. The existing `src/theme/theme.css` / `themes.js` provides the current theming. How does `tokens.css` coexist? Recommendation: `tokens.css` defines the new bf-* token layer; `theme.css` can remain for existing components that haven't been redesigned yet (D2–D7 will migrate). Import order: `tokens.css` BEFORE `theme.css`.
5. Gallery `band_theme` gap: use fixed dark gradient for D1 thumbnails (recommended) or skip color entirely?

## Designer notes

### 1. CSS tokens — :root (19 vars confirmed)

Design `styles.css` `:root` defines exactly 19 custom properties. All 19 ship 1:1 in `tokens.css`:

- `--bg` `--bg-2` `--bg-3` `--paper` (4 background levels)
- `--ink` `--ink-2` `--ink-3` `--ink-4` (4 ink levels)
- `--rule` `--rule-2` (2 border levels)
- `--accent` `--accent-soft` `--accent-ink` (3 accent vars)
- `--shadow-card` (1 shadow)
- `--display` `--sans` `--mono` (3 font stacks)

**OMIT from tokens.css:** `--display-weight: 400` and `--serif` — both appear in design source but are redundant (`--serif` is identical to `--display`; `--display-weight` is unused in any class). Developer must NOT include these two.

### 2. Dark-mode overrides — [data-theme="dark"] (11 vars confirmed)

Design `styles.css` lines 24–37 define exactly 11 overridden properties:

- `--bg` `--bg-2` `--bg-3` `--paper` (4 background swaps)
- `--ink` `--ink-2` `--ink-3` `--ink-4` (4 ink swaps)
- `--rule` `--rule-2` (2 border swaps)
- `--accent-soft` (1 overlay swap)
- `--shadow-card` (1 shadow swap)

**NOT overridden in dark mode** (intentional — `--accent`, `--accent-ink`, `--display`, `--sans`, `--mono` stay unchanged). Developer must not add overrides for these.

### 3. Font loading strategy

- **Noto Sans SC + JetBrains Mono**: load via Google Fonts in `index.html` `<head>`.
  - Preconnect pair required before the CSS link:
    ```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    ```
  - Single CSS link: `family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap`
- **Futura BQ**: system fallback stack only — `"Futura BQ","Futura PT","Futura","Avenir Next"` before `"Noto Sans SC"` in `--display` and `--sans`. **NO `@font-face`, no webfont file bundled.**
  - DEVIATION FROM RAW DESIGN PACKAGE: User explicitly confirmed Futura BQ is a commercial webfont that must not be bundled in the open-source repo. The system fallback stack renders Futura on macOS/iOS/Windows with Futura installed; falls back gracefully to Avenir Next then Noto Sans SC on other systems. This is the approved D1 approach. D7 or a future paid-tier feature may revisit.

### 4. Logo lockup — text only, no image asset

Exact DOM structure from `components.jsx` lines 34–46 (hardcoded CN, no i18n keys needed):

```
<a class="bf-logo" aria-label="北美炸梦同好会">
  <span class="lg-words">
    <span class="lg-tag">F A N   C O M M U N I T Y</span>   ← mono, 11px, letter-spacing 0.42em
    <span class="lg-1 lg-zh">                               ← Noto Sans SC, 38px, weight 900
      <span class="lg-bandori">北美炸梦</span>
      <span class="lg-fans">同好会</span>
    </span>
    <span class="lg-strip">                                  ← mono, 10px, letter-spacing 0.16em
      <span class="lg-strip-jp">BanG Dream! 北米華人コミュニティ</span>
      <span class="lg-strip-sep">/</span>
      <span>EST. 2024</span>
    </span>
  </span>
</a>
```

No `<img>` tag, no SVG file, no asset dependency.

### 5. Utility bar pulse animation

Keep `@keyframes pulse` exactly as in design — no modification:

```css
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0   rgba(123,224,163,0.6); }
  70%  { box-shadow: 0 0 0 6px rgba(123,224,163,0);   }
  100% { box-shadow: 0 0 0 0   rgba(123,224,163,0);   }
}
```

- Dot: `width:6px; height:6px; border-radius:50%; background:#7be0a3` — color must be exactly `#7be0a3`, not a token.
- Animation duration: `1.8s infinite`.

### 6. Dark mode toggle UI — deferred to D7

- `tokens.css` ships all `[data-theme="dark"]` overrides — token layer is complete.
- **No toggle UI control in D1.** No button, no switch, no JavaScript to flip `data-theme`.
- D7 is the assigned sub-PR for implementing the toggle control.
- Developer note: `data-theme` attribute target is `document.documentElement` (`:root` equivalent).

### 7. CSS class namespace contract — bf-* locked

All classes below are locked. D2–D7 sub-PRs reference these by name. Developer must NOT rename any:

**Shell/layout:**
`bf-shell` `bf-container` `bf-hide-mobile`

**Utility bar:**
`bf-utility` `bf-uleft` `bf-uright` `bf-pulse`

**Masthead:**
`bf-mast` `bf-logo` `bf-mast-meta` `bf-search` `bf-skbd`
Logo internals: `lg-words` `lg-tag` `lg-1` `lg-zh` `lg-bandori` `lg-fans` `lg-strip` `lg-strip-jp` `lg-strip-sep`

**Nav:**
`bf-nav` `bf-nav-spacer` `bf-nav-misc`
Nav link internals: `nv-jp` `nv-cn`

**Section layout:**
`bf-section` `bf-section--paper` `bf-section--dark`
(Note: design also has `bf-section--bg` — include in CSS for D2+ use, but not rendered in D1 Home)

**Section title:**
`bf-section-title` `st-title` `st-jp` `st-more`

**Home hero:**
`bf-home-hero` `bf-hh-grid` `bf-hh-feature` `bf-hh-side` `bf-hh-next` `bf-hh-stats`
Hero internals: `hhf-tag` `hhf-d` `hhf-title` `hhf-excerpt` `hhf-cta`
Next-event internals: `hhn-tag` `hhn-d` `hhn-out` `hhn-title` `hhn-meta`

**News cards:**
`bf-news-list` `bf-news-card` `nc-thumb` `nc-band-name` `nc-body` `nc-meta` `nc-tag` `nc-d` `nc-title` `nc-excerpt`

**Table:**
`bf-tbl` `td-d` `td-band` `td-kind` `td-cat` `td-title` `td-sub` `td-buy` `td-status`

**Album grid:**
`bf-album-grid` `bf-album` `al-thumb` `al-count` `al-meta` `al-d` `al-title` `al-band`

**Join section:**
`bf-join` `bf-join-card` `jc-tag` `jc-title` `jc-sub` `jc-cta`
`bf-links-list` `bf-link` `lk-name` `lk-handle` `lk-desc` `lk-arrow`

**Footer:**
`bf-foot` `bf-foot-grid` `bf-foot-mast` `bf-foot-discl` `bf-foot-bottom`

**Helpers:**
`bf-pill` `bf-divider` `bf-cta` `bf-cta-2` `bf-helper` `bf-helper-tag`

### 8. BandSwitcher — STRIP from D1 (DEVIATION FROM RAW DESIGN PACKAGE)

- **Decision: STRIP `.bf-bands` and `.bf-band` CSS entirely from `tokens.css` and `Home.css`.**
- **`BANDS` data (`src/data/bands.js`)** — KEEP. Used for band-color lookups in hero gradients, news card thumbs, event border colors.
- **`BandSwitcher` component** — DO NOT render anywhere in D1. `LayoutShell` must not include it.
- **`.bf-bands` and `.bf-band` CSS classes** — DELETE from D1 CSS output. Keeping dead CSS classes creates a contract surface that D2–D7 authors may accidentally depend on.
- Rationale: User explicitly removed the BandSwitcher from the home page in the Claude Design chat session. It was a design exploration feature. Shipping the CSS without the component creates implicit API surface — strip both.
- If a future sub-PR (D5/D6) reintroduces a band filter, the Architect will spec the CSS at that point.

### 9. Mobile breakpoints

- `700px`: primary nav → horizontal scroll + right fade-mask; masthead → 1-column; utility bar → hide "非官方…" span and "更新于" span; logo scales down (30px); table → stacked cards; `.bf-section` padding drops to `36px 0`
- `480px`: search input `display:none` (entire `.bf-search` block); stats grid stays 3-col but nums shrink to 20px
- `1000px`: Hero grid (`.bf-hh-grid`) collapses to single column — feature card stacks above side panel

Confirm: Hero stack at `1000px` (not 700px) is correct per design line 340.

### 10. Section background alternation pattern

Home page section sequence:
1. `bf-home-hero` — `var(--bg)`, bottom border
2. `最新现地报告` — `.bf-section.bf-section--paper` (paper/beige, bordered top+bottom)
3. `近期活动` — `.bf-section` (default `var(--bg)`)
4. `近期相册` — `.bf-section.bf-section--paper`
5. `加入社群` — `.bf-section.bf-section--dark` (ink/dark, full bleed)

This alternating paper/bg/paper/dark rhythm must be preserved exactly — do not add extra wrappers or background overrides.

## Architect integration check

Verified against worktree `C:/Users/WaterMelon/bangdream-na-worktrees/d1-foundation-home/` on 2026-05-09. **Go for Developer.** No worker touchpoints needed (worker shape already matches Planner's lock — see §3 below).

### 1. App.jsx integration — exact diff

Current `src/App.jsx` already isolates admin via `useLocation().pathname.startsWith('/admin')` inside a `ChromeAndRoutes` component. Replace `<Navbar />` and `<Footer />` calls with `<LayoutShell>` wrapping. Mechanism: same `isAdmin` switch, but instead of conditional chrome+routes, conditionally wrap.

**Before** (`src/App.jsx`, lines 1–47, current code):
```jsx
import Navbar from './components/Navbar/Navbar.jsx'
import Footer from './components/Footer/Footer.jsx'
// ...page imports...

function ChromeAndRoutes() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  return (
    <>
      {!isAdmin && <Navbar />}
      <Routes>{/* ...all routes... */}</Routes>
      {!isAdmin && <Footer />}
    </>
  )
}
```

**After:**
```jsx
import LayoutShell from './components/LayoutShell/LayoutShell.jsx'
// (REMOVE Navbar + Footer imports — Navbar/Footer dirs deleted, see §5)
// ...page imports unchanged...

function ChromeAndRoutes() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* ...all other routes unchanged... */}
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
  return isAdmin ? routes : <LayoutShell>{routes}</LayoutShell>
}
```

**Why this shape (not LayoutShell wrapping `<Routes>` unconditionally with internal admin-skip):** Admin pages mount their own AdminTopBar/AdminNav (`src/components/AdminTopBar/`, `src/components/AdminNav/`). Mounting LayoutShell around admin would render BOTH chrome layers stacked. Keeping the route-level switch in App.jsx (NOT inside LayoutShell) makes the boundary explicit and prevents future admin-route additions from accidentally double-rendering.

### 2. CSS architecture — final layout

| Token / scope | File | Imported from |
|---|---|---|
| `:root` design tokens (19 vars) + `[data-theme="dark"]` (11 overrides) + `@keyframes pulse` + `body { background: var(--bg); color: var(--ink); }` reset + global helpers (`.bf-container`, `.bf-pill`, `.bf-divider`, `.bf-cta`, `.bf-cta-2`, `.bf-helper`, `.bf-helper-tag`, `.bf-section`, `.bf-section--paper`, `.bf-section--bg`, `.bf-section--dark`, `.bf-hide-mobile`) | `src/theme/tokens.css` (NEW) | `src/main.jsx` ONCE, immediately after `./index.css` and before `./theme/theme.css` |
| LayoutShell wrapper (just `bf-shell` flex column wrapping children) | `src/components/LayoutShell/LayoutShell.css` (NEW) | `LayoutShell.jsx` |
| UtilityBar (.bf-utility, .bf-uleft, .bf-uright, .bf-pulse + media queries) | `src/components/UtilityBar/UtilityBar.css` | `UtilityBar.jsx` |
| Masthead (.bf-mast, .bf-logo + lg-* internals, .bf-mast-meta, .bf-search, .bf-skbd) | `src/components/Masthead/Masthead.css` | `Masthead.jsx` |
| PrimaryNav (.bf-nav + nv-* internals + .bf-nav-misc + mobile fade-mask) | `src/components/PrimaryNav/PrimaryNav.css` | `PrimaryNav.jsx` |
| Footer (full rewrite — .bf-foot, .bf-foot-grid, .bf-foot-mast, .bf-foot-discl, .bf-foot-bottom) | `src/components/Footer/Footer.css` (REWRITE in place — current Footer.css deleted entirely) | `Footer.jsx` |
| SectionTitle (.bf-section-title, .st-title, .st-jp, .st-more) | `src/components/SectionTitle/SectionTitle.css` | `SectionTitle.jsx` |
| Home page (hero `.bf-hh-*`, news `.bf-news-card` + nc-*, table `.bf-tbl` + td-*, album `.bf-album-grid` + al-*, join `.bf-join` + jc-*/lk-*) | `src/pages/Home.css` (REWRITE in place — current Home.css deleted) | `Home.jsx` |

**`src/main.jsx` import order — exact:**
```jsx
import './index.css'
import './theme/tokens.css'   // NEW — bf-* tokens come after reset, before legacy theme.css
import './theme/theme.css'
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'
```

**`src/index.css` edits required (CONFLICTS):**
- Line 7: `color-scheme: dark;` — REMOVE (token system is light-default with `[data-theme="dark"]` opt-in; forcing `color-scheme: dark` overrides all native UI rendering and conflicts with `--bg: #f3f1ec` paper palette).
- Lines 35–37 `body { background: var(--color-bg); color: var(--color-text); }` — KEEP unchanged (legacy ThemeContext exposes `--color-bg`/`--color-text`; tokens.css overrides these on body via the `body` rule in tokens.css that sets `background: var(--bg); color: var(--ink); font-family: var(--sans);` — the LATER import wins).
- Lines 1–6 font-family on `:root` — KEEP unchanged (tokens.css `body` rule with `var(--sans)` overrides for body text; legacy `:root` font-family acts only as fallback for any unstyled subtree).

**Critical:** tokens.css MUST set `body { background: var(--bg); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; }` to override index.css's body rule. The import-order rule above (tokens.css AFTER index.css, BEFORE theme.css) makes this deterministic.

### 3. Worker API field map — verified, no worker changes needed

`/api/news?limit=5` → `respondPublic(c, { items: NewsRowOut[], total: number })` — verified at `worker/src/routes/public.ts:117-120`.

`/api/events?scope=upcoming&limit=4` → `respondPublic(c, { items: EventRowOut[], total: number })` — verified at `worker/src/routes/public.ts:187-190`.

`/api/gallery?limit=6` → `{ items: GalleryItemOut[], total: number }` — verified at `worker/src/routes/gallery.ts` (returns join with `event_slug` + `event_title_zh`).

| Design field | Source endpoint | Source field | Transform | Fallback when null |
|---|---|---|---|---|
| `hero.d` | `/api/news[0]` | `published_at` (Unix sec) | `new Date(s*1000)` → `YYYY.MM.DD` | n/a (worker guarantees non-null `publishedAt`) |
| `hero.title` | `/api/news[0]` | `title_zh` | passthrough | `title_en` if lang=EN; else `'—'` |
| `hero.excerpt` | `/api/news[0]` | `body_md` | strip markdown (`replace(/[#*_`>\[\]\(\)]/g,'')`), truncate 160 chars + `…` | empty string |
| `hero.bandColor` | `/api/news[0]` | `category` | NOT USED for color (worker doesn't expose `band_theme` on news — see SURPRISE 3 below) | always fallback `BANDS.find(b=>b.id==='all')` = ink/black gradient |
| `hero.tag` | hardcoded | — | `'// 最新现地报告 · LATEST REPORT'` | n/a |
| `hero.cta.href` | `/api/news[0]` | `slug` | `/news/${encodeURIComponent(slug)}` | if slug missing, render disabled state (no link) |
| `nextEvent.d` | `/api/events?scope=upcoming&limit=4` items[0] | `start_at` | `YYYY.MM.DD` | n/a (worker guarantees non-null `startAt`) |
| `nextEvent.daysOut` | items[0] | `start_at` | `Math.ceil((start_at*1000 - Date.now())/86400000)` + `'天后'` | if ≤0 → `'今天'` |
| `nextEvent.title` | items[0] | `title_zh` | passthrough | `title_en` else `'—'` |
| `nextEvent.city` | items[0] | `city` | passthrough | `'—'` |
| `nextEvent.venue` | items[0] | `venue` | passthrough | `'—'` |
| `nextEvent.borderColor` | items[0] | `band_theme` | `BANDS.find(b=>b.id===band_theme)?.color` | `var(--ink)` |
| `nextEvent.href` | items[0] | `slug` | `/events/${encodeURIComponent(slug)}` (PR #110 fix) | n/a |
| `stats.events` | `/api/events?scope=upcoming&limit=4` + `/api/events?scope=past&limit=1` | sum of both `total` | parallel `Promise.allSettled` | `'—'` if either rejects |
| News card `tag` | `/api/news[1..4]` | `category` | `category.toUpperCase()` | empty |
| Events table `购票` | items | `ticket_url` | render only when truthy | omit cell |
| Album thumb color | `/api/gallery` | NONE — see SURPRISE 1 in spec | linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%) for ALL | always fallback |
| Album `al-d` | `/api/gallery` | `taken_at` ?? `created_at` | `YYYY.MM.DD` | n/a |
| Album `al-title` | `/api/gallery` | `caption` ?? `event_title_zh` ?? `'Photo'` | passthrough | `'Photo'` |

**SURPRISE 3 — News has no `band_theme`:** `NewsRowOut` (worker/src/utils/row-mappers.ts:15-27) does NOT expose a `band_theme` field on news. Spec line 95 implies it does. **Resolution: hero feature card uses fixed gradient `linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%)` for D1.** News card thumbnails likewise use the same fixed gradient. Per-band news colors are deferred to D2 (`feat/d2-news-redesign`) where the worker may grow a `band_theme` column on news_posts. Update spec §"API Field Map" line 204 to reflect this — Developer should NOT call `BANDS.find()` on news items.

### 4. Files to change/create

**Create new:**
- `src/theme/tokens.css`
- `src/data/bands.js`
- `src/components/LayoutShell/LayoutShell.jsx`
- `src/components/LayoutShell/LayoutShell.css`
- `src/components/LayoutShell/LayoutShell.test.jsx`
- `src/components/UtilityBar/UtilityBar.jsx`
- `src/components/UtilityBar/UtilityBar.css`
- `src/components/UtilityBar/UtilityBar.test.jsx`
- `src/components/Masthead/Masthead.jsx`
- `src/components/Masthead/Masthead.css`
- `src/components/Masthead/Masthead.test.jsx`
- `src/components/PrimaryNav/PrimaryNav.jsx`
- `src/components/PrimaryNav/PrimaryNav.css`
- `src/components/PrimaryNav/PrimaryNav.test.jsx`
- `src/components/SectionTitle/SectionTitle.jsx`
- `src/components/SectionTitle/SectionTitle.css`
- `src/components/SectionTitle/SectionTitle.test.jsx`

**Rewrite in-place (delete current contents, ship new):**
- `src/App.jsx` — swap chrome to LayoutShell (see §1 diff)
- `src/main.jsx` — add `import './theme/tokens.css'` (see §2 import order)
- `src/index.css` — REMOVE `color-scheme: dark` line only (see §2 conflicts)
- `src/components/Footer/Footer.jsx` + `.css` — full rewrite per design (existing Footer.test.jsx may need updating, see §7 edge tests)
- `src/pages/Home.jsx` — full rewrite (single responsive component)
- `src/pages/Home.css` — full rewrite (delete current, ship new with all bf-hh-*, bf-news-*, bf-tbl, bf-album-*, bf-join classes)
- `src/data/i18n.json` — add new keys (see §6)
- `index.html` — add Google Fonts preconnect + link (see Designer note §3)

**Delete entirely (after verifying no other consumer):**
- `src/pages/Home.desktop.jsx`
- `src/pages/Home.desktop.css`
- `src/pages/Home.desktop.test.jsx`
- `src/pages/Home.mobile.jsx`
- `src/pages/Home.mobile.css`
- `src/pages/Home.mobile.test.jsx`
- `src/pages/Home.test.jsx` (replaced by new test that wraps with MemoryRouter — see §8)
- `src/components/Navbar/` (entire directory — Navbar.jsx, Navbar.css, Navbar.test.jsx, any CSS module variants). Verify with `grep -r "from.*Navbar" src/` — current consumer is only `App.jsx`. After App.jsx swap, Navbar has zero imports.
- `src/components/Footer/Footer.test.jsx` — delete current test (its assertions reference `footer-quickLinks`, `footer-link` classes that no longer exist post-rewrite). Replace with new Footer.test.jsx covering new bf-foot-* DOM.

**DO NOT delete:**
- `src/components/MobileDrawer/` — referenced by Navbar but Navbar is gone; HOWEVER MobileDrawer is also imported by other pages (verify with grep). If only Navbar uses it, delete in D7 not D1 (deferred to avoid scope creep).
- `src/components/ThemeSwitcher/` — keep (D7 will wire `data-theme` toggle).
- `src/components/LangToggle/` — keep (UtilityBar's language selector REUSES this component for the toggle behavior, only the styling differs; render `<LangToggle />` inside `.bf-uright`).
- `src/theme/theme.css`, `src/theme/themes.js`, `src/theme/ThemeContext.jsx` — keep (legacy theming for not-yet-redesigned pages D2–D7 will migrate; `tokens.css` is additive).

### 5. Files to delete summary (exact paths)

```
src/pages/Home.desktop.jsx
src/pages/Home.desktop.css
src/pages/Home.desktop.test.jsx
src/pages/Home.mobile.jsx
src/pages/Home.mobile.css
src/pages/Home.mobile.test.jsx
src/pages/Home.test.jsx
src/components/Navbar/Navbar.jsx
src/components/Navbar/Navbar.css
src/components/Navbar/Navbar.test.jsx
src/components/Footer/Footer.test.jsx (delete then re-create with new assertions)
```

### 6. i18n keys to add (en + zh)

Add to `src/data/i18n.json` under both `en` and `zh` blocks (current file already has `en` and `zh` blocks — see lines 6 and the corresponding `zh` block):

| Key | EN | ZH |
|---|---|---|
| `home.hero.latestReport` | `// LATEST REPORT` | `// 最新现地报告 · LATEST REPORT` |
| `home.hero.nextEvent` | `// NEXT EVENT` | `// 即将到来 · NEXT EVENT` |
| `home.hero.readFull` | `Read More →` | `阅读全文 →` |
| `home.hero.daysOut` | `{n} days` | `{n}天后` |
| `home.hero.today` | `Today` | `今天` |
| `home.stats.members` | `Members` | `同好` |
| `home.stats.chapters` | `Chapters` | `分会` |
| `home.stats.events` | `Events` | `活动` |
| `home.news.sectionCn` | `Latest Reports` | `最新现地报告` |
| `home.news.sectionJp` | `LATEST REPORTS` | `LATEST REPORTS` |
| `home.news.more` | `All News →` | `全部新闻 →` |
| `home.events.sectionCn` | `Upcoming Events` | `近期活动` |
| `home.events.sectionJp` | `UPCOMING EVENTS` | `UPCOMING EVENTS` |
| `home.events.more` | `All Events →` | `全部活动 →` |
| `home.events.col.date` | `Date` | `日期` |
| `home.events.col.daysOut` | `In` | `距今` |
| `home.events.col.event` | `Event` | `活动` |
| `home.events.col.city` | `City` | `城市` |
| `home.events.buy` | `Buy →` | `购票 →` |
| `home.events.empty` | `No upcoming events.` | `暂无即将到来的活动` |
| `home.gallery.sectionCn` | `Recent Albums` | `近期相册` |
| `home.gallery.sectionJp` | `GALLERY` | `GALLERY` |
| `home.gallery.more` | `All Albums →` | `全部相册 →` |
| `home.gallery.empty` | `No photos yet.` | `暂无相册` |
| `home.join.sectionCn` | `Join the Community` | `加入社群` |
| `home.join.sectionJp` | `JOIN THE COMMUNITY` | `JOIN THE COMMUNITY` |
| `home.join.more` | `About Us →` | `关于我们 →` |
| `home.join.qqTag` | `Main Entry` | `主要入口` |
| `home.join.qqTitle` | `QQ Group` | `QQ 群` |
| `home.join.qqSub` | `Primary CN community · expedition / tickets / on-site` | `中文同好主社群 · 远征 / 出票 / 现地` |
| `home.join.qqCta` | `Join QQ Group →` | `加入 QQ 群 →` |
| `utility.online` | `ONLINE` | `在线` |
| `utility.disclaimer` | `unofficial / non-profit / fan-run since 2024` | `非官方 / 非营利 / fan-run since 2024` |
| `nav.tickets.short` | `TICKETS` | `出票公告` (CN main) / `TICKETS` (JP/EN sub) |
| `nav.guide.short` | `GUIDES` | `现地攻略` (CN main) / `GUIDES` (JP/EN sub) |

**Reuse existing keys (do NOT duplicate):** `nav.home`, `nav.news`, `nav.events`, `nav.gallery`, `nav.tickets`, `nav.guide`, `nav.members`, `nav.about`, `nav.rules`, `nav.forum`, `lang.label`, `lang.tooltip`. PrimaryNav's CN labels for nav links are HARDCODED per Designer §4 (logo lockup precedent — site-chrome CN never translates), but `aria-label`s on nav use the existing `nav.*` keys.

**Standing rule reminder for Developer:** Per memory `feedback_i18n_scope_full_ui_chrome_default.md`, ALL visible UI chrome strings must route through `t()`. The hardcoded CN labels in nav (首页, 新闻, etc.) and logo (北美炸梦同好会) are an explicit Designer carve-out documented at spec §4 + §"PrimaryNav component" — do NOT add i18n keys for those without checking with Designer first.

### 7. Edge tests — 8 mandatory (assertion-level)

Build on Planner's enumerated 8 edge cases (spec lines 234–243). Refined for React Router + Vite + jsdom + the existing MemoryRouter wrapper precedent:

1. **`Home.test.jsx` — empty news API**
   - `vi.spyOn(api, 'fetchNews').mockResolvedValue({ items: [], total: 0 })` + happy events/gallery
   - Assert: `await waitFor(() => expect(screen.queryByText(t('home.events.sectionCn'))).toBeInTheDocument())` — section title appears proving render completed; then `expect(container.querySelector('.bf-hh-feature .hhf-title')).toBeNull()` (no title rendered when news empty); `expect(container.querySelector('.bf-news-list')).toBeInTheDocument()` (grid container present, empty); no console.error fired.

2. **`Home.test.jsx` — empty events API**
   - `fetchEvents` mock returns `{ items: [], total: 0 }` for both upcoming and past
   - Assert: `expect(screen.getByText('暂无即将到来的活动')).toBeInTheDocument()` (next-event placeholder); stats events column shows `0` (the sum of both totals); `expect(container.querySelector('.bf-tbl tbody tr')).toBeNull()` (table empty body — or shows empty placeholder row).

3. **`Home.test.jsx` — null venue/city in next-event**
   - upcoming items[0] has `venue: null, city: null`
   - Assert: `expect(within(container.querySelector('.hhn-meta')).getAllByText('—').length).toBe(2)`; no JS error in `console.error` spy.

4. **`Home.test.jsx` — null `ticket_url` in events table row**
   - events list contains row with `ticket_url: null`
   - Assert: `const buyCell = container.querySelector('.bf-tbl tbody tr:first-child .td-buy')` is `null`; row has same column count as a row WITH ticket_url (cell present but empty), proving no layout shift via `expect(rowWithoutTicket.querySelectorAll('td').length).toBe(rowWithTicket.querySelectorAll('td').length)`.

5. **`Home.test.jsx` — null `band_theme` on next-event**
   - upcoming items[0] has `band_theme: null`
   - Assert: `const card = container.querySelector('.bf-hh-next')`; `expect(card.style.borderLeftColor).toBe('rgb(31, 29, 26)')` (var(--ink) computed = #1f1d1a). Use jsdom `getComputedStyle(card).getPropertyValue('border-left-color')` since style attribute may use CSS var; if `getComputedStyle` returns the var name unresolved in jsdom, assert on the inline `style.borderLeftColor` set explicitly to `'#1f1d1a'` by Home.jsx fallback path.

6. **`Home.test.jsx` — long `title_zh` overflow (60+ chars)**
   - news items[0].title_zh = `'罗西莉亚北美巡演加场公告：洛杉矶Wiltern追加票务发售时间'` (37 CN chars ≈ 60+ visual width)
   - Assert: `const title = container.querySelector('.bf-hh-feature .hhf-title')`; `expect(title.textContent).toBe('罗西莉亚北美巡演加场公告：洛杉矶Wiltern追加票务发售时间')` (full string rendered, no JS truncation); CSS `word-break` handles overflow visually — test asserts NO horizontal scroll on the parent at 375px width: `Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 }); window.dispatchEvent(new Event('resize'))` then `expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth + 1)` (allow 1px subpixel).

7. **`Home.test.jsx` — NEXT EVENT link uses slug (PR #110 fix)**
   - upcoming items[0].slug = `'roselia-anime-expo-2026'`, id = 42
   - Assert: `const link = container.querySelector('.bf-hh-next')`; `expect(link.tagName).toBe('A')` (React Router `<Link>` renders `<a>`); `expect(link.getAttribute('href')).toBe('/events/roselia-anime-expo-2026')` — must NOT contain `42` (id). This explicitly guards the regression from PR #110.

8. **`PrimaryNav.test.jsx` — mobile nav overflow**
   - Render `<PrimaryNav />` inside `MemoryRouter`, set `window.innerWidth = 375`, dispatch resize.
   - Assert: `const nav = container.querySelector('.bf-nav')`; `expect(getComputedStyle(nav).overflowX).toBe('auto')`; `expect(container.querySelector('a[href="/rules"]')).toHaveStyle({ display: 'none' })` (group rules link); `expect(container.querySelector('a[href="#forum"]') ?? container.querySelector('a[href="#"]'))` — 论坛 link is also hidden; remaining 8 nav items reachable in DOM (not display:none).

**Bonus edge tests (recommended, not blocking):**
- `LayoutShell.test.jsx` — `<header>` semantic on Masthead, `<nav aria-label>` on PrimaryNav (a11y).
- `LayoutShell.test.jsx` — admin route renders WITHOUT shell (assert `bf-utility` absent when path = `/admin/foo`).
- `UtilityBar.test.jsx` — pulse `<span>` has `background: #7be0a3` inline (color must be exact, not a token).
- `Footer.test.jsx` — copyright year is current year (`new Date().getFullYear()`).

### 8. Test scaffolding snippet — Developer copy this verbatim

Existing precedent at `src/pages/EventDetail.test.jsx` (lines 1–16):

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Home from './Home.jsx'
import * as api from '../lib/api.js'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('<Home />', () => {
  let newsSpy, eventsSpy, gallerySpy
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    newsSpy = vi.spyOn(api, 'fetchNews')
    eventsSpy = vi.spyOn(api, 'fetchEvents')
    gallerySpy = vi.spyOn(api, 'fetchGallery')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  // tests...
})
```

For PrimaryNav/Masthead/UtilityBar/Footer tests that don't need routes, use the lighter precedent at `src/components/EventCard/EventCard.test.jsx:5-8`:

```jsx
function render(ui, options) {
  return rtlRender(ui, { wrapper: MemoryRouter, ...options })
}
```

**Per memory `feedback_test_final_positive_state_not_absence.md`:** All async-render assertions use `await waitFor(() => expect(<final element>).toBeInTheDocument())`, NEVER `expect(loading).not.toBeInTheDocument()`. For tests that lock to `setLanguage('zh')` (i18n locale state is shared), prefer DOM structural matchers (`querySelector('.bf-tbl')`) over text matchers when CN/EN strings could collide.

### 9. BandSwitcher decision — confirmed STRIP

Designer recommendation accepted in full. Verified no other code references `.bf-bands` or `.bf-band` classes (`grep -r "bf-band" src/` returns no matches in current codebase since these classes don't exist yet). `BANDS` data export from `src/data/bands.js` is consumed only by:
- `src/pages/Home.jsx` (next-event border color, news card thumbnail color)
- D2–D7 sub-PRs (news/event detail pages will look up by `band_theme`)

LayoutShell does NOT mount any band-filter UI. No `.bf-bands` / `.bf-band` CSS shipped.

### 10. NEXT EVENT routing — confirmed PR #110 contract

Spec acceptance criterion at line 102 says `/events/{events[0].slug}` (slug not id). Current `App.jsx` line 28 routes `/events/:slug` to `<EventDetail />`. `EventDetail.jsx` consumes `useParams().slug` (verified via existing `EventDetail.test.jsx:11` matching `/events/:slug`).

**Developer must use:**
```jsx
<Link to={`/events/${encodeURIComponent(event.slug)}`} className="bf-hh-next">
```

NOT `event.id`. The edge test #7 above explicitly asserts this. Per memory `feedback_pr_success_is_user_bug_fixed_not_spec_met.md`, this is a SHIPPED-bug guard — Reviewer treats a slug-vs-id regression as BLOCKER.

### 11. Worker touchpoint check — NONE

D1 does NOT modify `worker/`. All required fields (`title_zh`, `body_md`, `published_at`, `category`, `slug`, `start_at`, `end_at`, `venue`, `city`, `ticket_url`, `band_theme`, `image_url`, `taken_at`, `caption`, `event_slug`, `event_title_zh`) are already exposed by current row mappers. The only adaptation Developer does is client-side (date formatting, markdown stripping, days-out math).

If Developer discovers a missing field mid-implementation: STOP and surface to team-lead via SendMessage. Do NOT silently add a worker route or column — that's out of D1 scope and breaks the `D1 must merge first; worker schema unchanged` contract.

### 12. Standing rules embedded for Developer briefing

Per memory `feedback_embed_standing_rules_in_agent_briefing.md`, Developer must be reminded verbatim of:
- `feedback_no_smart_quotes.md` — No smart quotes in JSX/JS; breaks build with `Invalid character`. Use `"` and `'` only.
- `feedback_pr_success_is_user_bug_fixed_not_spec_met.md` — NEXT EVENT slug routing is a shipped-bug guard, treat regression as BLOCKER.
- `feedback_test_final_positive_state_not_absence.md` — `waitFor` final element appearing, not absence of loading.
- `feedback_i18n_scope_full_ui_chrome_default.md` — Hardcoded CN in logo + nav links is an explicit Designer carve-out (see §4 above + Designer §4); do not add i18n keys without Designer signoff.
- `feedback_bangdream_na_no_ci_for_worker_tests.md` — Reviewer must run `cd worker && npx vitest run` locally; "Cloudflare Pages SUCCESS" only covers vite build of frontend.
- `feedback_blanket_stage_resurrects_user_dont_push.md` — `git add -A` forbidden; explicit file paths only.
- `feedback_no_coauthor.md` + `feedback_no_claude_on_github.md` — No Co-Authored-By, no `.claude/` in commits.
- `feedback_gh_pr_create_explicit_base_head.md` — `gh pr create --base main --head feat/d1-foundation-home`.

