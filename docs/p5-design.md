# bangdream-na — Phase 5 Design Spec (Visual revamp + IA)

Single-source design reference for the Phase 5 visual revamp. Audience: P5 Architect (data shapes + token additions), P5 Developer (DOM + CSS + component contracts + edge cases), P5 Reviewer (acceptance criteria).

**Theme tokens are LOCKED** — Phase 1 owns the eight-theme palette (`docs/design.md`). Phase 2 added `--color-on-primary` / `--color-on-accent`. Phase 5 introduces zero new `--color-*` tokens. All chrome (navbar, sidebars, calendar, hero carousel, news cards, footer columns) composes existing tokens + `--gradient-hero`.

**Aesthetic anchor**: bang-dream.com (`https://bang-dream.com/`, `/news`) for IA — top-tab nav, multi-dim filter sidebar, `768×432` thumbnail cards, `YYYY.MM.DD` date format, JP/EN lang toggle in upper nav, hero featured-content carousel. We adopt the *patterns*, not the brand visuals — no Bushiroad logos, no character art, no 1:1 hex copies. Card hover lift + theme-tinted glow continues from Phase 2/3 (`portfolio/src/components/Projects.css:17-21`).

**Tri-lingual brand identity** (locked, never swapped via LangToggle):

| Locale | Name |
|---|---|
| Japanese | バンドリ北米華人コミュニティ |
| Chinese | 北美炸梦同好会 |
| English | BanG Dream North America Chinese Community |

All three are equal-weight official names. They appear together in Hero §3, About title §8, Footer brand line §4.5. The LangToggle (中/EN) does NOT swap them — it only translates UI chrome strings (nav labels, footer headings, button labels, empty states). The brand identity is a constant on every page.

---

## 1. Information architecture

### 1.1 Final tab structure

```
Home  ·  News  ·  Events  ·  Members  ·  About
```

### 1.2 Pruned from bang-dream.com (justification per cut)

| Their tab | Decision | Reason |
|---|---|---|
| Home | KEEP | Always required; landing/hero. |
| News | KEEP (new) | Community announcements, AAR write-ups, site updates. Existing Phase 2/3 pages don't cover this — adding a low-cost, low-frequency content stream gives the LangToggle and sidebar pattern somewhere to live and bang-dream.com models the right shape. |
| Live•Event | MERGE → Events | Already exists as `/events` post-Phase 2. Bang-dream.com splits because they manage a label catalog + tour manifest at scale; we have a single calendar of community-relevant events. |
| Discography | DROP | No first-party music — the bands' songs are owned by Bushiroad/Craft Egg. Linking to discographies just bounces visitors out. |
| Artist | DROP | Same — band pages would mirror the official site without adding fan value. Phase 6+ may revisit "/bands/{key}" with NA-specific cover-band sightings; not Phase 5 scope. |
| Anime | DROP | Out of scope for a regional fan community; visitors already know where to watch. |
| Game | DROP | No NA Bandori game; existing visitors already know about JP+TW versions. Promoting a region-locked product to a confused NA audience is bad UX. |
| Media | DROP | Press kit / media inquiries don't apply at fan-community scale. |
| Schedule | MERGE → Events (`?view=calendar`) | Replicates the calendar grid as an opt-in toggle on `/events` rather than a separate top-level tab. Reduces nav depth + keeps the calendar context-near to the list. |
| About | KEEP (new) | Mission, FAQ, COC, join instructions. Currently scattered between Hero tagline + Footer disclaimer; consolidating into a single page is overdue. |
| Goods | DROP | No fan-club merchandise; no official store partnership. |

Net: 10 → 5 tabs. The community-oriented ones survive, the official-catalog ones don't.

### 1.3 Routes

```
/            → Home
/news        → News (NEW)
/events      → Events (?view=list|calendar — list default)
/members     → Members
/about       → About (NEW)
```

`/admin/*` is reserved for Phase 4 — not part of Phase 5 scope.

---

## 2. Navbar layout

### 2.1 Desktop structure (≥768px)

```
[Logo BD!NA]   Home  News  Events  Members  About    [中/EN]  [🎨]  [Discord pill]
```

- Container: full-width `<nav role="navigation" aria-label="Primary">`, `position: sticky`, `top: 0`, `z-index: 100`.
- Inner: `max-width: 1280px`, `margin-inline: auto`, `padding: 0.875rem 2rem`, `display: flex`, `align-items: center`, `gap: 2rem`.
- Background: `background: color-mix(in srgb, var(--color-bg) 88%, transparent)`, `backdrop-filter: blur(16px) saturate(1.1)`, `-webkit-backdrop-filter: blur(16px) saturate(1.1)` (Safari prefix). Fallback for browsers without backdrop-filter: `background: var(--color-bg)` (already-dark, no blur, still readable).
- Hairline: `border-bottom: 1px solid var(--color-border)`.
- Scroll behavior: same blur+sticky at every scroll position (no shrinking, no shadow toggle — keeps the chrome stable as the visitor scrolls news/events).

### 2.2 Logo / brand block

- Slot 1: 32×32 logo `<img>` (existing `/logo.png`) + brand wordmark span.
- Wordmark: `BD!NA` for the desktop chrome (compact), `font-weight: 800`, `letter-spacing: -0.5px`, `font-size: 1.0625rem`, `color: var(--color-primary)` (theme-tinted). Tooltip (`title`) on the link: full English name `BanG Dream North America Chinese Community` so hover reveals identity without taking nav real estate.
- Click → `/`. ARIA label: `"BanG Dream North America Chinese Community — Home"`.

### 2.3 Nav links (5 tabs)

- `<ul class="navbar-links">` between brand and tail.
- Each link: `<NavLink>` from react-router-dom, padding `0.5rem 0.75rem`, `border-radius: 6px`, `font-size: 0.9375rem`, `font-weight: 500`, `color: var(--color-text-muted)`.
- Hover: `color: var(--color-text)`, `background: rgba(255,255,255,0.04)`.
- Active (`isActive`): `color: var(--color-primary)`, weight 600. Active indicator: 2px underline using `box-shadow: inset 0 -2px 0 var(--color-primary)` so it doesn't shift layout.
- Focus: `outline: 2px solid var(--color-primary); outline-offset: 2px`.
- Labels are translatable — sourced from `i18n.json` keyed `nav.home`, `nav.news`, `nav.events`, `nav.members`, `nav.about`. Default EN/ZH copy in §9.6.

### 2.4 Tail block (right slot)

Order, left-to-right: `LangToggle` → `ThemeSwitcher` → `DiscordCTA` (size="sm" pill).

- Spacing: `gap: 0.75rem`.
- LangToggle: see §9.
- ThemeSwitcher: unchanged from Phase 1 (palette icon button + popover).
- Discord pill: existing `DiscordCTA size="sm"` — Discord brand `#5865F2`, white text, official Discord glyph, label "Discord" (no full "Join Discord" — too long for navbar). On `<540px` the label is hidden, only the icon shows (24×24 circle). Hover overlay rule from Phase 1 §4 carries (`--gradient-hero` at 30% opacity).

### 2.5 Mobile structure (<540px)

```
[Logo BD!NA]                                                             [☰]
```

- Padding reduces to `0.75rem 1.25rem`.
- Nav links + tail block collapse into a hamburger drawer (§10).
- Hamburger button: 40×40 hit area, 24×24 SVG (3 horizontal lines, 1.75 stroke `currentColor`), `background: transparent`, `border-radius: 8px`, hover background `rgba(255,255,255,0.04)`. ARIA: `aria-label="Open navigation menu"`, `aria-expanded={drawerOpen}`, `aria-controls="mobile-drawer"`.
- ThemeSwitcher does NOT stay in the navbar at mobile (different from Phase 1's rule of "always reachable") — it moves into the drawer alongside LangToggle. Reasoning: with LangToggle added, three icons in a 320px navbar tail crowds the brand. Drawer hosts both controls in a touch-comfortable layout; users open the drawer to switch theme/language on mobile.

### 2.6 Tablet (540–767px)

- Same hamburger pattern as mobile (`<540px`). Nav-link row fits at ≥768px once compressed; below that, the 5 labels (esp. ZH translations like "活动") wrap awkwardly. Hamburger threshold at 540px is the natural breakpoint where nav-links + tail can no longer share a single row without truncation.

### 2.7 Edge cases

- LangToggle position never changes between LTR and (hypothetical) RTL — both EN and ZH read LTR.
- `prefers-reduced-motion: reduce`: drawer slide animation collapses to instant, sticky nav remains (no animation involved).
- Sticky offset interaction: in-page anchor links must account for sticky height (`scroll-margin-top: 64px` on `<h2>` / `<h3>` page section heads; About FAQ entries especially).
- Active route highlight uses `react-router-dom` `NavLink end={link.end}` — `end={true}` only on `/`, so visiting `/news/foo` (Phase 6+) wouldn't keep `/` highlighted.

---

## 3. Hero rewrite — tri-lingual heading + carousel

### 3.1 Layout

The Home Hero stays full-viewport (Phase 1 §2). Inner content reorganizes around three name lines + the carousel.

```
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>      <!-- existing gradient layer -->
  <div class="hero-content">
    <p class="hero-name-jp"  lang="ja">バンドリ北米華人コミュニティ</p>
    <h1 class="hero-name-zh" lang="zh">北美炸梦同好会</h1>
    <p class="hero-name-en"  lang="en">BanG Dream North America Chinese Community</p>
    <p class="hero-tagline">{tagline}</p>
    <div class="hero-cta"><DiscordCTA size="lg" /></div>
    <HeroCarousel events={upcomingTop5} fallback={<HeroStatTiles />} />
  </div>
</section>
```

### 3.2 Heading arrangement (vertical stack — Designer's pick)

Three lines, stacked, descending vertical rhythm. Centered horizontally. The Chinese name carries the `<h1>` because it's the canonical community name on Chinese-speaking community channels; JP and EN are co-equal in identity but read as sister lines — they receive `<p>` semantically while still rendering as distinct typographic blocks.

| Line | Element | Size (clamp) | Weight | Letter-spacing | Color |
|---|---|---|---|---|---|
| JP (top) | `<p class="hero-name-jp" lang="ja">` | `clamp(0.875rem, 1.6vw, 1.125rem)` | 400 | `0.15em` (tracked-out kana for elegance) | `var(--color-text-muted)` |
| ZH (center, canonical) | `<h1 class="hero-name-zh" lang="zh">` | `clamp(2.5rem, 6vw, 4.5rem)` | 800 | `-0.04em` (CJK-tight) | `var(--color-text)` |
| EN (bottom) | `<p class="hero-name-en" lang="en">` | `clamp(0.9375rem, 2vw, 1.25rem)` | 500 | `0` | `var(--color-text)` (full-strength, not muted — co-equal weight in identity even at smaller size) |

Vertical rhythm: `gap: 0.625rem` between JP→ZH, `gap: 0.875rem` between ZH→EN. The slightly larger ZH→EN gap signals the EN line is a distinct identity, not a translation/subtitle.

Line-height: JP `1.4`, ZH `1.05` (tight CJK), EN `1.3`. Different scripts get different baselines — see §13.

### 3.3 Why vertical stack and not inline mix

Considered alternatives:
- **Inline mix** (`バンドリ・北美炸梦・BanG Dream NA`): rejected — the three names have different lengths (15 / 8 / 38 chars) so any inline arrangement creates uneven visual weight. Also an inline mix reads as a single sentence, blurring the "three equal-weight identities" intent.
- **JP + EN inline above, ZH below as H1**: rejected — splits the EN name from its sibling languages and makes EN feel like a translation of ZH.
- **Vertical stack with ZH as the canonical H1**: chosen — visually equal-weight in the sense that all three are present and legible, but the typographic hierarchy (small JP top → large ZH center → medium EN below) gives the viewer a clear scan order. Mirrors how a Japanese band site might present its name in JP/EN side-by-side; we extend to three.

### 3.4 Logo + heading interaction

The existing Hero already shows `/logo.png` 200×200 above the heading. Phase 5 keeps it. Order top-to-bottom: logo → JP → ZH → EN → tagline → DiscordCTA → carousel.

### 3.5 Tagline placement

Existing tagline (`"Concerts, communities, and conventions across North America"`) stays — `font-size: clamp(1rem, 2.5vw, 1.5rem)`, `color: var(--color-text-muted)`, `margin: 1.5rem auto 2rem`. The tagline is content (single-language EN as authored); it does NOT swap with the LangToggle. If a ZH tagline is added to `site.json` later, both render stacked; otherwise EN stands alone.

### 3.6 HeroCarousel

Replaces the previous `<ComingSoonCard />` pair on the home page.

#### 3.6.1 Data source

- Reads `events.json` at module-import time.
- Filters: `event.date >= now` (or `endDate >= now` if multi-day), then sorts `date ASC`, takes top 5.
- Empty result → renders the `<HeroStatTiles />` fallback (§3.6.6) — never rendered as a 0-slide carousel.

#### 3.6.2 Layout

- Container: full-width inside `.hero-content`, `max-width: 720px`, `margin: 3rem auto 0`.
- Slide aspect: `aspect-ratio: 16/9` (uses the shared `card-thumb-16-9` class — see §11). Width 100% of container; height auto.
- Each slide is a clickable card. Background: the event's `image` (or letter-avatar fallback per Phase 2 §3.4 with `--gradient-hero`). Foreground overlay (gradient `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)`) ensures title text is always readable on any image.
- Title: bottom-left padded `1.25rem`, `font-size: clamp(1.125rem, 2.5vw, 1.5rem)`, `font-weight: 700`, `color: #ffffff`, line-clamp 2.
- Date/location row: above title, `font-size: 0.875rem`, `color: rgba(255,255,255,0.85)`, `font-weight: 500`. Date format `YYYY.MM.DD` (§12).
- Type badge (top-right of slide): same Phase 2 type badge using `var(--color-on-primary)` / `var(--color-on-accent)`.

#### 3.6.3 Auto-advance + pause-on-hover

- 6-second interval per slide.
- `setInterval` advances `currentIndex = (currentIndex + 1) % slides.length`.
- Pauses on `mouseenter` (clears interval), resumes on `mouseleave` (restarts interval, slide does NOT immediately advance — fresh 6s window from leave time).
- Pauses while document is hidden (`document.visibilitychange` listener) — doesn't waste cycles in a backgrounded tab.
- Pauses if `prefers-reduced-motion: reduce` is set — no auto-advance at all; user navigates manually via prev/next/dots only. This is critical for a11y; vestibular-sensitive visitors must not be force-rotated.

#### 3.6.4 Manual navigation

- Prev/next buttons: 40×40 circular, absolutely positioned at vertical center, left/right edges with `2rem` inset on desktop, `0.75rem` on mobile. Background `rgba(0,0,0,0.55)`, `color: #fff`, `border-radius: 50%`, hover `rgba(0,0,0,0.75)`. Icon: chevron-left / chevron-right SVG (1.75 stroke, `currentColor`).
- ARIA labels: `"Previous event"` / `"Next event"`. Bound to keyboard `←` / `→` arrow keys when carousel root has focus.
- Disabled state at slide 1 / slide N? **No** — wrap-around is always on (loop infinite). Auto-advance behaves the same.

#### 3.6.5 Dot indicators

- Below the slide, centered row of dots — one per slide.
- Each dot: 8×8 circle, `border-radius: 50%`, resting `background: var(--color-text-muted)`, active `background: var(--color-primary)` + `transform: scale(1.25)`, hover (non-active) `background: var(--color-text)`.
- Each dot is a `<button aria-label="Go to slide {n}" aria-current={isActive}>`.
- `gap: 0.5rem` between dots, `margin-top: 0.875rem`.

#### 3.6.6 Empty fallback — `HeroStatTiles`

When `upcomingTop5` is empty (no scheduled events), render two stat tiles side-by-side:

```
+-------------------+   +-------------------+
|   {N} Members     |   |  {M} Past Events  |
|   in the community|   |  hosted across NA |
+-------------------+   +-------------------+
```

- Each tile: `padding: 1.5rem`, `border-radius: 14px`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `text-align: center`.
- Number: `font-size: clamp(2rem, 4.5vw, 3rem)`, `font-weight: 800`, `color: var(--color-primary)`.
- Label: `font-size: 0.9375rem`, `color: var(--color-text-muted)`, `margin: 0.5rem 0 0`.
- Mobile (<540px): tiles stack vertically. Desktop: side-by-side via `display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;`.
- Counts: `members.length` from `members.json`, past-events count from `events.json` (`event.date < now`). Both computed at render — no async.

#### 3.6.7 Carousel logic — `src/lib/carousel.js`

Pure module, no React. Architect can decide the API; Designer recommends:

```
carousel(items, { intervalMs, onTick }) → { start, stop, prev, next, goTo, getCurrent }
```

- Pure-JS state machine, testable in isolation.
- Edge: `items.length === 0` → all methods are no-ops; `getCurrent()` returns `null`.
- Edge: `items.length === 1` → no auto-advance even with start (would re-emit same index — wasteful). `prev`/`next` are also no-ops.
- Edge: `intervalMs <= 0` → start is a no-op (don't tick).

Per-coverage tier: this file is pure logic, ≥80% per-file (line + branch + function + statement).

---

## 4. Footer rewrite — 3-column with social row + tri-lingual brand line

### 4.1 Layout

```
+--------------------+--------------------+--------------------+
|    Quick Links     |     Communities    |   About & Legal    |
|                    |                    |                    |
|  Home              |  [discord pill]    |  Mission           |
|  News              |  [qq pill]         |  FAQ               |
|  Events            |  [xhs pill]        |  Code of Conduct   |
|  Members           |  [x pill]          |  Disclaimer        |
|  About             |  [wechat pill]     |                    |
+--------------------+--------------------+--------------------+
                                                                
バンドリ北米華人コミュニティ · 北美炸梦同好会 · BanG Dream North America Chinese Community

                  © 2026 — Fan community. Not affiliated with Bushiroad or Craft Egg.
```

### 4.2 Container

- `<footer class="footer">`, full-width.
- Inner: `max-width: 1280px`, `margin-inline: auto`, `padding: 4rem 2rem 2.5rem` desktop, `3rem 1.5rem 2rem` mobile.
- `border-top: 1px solid var(--color-border)`.
- Background: `background: color-mix(in srgb, var(--color-bg) 96%, var(--color-primary) 4%)` — extremely subtle theme tint at the page bottom, signals "we know what theme you're in" without competing with content. Falls back to `var(--color-bg)` if `color-mix` unsupported.

### 4.3 Three columns

- `display: grid`, `grid-template-columns: repeat(3, 1fr)` desktop, `gap: 2.5rem`.
- Tablet (768–1023px): `repeat(2, 1fr)` with the 3rd column wrapping below; `gap: 2rem`.
- Mobile (<768px): single column, `gap: 2rem`.
- Each column:
  - Heading: `<h3>`, `font-size: 0.875rem`, `font-weight: 700`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: var(--color-text)`, `margin: 0 0 1rem`. Heading text comes from `i18n.json` (`footer.quickLinks`, `footer.communities`, `footer.aboutLegal`).
  - List: `<ul>` with `list-style: none`, `padding: 0`, `margin: 0`. Each item: `<li>` with `margin-bottom: 0.625rem`.
  - Link inside item: `font-size: 0.9375rem`, `color: var(--color-text-muted)`, hover `color: var(--color-primary)`, `text-decoration: none`, focus visible `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`.

### 4.4 Column 1 — Quick Links

Internal nav reflecting the 5 tabs. Routes via `<Link>` (no full reload).

```
Home   → /
News   → /news
Events → /events
Members → /members
About  → /about
```

Labels translate via `i18n.json` (same keys as Navbar §2.3).

### 4.5 Column 2 — Communities (5 PlatformIcon pills)

Renders one pill per entry in `social.json`. PlatformIcon visual spec in §5. Order matches `social.json` array order (Discord, QQ, Xiaohongshu, X, Wechat per current data).

### 4.6 Column 3 — About & Legal

```
Mission              → /about (anchors to #mission)
FAQ                  → /about#faq
Code of Conduct      → /about#coc
Disclaimer           → /about#disclaimer
```

Links use anchor scroll (`scroll-margin-top: 64px` on the targets so sticky navbar doesn't cover them).

The "Disclaimer" entry hosts the detailed not-affiliated language; the bottom copyright row keeps the short disclaimer for visitors who don't click through.

### 4.7 Tri-lingual brand line (below the columns, above copyright)

```html
<p class="footer-brand-tri">
  <span lang="ja">バンドリ北米華人コミュニティ</span>
  <span class="footer-brand-sep" aria-hidden="true">·</span>
  <span lang="zh">北美炸梦同好会</span>
  <span class="footer-brand-sep" aria-hidden="true">·</span>
  <span lang="en">BanG Dream North America Chinese Community</span>
</p>
```

- `font-size: 0.8125rem`, `color: var(--color-text-muted)`, `text-align: center`, `margin: 2.5rem 0 0.5rem`, `letter-spacing: 0.02em`.
- Each `<span>` carries `lang` for screen-reader pronunciation correctness (matches Hero §3.2).
- Separator dots are `aria-hidden` and decorative.
- Wraps gracefully on narrow viewports — at <540px, drops to vertical stack via `display: flex; flex-direction: column;` so each language is on its own line; the separator dots are `display: none` in this state.
- This block is **never** swapped by the LangToggle — all three are constants.

### 4.8 Copyright row

```
© 2026 — Fan community. Not affiliated with Bushiroad or Craft Egg.
```

- `<p class="footer-copy">`, `font-size: 0.8125rem`, `color: var(--color-text-muted)`, `text-align: center`, `margin: 0`.
- Year: dynamic from `new Date().getFullYear()` (existing pattern).
- "Fan community. Not affiliated with..." part translatable via `footer.disclaimer` key.

---

## 5. PlatformIcon — 5 SVG icons + states

### 5.1 Data contract — `src/data/social.json`

Exactly per the approved plan §"Social platforms":

```jsonc
[
  { "platform": "discord",     "label": "Discord",       "url": "https://discord.gg/WfMBKaW8Br", "qrImage": null,                "enabled": true },
  { "platform": "qq",          "label": "QQ群",           "url": "",                              "qrImage": "/social/qq-qr.png", "enabled": false },
  { "platform": "xiaohongshu", "label": "小红书",         "url": "",                              "qrImage": null,                "enabled": false },
  { "platform": "x",           "label": "X (Twitter)",    "url": "",                              "qrImage": null,                "enabled": false },
  { "platform": "wechat",      "label": "微信",           "url": "",                              "qrImage": null,                "enabled": false }
]
```

### 5.2 Three rendering states

| State | Detect | Renders as | Click action |
|---|---|---|---|
| Active link | `enabled: true` AND `url` starts with `https://` (with the same Discord rule from Phase 1 §4 for `discord.gg` / `discord.com/invite`) | `<a target="_blank" rel="noopener noreferrer">` | Opens external URL in new tab |
| QR-only | `enabled: true` AND `url` falsy AND `qrImage` truthy | `<button>` | Opens QR popover (§5.5) |
| Disabled | `enabled: false` OR (no `url` AND no `qrImage`) | `<button disabled aria-disabled="true">` | No-op; tooltip "Coming soon" |

### 5.3 Pill style (all states)

- `display: inline-flex`, `align-items: center`, `gap: 0.5rem`, `padding: 0.5rem 0.875rem`, `border-radius: 999px`, `font-size: 0.875rem`, `font-weight: 600`, `border: 1px solid var(--color-border)`.
- Fixed height `36px` so all 5 pills align in the column visually.
- Icon: 18×18 inline SVG (1.75 stroke or solid fill case-by-case), `flex-shrink: 0`.
- Label: the platform's `label` field (e.g. `"Discord"`, `"QQ群"`).

### 5.4 Per-state visual diff

| | Background | Text | Border | Cursor | Icon opacity |
|---|---|---|---|---|---|
| Active link (resting) | `transparent` | `var(--color-text)` | `var(--color-border)` | `pointer` | `1.0` |
| Active link (hover) | `var(--color-bg-card)` | `var(--color-text)` | `var(--color-primary)` | `pointer` | `1.0` |
| Active link (focus) | resting + `outline: 2px solid var(--color-primary); outline-offset: 2px` |
| QR-only (resting) | `transparent` | `var(--color-text)` | `var(--color-border)` | `pointer` | `1.0` |
| QR-only (hover) | `rgba(255,255,255,0.04)` | `var(--color-text)` | `var(--color-primary)` | `pointer` | `1.0` |
| Disabled | `transparent` | `var(--color-text-muted)` | `var(--color-border)` (1px dashed) | `not-allowed` | `0.5` |

Discord active is the only entry currently — it gets the same treatment as any active link except the icon is the official Discord glyph (existing `<DiscordIcon />` component reused).

### 5.5 QR popover (for QR-only state)

- Triggered by click on the QR-only pill.
- Position: anchored to pill, opens `top: calc(100% + 8px)`, `left: 0` (right-shifted if it would overflow viewport).
- Box: `padding: 1rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 12px`, `box-shadow: 0 12px 32px rgba(0,0,0,0.5)`, max-width `min(280px, calc(100vw - 32px))`.
- Content: `<img src={qrImage} alt="{label} QR code" width="200" height="200" />` + caption `<p>"Scan with the {label} app"</p>` (translatable via `social.scanCaption` template).
- Dismiss: ESC, click outside, or tap pill again.
- ARIA: trigger gets `aria-haspopup="dialog"`, `aria-expanded={isOpen}`. Popover gets `role="dialog"`, `aria-label="{label} QR code"`. Focus moves into popover on open, returns to trigger on close.
- Animation: same as ThemeSwitcher popover (Phase 1 §3) — 180ms ease-out scale-in.
- `prefers-reduced-motion: reduce`: instant show/hide.

### 5.6 Disabled tooltip

- `title="Coming soon"` (English) — translatable via `social.comingSoon`.
- ZH variant: `"敬请期待"`.
- Don't render a CSS-only pseudo-element tooltip — native `title` is keyboard-friendly enough, and Phase 5 doesn't ship a custom tooltip primitive.

### 5.7 Icons (5 inline SVGs)

Developer embeds path data inline (no icon-font dep, mirrors Phase 1 DiscordIcon pattern).

| Platform | Icon shape | Reference |
|---|---|---|
| `discord` | Existing `<DiscordIcon>` (Phase 1) | unchanged |
| `qq` | Penguin silhouette (community-recognizable QQ glyph) | Tencent's icon shape — abstracted to a non-trademark stylized penguin |
| `xiaohongshu` | "小红书" wordmark stylized as `小红书` simplified, OR a small note-with-star outline. Designer picks the **note + heart** (rounded square with a small heart inside) — abstract enough to avoid trademark, immediately reads as "lifestyle/notes app" |
| `x` | The classic X / cross monogram (post-Twitter rebrand) | currentColor solid fill |
| `wechat` | Speech-bubble with two dots (the WeChat logo abstraction — bubble + dots is generic enough that it doesn't read as Tencent's specific mark) | 1.75 stroke |

All icons inherit `currentColor` so they tint with text color (resting muted, hover full strength, disabled muted).

### 5.8 Edge cases

- `social.json` is empty array → render the column heading only, no pills, with a single muted line: `"Communities coming soon — check back."` (`empty-state.communities` i18n key).
- A pill has both `url` and `qrImage`: prefer the URL (active link state), QR is ignored. Document this in `social.json` schema comments.
- Image at `qrImage` path 404s: popover shows a neutral fallback `"QR not available"` placeholder + caption with the label so the user knows which platform errored.
- `enabled: true` but `url` is malformed (not `https://` or fails Discord-only rule for the discord platform): falls through to disabled state. Validator (build-time only) flags.
- QR popover open when user navigates away (route change): popover should auto-close — Architect attaches a route-change listener or uses `useEffect` on `pathname` to close.

---

## 6. EventSidebar — vertical filter sidebar

Replaces `EventFilter` (the horizontal chip toolbar from Phase 2) as the **default** for the Events page. EventFilter component is kept in the codebase for backward-compat only and is no longer rendered by `<Events />`.

### 6.1 Layout (desktop ≥1024px)

```
+-----------+  +----------------------------+
| Sidebar   |  |  Main content              |
| (sticky)  |  |  Section: Upcoming         |
|           |  |    EventCard               |
| Category  |  |    EventCard               |
| Band      |  |    EventCard               |
| Date      |  |  Section: Past             |
| Search    |  |    ...                     |
+-----------+  +----------------------------+
```

- Page-level grid: `display: grid`, `grid-template-columns: 240px 1fr`, `gap: 2.5rem`, `max-width: 1280px`, `margin-inline: auto`.
- Sidebar: `position: sticky`, `top: 88px` (clears sticky navbar 64px + breathing room 24px), `align-self: start`, `max-height: calc(100vh - 88px - 1rem)`, `overflow-y: auto`.
- Sidebar internal padding: `1.25rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 14px`.

### 6.2 Sidebar sections (each `<fieldset>`)

Each section: `<fieldset>` + `<legend>` (uppercase small caps `0.75rem`, weight 700, letter-spacing 0.08em, color `var(--color-text)`, margin-bottom `0.75rem`). Sections separated by `1.25rem` vertical gap.

#### 6.2.1 Category — multi-select chips

- Five chips: `All`, `Concerts`, `Fan Meets`, `Conventions`, `Online`.
- Same chip visuals as Phase 2 §4.2 (resting transparent + border, active `--color-primary` fill, white-ish foreground).
- Wrap: `flex-wrap: wrap`, `gap: 0.375rem`. At sidebar 240px width, two columns of chips.
- Behavior: matches Phase 2 §4.1 — `All` is mutually exclusive with the other four; deselecting last specific chip re-activates `All`.

#### 6.2.2 Band — multi-select chips with band swatch

- Eight chips: `All` + 7 bands (mirrors MemberFilter §4.4 from Phase 3).
- Same visual style + the band's primary color as a 10×10 swatch dot left of the label (Phase 3 §4.4 pattern).
- Active ring: `box-shadow: 0 0 0 2px var(--color-primary)` — current page theme, NOT the band's theme. Consistent with MemberFilter behavior.
- Wrap: 2 chips per row at sidebar width.

#### 6.2.3 Date range — from/to native date inputs

```
From  [2026-05-01]
To    [2026-12-31]
```

- Two `<input type="date">` controls, stacked vertically with `gap: 0.5rem`.
- Each: `width: 100%`, `padding: 0.5rem 0.625rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`, `color: var(--color-text)`, `font-size: 0.875rem`, `color-scheme: dark` (so the native date picker stays dark-themed in browsers that support it).
- Label: `<label>` with text `"From"` / `"To"` (translatable as `filter.dateFrom`, `filter.dateTo`), `font-size: 0.75rem`, weight 600, `color: var(--color-text-muted)`, `margin-bottom: 0.25rem`.
- Behavior: filters `event.date` (or `endDate` if present) is in the inclusive range `[from, to]`. Either bound empty = unbounded on that side.
- Edge: `from > to` — apply both anyway; the result will be empty and the inline empty state explains. No client-side correction (preserves user input).

#### 6.2.4 Keyword search

- `<input type="search">` matching MemberFilter §4.2 pattern (debounced 200ms before applying).
- Placeholder: `"Title, venue, band…"` (`filter.searchPlaceholder`).
- Width 100%, same input style as date inputs.
- Match: case-insensitive substring on `event.title`, `event.location.venue`, `event.location.city`, joined `event.bands` array. No regex.

### 6.3 Filter combination semantics

Same as Phase 2 §4 + Phase 3 §4.5:
- All four sections AND-ed.
- Within Category: OR across selected types (or all if `All`).
- Within Band: OR across selected bands. Events without a `bands` array are excluded as soon as a specific band chip is on (matches Phase 3 logic for members without `oshi`).
- Date range: AND with the other filters.
- Search: OR across the three string fields, AND with the other facets.

### 6.4 Reset

A small "Clear filters" button at the bottom of the sidebar, visible only when ≥1 filter is non-default. Same style as Phase 3 §4.6 (underline-text, muted).

### 6.5 Result count

Inline below the search input: `"{N} upcoming · {M} past"` (`filter.resultCount` template), `font-size: 0.8125rem`, `color: var(--color-text-muted)`. Updates live as filters change.

### 6.6 Mobile collapse (<1024px)

Sidebar transforms into a collapsible drawer.

- At <1024px the page-level grid collapses to single column.
- Sidebar becomes a button at the top of the events content area:
  - `<button class="sidebar-toggle">Filters {N active}</button>` — full width, `padding: 0.75rem`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `background: var(--color-bg-card)`, `display: flex`, `align-items: center`, `gap: 0.5rem`, `font-weight: 600`.
  - Icon: 18×18 filter glyph (3 horizontal lines with circles, decreasing in length — funnel shape).
  - Active count badge if ≥1 filter is non-default: `background: var(--color-primary)`, `color: var(--color-on-primary)`, pill shape, `padding: 0.125rem 0.5rem`, `font-size: 0.75rem`.
- Click → expands the sidebar inline (height auto, animated `max-height` transition 220ms).
- Mobile sidebar layout: same fieldsets, but in a single column of full-width controls. Chips wrap freely.
- ESC closes the expanded sidebar; backdrop click does NOT (it's inline, not an overlay — clicking outside is just scrolling).

### 6.7 Mobile (<540px)

- Sidebar toggle stays at top of events content.
- Inside expanded sidebar: chip group is `flex-wrap: wrap` (not horizontally scrollable like Phase 2's mobile chip row — vertical sidebar layout has more room). Date inputs stack vertically. Search full-width.

### 6.8 Edge cases

- Sidebar height exceeds viewport (many bands + categories stacked): internal scroll within the sidebar, not the page (the `overflow-y: auto` + `max-height: calc(100vh - 88px - 1rem)` rule).
- User scrolls the page — sticky sidebar stays in place. On mobile the sidebar is inline, not sticky.
- `prefers-reduced-motion: reduce` — sidebar collapse/expand happens instantly (drop the `max-height` transition).

---

## 7. EventCalendar — month grid

Renders when `/events?view=calendar`. Default view is `list` (Phase 2 layout); user opts in via the toggle at the top of `<Events />`.

### 7.1 View toggle (above content)

```
[List] [Calendar]                                              {result count}
```

- Segmented control matching Phase 2 §4.3 (two buttons, shared border, active button gets `--color-primary` fill).
- ARIA: `role="tablist"`, each button `role="tab"`, `aria-selected={active}`, `aria-controls="events-content"`. Calendar/list panels share the content slot — only one visible at a time.
- URL sync via `?view=list|calendar` query param so deep links work and refresh preserves state.
- `view=list` is default (no query param == list). `view=calendar` shows the grid.

### 7.2 Calendar grid layout

```
+-----------------------------------------------------------+
| ‹ April 2026                                            › |   ← header row
+-----------------------------------------------------------+
| Sun | Mon | Tue | Wed | Thu | Fri | Sat |                 |   ← weekday header
+-----+-----+-----+-----+-----+-----+-----+
|     |     |     |  1  |  2  |  3  |  4  |
|     |     |     |     |     | •   |     |
+-----+-----+-----+-----+-----+-----+-----+
|  5  |  6  |  7  |  8  |  9  | 10  | 11  |
|     |     |  •  |     |     | ••  |     |
+-----+-----+-----+-----+-----+-----+-----+
| ...                                       |
+-----------------------------------------------------------+
| Today: April 14, 2026                                     |   ← optional today row
+-----------------------------------------------------------+
```

- Container: `display: grid`, `grid-template-columns: repeat(7, 1fr)`, `gap: 1px`, `background: var(--color-border)` (the gap renders as hairlines between cells via grid-gap-as-divider trick).
- Cells: `min-height: 96px` desktop / `72px` mobile, `background: var(--color-bg-card)`, `padding: 0.5rem`, `display: flex`, `flex-direction: column`, `gap: 0.25rem`.
- Day number: top-left, `font-size: 0.875rem`, `font-weight: 500`, `color: var(--color-text)`. Off-month days (the leading/trailing days from prev/next month): `color: var(--color-text-muted)`, `opacity: 0.5`.
- Today: day number gets `background: var(--color-primary)`, `color: var(--color-on-primary)`, `border-radius: 50%`, `width: 1.75rem`, `height: 1.75rem`, `display: inline-flex`, `align-items: center`, `justify-content: center`.

### 7.3 Event indicators (dots)

- For each event on a day, render one colored dot.
- Dot color: derived from `event.type`, mapping to:
  - `concert` → `var(--color-primary)`
  - `fanmeet` → `var(--color-accent)`
  - `con` → `color-mix(in srgb, var(--color-primary) 50%, var(--color-accent) 50%)`
  - `online` → `var(--color-text-muted)`
- Dot shape: 6×6 circle, `display: inline-block`, `border-radius: 50%`. Multiple events same day: dots in a horizontal row, max 4 dots; if >4 events, render `+N` text after the 4th dot (`font-size: 0.6875rem`, `color: var(--color-text-muted)`).
- Dot row: `display: flex`, `gap: 0.25rem`, `flex-wrap: nowrap` (overflow handled by `+N` indicator).

### 7.4 Click date to expand

When the user clicks a date with ≥1 event:

- Below the calendar grid, an expansion panel slides open showing the events for that day.
- Panel: `padding: 1.25rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-primary)`, `border-radius: 0 0 14px 14px` (top corners stay flat to attach to the cell visually; for Phase 5 simplicity the panel is below the entire grid, not anchored to the cell — anchored-to-cell is a Phase 6 polish).
- Content: heading `<h3>Events on {YYYY.MM.DD}</h3>`, then a list of compact EventCard variants (or just title + meta + type badge + a "View details ↗" button if `links[0]` exists).
- Compact card uses the existing `EventCard` rendering — no new component.
- The expansion panel replaces any previous expansion (only one open at a time).
- Click the same day again to collapse, or click another day to switch.

### 7.5 Month navigation

- Header row: `<button>‹</button> <h2>{Month YYYY}</h2> <button>›</button>` with `<h2>` showing e.g. "April 2026" (translatable via `Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })`).
- Buttons: 36×36, same circular style as carousel prev/next. ARIA labels `"Previous month"` / `"Next month"`.
- Keyboard: when calendar root has focus, ← → arrow keys move the focused day; ↑ ↓ move by 7 days; PgUp/PgDn move by month; Home/End move to first/last of month. (See §14.5 for the full key map.)

### 7.6 Empty months

- A month with zero events on any visible day: renders the calendar grid normally (still useful chronologically), but a small inline note appears below the month name: `"No events scheduled this month."` (`calendar.emptyMonth`), `font-size: 0.875rem`, `color: var(--color-text-muted)`, `margin-top: 0.5rem`.
- This is visible alongside the grid, not in place of it — visitors can still navigate to neighboring months easily.

### 7.7 Mobile (<768px)

- Calendar shrinks: `min-height` per cell drops to `64px`. Day number stays top-left.
- Dots reduce to `4×4` size, max 3 visible + `+N`.
- Weekday header row: abbreviates to single character (`S M T W T F S`) at <540px, two-letter (`Su Mo Tu We Th Fr Sa`) at 540–767px.

### 7.8 Edge cases

- DST transitions: month grid generation iterates by adding 1 day to the previous date — JS handles DST transparently for date-only operations. No manual DST math needed.
- Year boundaries (Dec → Jan, Jan → Dec): standard `Date.setMonth(d.getMonth() ± 1)` works including across years.
- Locale-driven first day of week: Phase 5 hard-codes Sunday-first (matches NA convention). Architect can add a future `firstDayOfWeek` config when a non-NA region requests Monday-first.
- Multi-day events: rendered as a dot on each day in `[event.date, event.endDate]` inclusive. The expanded-day panel shows the same event for each day; users see consistent info either way. Phase 6+ may render multi-day spans as horizontal bars; Phase 5 dots-only is acceptable.
- Month with 6 visual rows (e.g. when month starts on Saturday and has 31 days) renders `min-height` adjusted automatically by the grid. No special handling.
- `prefers-reduced-motion`: expansion panel slide-in animation collapses to instant fade.

### 7.9 Calendar logic — `src/lib/calendar.js` (Architect file naming TBD)

Pure module separating month-grid generation from React render:

```
buildMonthGrid(year, month) → Array<{ date: Date, isOffMonth: boolean }>  // 35 or 42 entries
eventsForDay(events, date) → Event[]  // filters events.json by date match (with endDate range)
nextMonth(year, month), prevMonth(year, month) → { year, month }
```

Per-coverage tier: ≥80% per-file. Edge tests: leap years, year boundaries, multi-day events, empty events list, invalid date inputs.

---

## 8. About page

Single-page composition. No tabs, no routes — anchor links scroll to sections.

### 8.1 Page hero — tri-lingual title prominent

```
<section class="about-hero">
  <p class="about-name-jp" lang="ja">バンドリ北米華人コミュニティ</p>
  <h1 class="about-name-zh" lang="zh">北美炸梦同好会</h1>
  <p class="about-name-en" lang="en">BanG Dream North America Chinese Community</p>
  <p class="about-tagline">{tagline from i18n.about.tagline}</p>
</section>
```

- Uses the same tri-lingual stack as Hero §3.2, but slightly smaller scale:
  - JP: `clamp(0.875rem, 1.4vw, 1rem)`
  - ZH H1: `clamp(2rem, 5vw, 3.5rem)`
  - EN: `clamp(0.9375rem, 1.8vw, 1.125rem)`
- `padding: 4rem 2rem 1.5rem`, `text-align: center`, `min-height: 0` (NOT full-viewport — content-page hero compactness, matches Phase 2 §2.1 + Phase 3 §2.2).
- `--gradient-hero` background at `0.06 opacity` (lower than Home `0.12`, lower than Events `0.08`) — page is content-first.

### 8.2 Page sections (anchored)

Five sections, each with an `<h2>` and an `id` for anchor scroll. `scroll-margin-top: 80px` on each `<h2>` to clear the sticky navbar.

```
#mission     → Mission
#history     → History
#faq         → FAQ
#join        → How to Join
#coc         → Code of Conduct
#disclaimer  → Disclaimer (legal)
```

### 8.3 Mission, History, How to Join — plain text sections

- Each: `<section>` with `<h2>` + paragraph(s).
- `<h2>` style: matches Phase 2 §2.2 (`clamp(1.75rem, 4vw, 2.5rem)`, weight 800, hairline `border-bottom: 1px solid var(--color-border)`, `padding-bottom: 0.75rem`, `margin-bottom: 1.5rem`).
- Body: `font-size: 1rem`, `line-height: 1.7`, `color: var(--color-text)`, `max-width: 720px`. Paragraphs gap `1rem`.
- Content sourced from `about.json` — `mission`, `history`, `joinInstructions` fields. Each is a single string (markdown subset per Phase 2 §1.4 — bold, italic, inline links, line breaks). Stored as authored; LangToggle does NOT swap content.

### 8.4 FAQ — accordion

- `<section id="faq">` with `<h2>FAQ</h2>` then a list of accordion items.
- Each item: `<details>` element (native HTML disclosure), `summary` is the question, body is the answer.
- Why native `<details>`: zero JS, accessible by default, keyboard works out of the box (Enter/Space toggle).
- Visual:
  - `<details>` container: `border: 1px solid var(--color-border)`, `border-radius: 10px`, `background: var(--color-bg-card)`, `margin-bottom: 0.625rem`.
  - `<summary>`: `padding: 1rem 1.25rem`, `font-weight: 600`, `font-size: 1rem`, `color: var(--color-text)`, `cursor: pointer`, `list-style: none` (suppress native marker), `display: flex`, `align-items: center`, `gap: 0.75rem`, `justify-content: space-between`. Custom chevron SVG on the right rotates 90° when `[open]`.
  - Body: `padding: 0 1.25rem 1.25rem`, `font-size: 0.9375rem`, `color: var(--color-text-muted)`, `line-height: 1.6`.
  - Open state: `border-color: var(--color-primary)`, summary `color: var(--color-primary)`.
- Data: `about.json` has `faq: [{ q, a }]` array. Empty array → render the `<h2>FAQ</h2>` heading + a muted `"FAQ coming soon."` line.
- Anchor deep-link to a specific FAQ item: `/about#faq-{n}` or `#faq-{slug-of-question}`. Scrolling to it should auto-open the `<details>`. Implement via a `useEffect` reading `window.location.hash` on mount → `details.open = true`.

### 8.5 Code of Conduct — collapsible

- Same `<details>` pattern as FAQ but a single item. The COC is long; visitors who want it expand it explicitly.
- Summary: `"Code of Conduct"` (translatable as `about.coc.summary`).
- Body: full COC text from `about.json.coc`. Pre-formatted markdown subset (paragraphs, bullet lists if Phase 6+ schema permits). Phase 5 stores it as a single string with `\n\n` paragraph breaks rendered as `<p>` blocks.
- If `about.json.coc` is empty/missing: render the section as `<details>` with summary "Code of Conduct" and body `"COC pending."` so the section anchor `#coc` still works.

### 8.6 Disclaimer — visible (not collapsed)

- Always visible at the bottom of the About page.
- Heading `<h2>Disclaimer</h2>`.
- Body: `"Fan community. Not affiliated with Bushiroad, Craft Egg, or any official BanG Dream! rights holders. All band names, character likenesses, and trademarks remain the property of their respective owners."` (translatable as `about.disclaimer.body`).

### 8.7 Page outer layout

- `<main class="about-page">`, `max-width: 800px`, `margin-inline: auto`, `padding: 0 2rem 4rem`.
- Sections vertically stack with `gap: 3rem`.
- Mobile (<540px): `padding: 0 1rem 3rem`, `gap: 2.5rem`.

### 8.8 Edge cases

- `about.json` missing entirely (build error scenario): page renders just the tri-lingual hero + disclaimer; no sections in between. Use the same defensive-renderer pattern as Phase 2 (don't blow up the page).
- FAQ list with one entry: no special handling, single `<details>` renders normally.
- Hash-link to closed FAQ on page load: open it (covered §8.4).
- COC very long: scrollable within page (no internal `overflow` — the browser scrolls). The `<details>` body grows to its content height.

---

## 9. LangToggle — UI chrome only

### 9.1 Visual

- Pill switch with two segments: `中` and `EN`.
- Container: `display: inline-flex`, `border: 1px solid var(--color-border)`, `border-radius: 999px`, `padding: 0.125rem`, `background: var(--color-bg-card)`, `font-size: 0.8125rem`, `font-weight: 700`, `letter-spacing: 0.05em`.
- Each segment: `<button>`, `padding: 0.375rem 0.75rem`, `border-radius: 999px`, `background: transparent`, `color: var(--color-text-muted)`, `border: none`, `cursor: pointer`, `transition: background 150ms, color 150ms`.
- Active segment (`aria-pressed="true"`): `background: var(--color-primary)`, `color: var(--color-on-primary)`.
- Hover (non-active): `color: var(--color-text)`.
- Focus visible: `outline: 2px solid var(--color-primary); outline-offset: 2px` on the container OR each button — Architect picks one.

### 9.2 Behavior

- Click `中` → set UI language to `zh`, persist `localStorage["bangdream-na:uiLanguage"] = "zh"`.
- Click `EN` → set to `en`, persist `localStorage["bangdream-na:uiLanguage"] = "en"`.
- Default if no stored value: read `navigator.language` — if it starts with `"zh"` (incl. `zh-CN`, `zh-TW`, `zh-HK`), default to `zh`; otherwise `en`.
- localStorage failure (Safari private mode etc.): silent fallback to in-memory state, same pattern as ThemeContext from Phase 1 §3.

### 9.3 ARIA

- Container: `role="group"`, `aria-label="UI language"`.
- Each button: `aria-pressed={isActive}`, `lang="zh"` on the `中` button, `lang="en"` on the `EN` button.
- Tooltip on container (`title`): `"UI language / 界面语言"` (bilingual literal — both visible to assistive tech regardless of current setting). This name aligns with `feedback_no_smart_quotes.md` and the plan's naming clarification §"uiLanguage in code/UI/storage".

### 9.4 Scope — UI chrome only (~30 strings)

LangToggle changes ONLY these surfaces:

| Surface | Examples |
|---|---|
| Navbar links | `Home/首页`, `News/新闻`, `Events/活动`, `Members/成员`, `About/关于` |
| Footer headings | `Quick Links/快速导航`, `Communities/社区`, `About & Legal/关于与法律` |
| Footer links | `Mission/使命`, `FAQ/常见问题`, `Code of Conduct/行为准则`, `Disclaimer/免责声明`, plus copies of nav labels |
| Filter/sidebar legends | `Category/类别`, `Band/乐队`, `Date Range/日期范围`, `Search/搜索`, `From/起`, `To/止`, `Role/身份`, `Oshi band/推し乐队` |
| Filter/sidebar placeholders + hint | `Title, venue, band…/标题、场地、乐队…`, `Name or bio…/姓名或简介…`, `Filters {N} active/筛选 {N} 项` |
| Empty states | `"No upcoming events match — try clearing filters."/"暂无符合条件的即将到来活动 — 尝试清除筛选。"`, `"Members coming soon."/"成员即将上线。"`, `"No events yet."/"暂无活动。"`, `"Communities coming soon — check back."/"社区即将上线 — 敬请期待。"`, `"FAQ coming soon."/"常见问题即将上线。"`, `"COC pending."/"行为准则待定。"`, `"No events scheduled this month."/"本月暂无活动。"` |
| Button labels | `Clear filters/清除筛选`, `Coming soon/敬请期待`, `Get tickets/购票`, `Tickets/票务`, `View details/查看详情`, `Open navigation menu/打开菜单`, `Close menu/关闭菜单`, `Previous event/上一活动`, `Next event/下一活动`, `Previous month/上个月`, `Next month/下个月`, `Go to slide {n}/前往幻灯片 {n}`, `Today/今天` |
| Form/input labels | `Search/搜索`, `Filters/筛选` |
| ARIA labels for icon-only buttons | (covered above) |

Total: ~30 logical strings (some with parameterization). Stored in `i18n.json`:

```json
{
  "en": {
    "nav.home": "Home",
    "nav.news": "News",
    "nav.events": "Events",
    "nav.members": "Members",
    "nav.about": "About",
    "footer.quickLinks": "Quick Links",
    "footer.communities": "Communities",
    "footer.aboutLegal": "About & Legal",
    "footer.disclaimer": "Fan community. Not affiliated with Bushiroad or Craft Egg.",
    "filter.category": "Category",
    "filter.band": "Band",
    "filter.dateRange": "Date Range",
    "filter.dateFrom": "From",
    "filter.dateTo": "To",
    "filter.search": "Search",
    "filter.searchPlaceholder": "Title, venue, band…",
    "filter.searchPlaceholderMembers": "Name or bio…",
    "filter.role": "Role",
    "filter.oshiBand": "Oshi band",
    "filter.clear": "Clear filters",
    "filter.resultCount": "{N} upcoming · {M} past",
    "filter.toggleMobile": "Filters {N} active",
    "empty.noEventsMatch": "No upcoming events match — try clearing filters.",
    "empty.noPastEventsMatch": "No past events match — try clearing filters.",
    "empty.noEvents": "No events yet.",
    "empty.noMembers": "Members coming soon.",
    "empty.noCommunities": "Communities coming soon — check back.",
    "empty.noFaq": "FAQ coming soon.",
    "empty.noCoc": "COC pending.",
    "empty.calendarEmptyMonth": "No events scheduled this month.",
    "btn.tickets": "Tickets",
    "btn.viewDetails": "View details",
    "btn.openMenu": "Open navigation menu",
    "btn.closeMenu": "Close menu",
    "btn.prevEvent": "Previous event",
    "btn.nextEvent": "Next event",
    "btn.prevMonth": "Previous month",
    "btn.nextMonth": "Next month",
    "btn.goToSlide": "Go to slide {n}",
    "btn.today": "Today",
    "btn.comingSoon": "Coming soon",
    "social.scanCaption": "Scan with the {label} app",
    "calendar.viewList": "List",
    "calendar.viewCalendar": "Calendar",
    "lang.tooltip": "UI language / 界面语言"
  },
  "zh": { ... corresponding ZH translations ... }
}
```

ZH translations parallel — Designer ships authoritative translations alongside EN in the spec. (Architect/Developer copy these into `i18n.json` verbatim.)

### 9.5 Scope — what does NOT translate

The following are content (single-language as authored) and are NEVER swapped by LangToggle:

- Tri-lingual brand identity (Hero, About hero, Footer brand line) — the three names always render together.
- `site.json.tagline` — written once, in the language the author chose.
- Event titles, descriptions, locations from `events.json` — content.
- Member names, bios, oshi info from `members.json` — content.
- News article titles + bodies from `news.json` — content.
- About page mission / history / join / COC — content sourced from `about.json`.
- Type badges (`Concert`, `Fan Meet`, `Convention`, `Online`) — these are content terms and stable. (Architect could promote them to i18n in Phase 6; Phase 5 keeps them static EN to minimize translator load.)
- Role badges (`Member`, `Organizer`, `Performer`, `Alumnus`) — same reasoning.
- Brand wordmark `BD!NA` in navbar — language-neutral.
- Discord brand "Discord" wordmark — never localized.

### 9.6 Implementation — `src/lib/uiLanguage.js`

Pure module with subscribe pattern:

```
getUiLanguage() → 'en' | 'zh'
setUiLanguage(lang)
subscribe(listener) → unsubscribe
t(key, params?) → string  // shorthand for current-lang lookup
```

- `getUiLanguage()` reads localStorage with the navigator.language fallback.
- `setUiLanguage(lang)` writes localStorage + notifies subscribers.
- Subscribers are React components using a custom hook `useUiLanguage()` (or `useSyncExternalStore` — Architect picks).
- `t(key, params)` does the i18n lookup against `i18n.json[currentLang]`. Missing key → falls back to `i18n.json.en[key]`. Missing in EN too → returns the key literal (visible to surface translation gaps to QA, never to end users in production data).
- Param substitution: `t('filter.resultCount', { N: 12, M: 4 })` replaces `{N}` and `{M}` literals.

Per-coverage tier: pure logic ≥80% per-file. Edge tests: missing key, missing params, malformed lang, localStorage throws, default detection from navigator.language.

### 9.7 Edge cases

- LangToggle while on `/events?view=calendar`: state persists, calendar re-renders (the day labels e.g. `Sun/Mon/...` stay EN-only in Phase 5 — `Intl.DateTimeFormat` with default locale handles them; LangToggle doesn't influence date locale).
- LangToggle changes do NOT trigger a navigation/reload. Components subscribed via `useUiLanguage` re-render in place.
- Navigating to an anchored URL with FAQ open while uiLanguage is ZH: FAQ summary text appears in ZH only if FAQ data itself is bilingual — which it isn't (FAQ is content, see §9.5). LangToggle affects FAQ section heading (`<h2>FAQ/常见问题</h2>`) only, not item Q/A text.
- localStorage corrupt value (e.g. `"de"`) — `setUiLanguage` validates against `['en', 'zh']`; invalid → falls back to default detection.

---

## 10. MobileDrawer — slide-in nav

### 10.1 Trigger

The hamburger button in the navbar at <540px (per §2.5).

### 10.2 Visual

- Slides in from the **right edge**, full-height, width `min(320px, 90vw)`.
- Overlay backdrop: full-viewport, `background: rgba(0,0,0,0.55)`, `z-index: 200`, fade-in 200ms.
- Drawer panel: `z-index: 201`, `background: var(--color-bg-card)`, `border-left: 1px solid var(--color-border)`, `box-shadow: -8px 0 32px rgba(0,0,0,0.5)`, `padding: 1.5rem 1.25rem`, `display: flex`, `flex-direction: column`, `gap: 1rem`.
- Slide animation: `transform: translateX(100%)` → `translateX(0)` with `transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Close-X button: top-right of the drawer, 36×36, X icon (`✕` SVG, 1.75 stroke), ARIA label `"Close menu"`.

### 10.3 Drawer content (in order, top-to-bottom)

1. Close button (top-right anchored).
2. **Brand block**: small logo (24×24) + `BD!NA` wordmark, same as navbar but compact. Tooltip carries the full English name.
3. **Nav links** — vertical list, each link `padding: 0.875rem 0.75rem`, `border-radius: 8px`, `font-size: 1rem`, `font-weight: 500`. Active route gets `background: rgba(255,255,255,0.04)` + `color: var(--color-primary)` + 3px left border `border-left: 3px solid var(--color-primary)`. Tapping a link closes the drawer (after navigation finishes — wrap `onClick` to call `closeDrawer()`).
4. **Divider** — 1px hairline.
5. **LangToggle** — the same pill switch from §9, full-width inside drawer (let it expand naturally), with a small label above: `"Language / 语言"`, `font-size: 0.75rem`, weight 700, uppercase, color muted.
6. **ThemeSwitcher** — the same trigger button from Phase 1, but **inline expansion**: instead of opening a popover anchored to the trigger, in the drawer the trigger expands a collapsible block below it showing the 4×2 swatch grid directly. This adapts the popover pattern to a drawer-friendly layout.
7. **Discord pill** at the bottom — full-width inside drawer (`width: 100%`, `justify-content: center`).

### 10.4 Dismiss behavior

- ESC key → close. Returns focus to the hamburger trigger.
- Backdrop click → close.
- Tap the close-X button → close.
- Click on a nav link → navigate + close.
- Theme/lang toggle inside the drawer → DO NOT close (these are quick-config interactions).

### 10.5 Focus trap

While drawer is open:
- Body scroll is locked (`overflow: hidden` on `document.body`, restored on close).
- Tab navigation traps inside the drawer (Tab from last → first, Shift+Tab from first → last).
- On open: focus moves to the close-X button.
- On close: focus returns to the hamburger trigger.
- `inert` attribute on the rest of the document while drawer is open (modern way to prevent interaction with siblings; fallback to manual `tabindex="-1"` setting if `inert` unsupported, but `inert` has Safari 15.5+ support so Phase 5 ships it).

### 10.6 ARIA

- Drawer container: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="mobile-drawer-title"`, where `mobile-drawer-title` is the brand wordmark element.
- Backdrop: `aria-hidden="true"`.
- Hamburger trigger (in navbar): `aria-haspopup="dialog"`, `aria-expanded={isOpen}`, `aria-controls="mobile-drawer"`.

### 10.7 Edge cases

- User opens drawer, rotates device (portrait → landscape) crossing the 540px threshold: drawer auto-closes (the navbar layout re-renders with the inline links). Implement via `useEffect` watching the matchMedia query; if breakpoint passes, close the drawer.
- Slow/CPU-throttled device: the 220ms slide animation may stutter; we accept that visually and ensure the drawer never blocks user input during the transition (animation is on `transform` only, GPU-accelerated, doesn't interleave with React state).
- `prefers-reduced-motion: reduce` → drawer appears/disappears instantly (`transition: none`), backdrop still fades for visual continuity (50ms only).

---

## 11. `card-thumb-16-9` shared class

A single CSS utility class enforcing uniform 16:9 thumbnails on EventCard, NewsCard, MemberCard avatar fallback, HeroCarousel slide.

### 11.1 Definition (lives in `src/theme/themes.css` or a sibling `cards.css`)

```css
.card-thumb-16-9 {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: var(--color-border);
  display: block;
}

.card-thumb-16-9 > img,
.card-thumb-16-9 > picture > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  loading: lazy;
}
```

### 11.2 Usage rules

- Apply to the **wrapping element** of any thumbnail (not the `<img>` itself).
- The container reserves the 16:9 box even before the image loads — eliminates layout shift.
- Children other than `<img>` (e.g. letter-avatar gradient fallback) take the same box because they fill the absolute box of `.card-thumb-16-9`.
- Border-radius is `10px` by default; specific cards can override (e.g. HeroCarousel slide uses `14px` to match the card body radius — overridden via the parent class).

### 11.3 Where it applies (Phase 5)

| Component | Element | Notes |
|---|---|---|
| EventCard image cell | wrapping `<div>` | Existing 240×135 desktop / full-bleed mobile becomes `card-thumb-16-9` consistently |
| NewsCard image | wrapping `<div>` | New in §12 |
| MemberCard avatar fallback | the gradient initials block | Member avatars are 88×88 squares (1:1) by spec, but the gradient *fallback* uses the same `card-thumb-16-9` only at hero scale. **Reconsider**: actually, member avatars are 1:1 by Phase 3 spec — they should NOT use card-thumb-16-9. **Correction**: `card-thumb-16-9` does not apply to MemberCard. Limit to EventCard, NewsCard, HeroCarousel only. Phase 5 spec: enforce 16:9 only on those three. |
| HeroCarousel slide | the slide root | `border-radius` overridden to 14px |

(Updating the per-task brief: the brief said "MemberCard avatar fallback" but applying 16:9 to a square-cropped 88×88 avatar would distort. Designer's correction: **MemberCard stays 1:1**. The shared class targets the three thumbnail surfaces above. This correction lives here for Architect/Reviewer awareness.)

### 11.4 Edge cases

- `<img>` width/height attributes also set on the inner `<img>` (helps browsers reserve space pre-load even with intrinsic-aspect support).
- Image fails to load → letter-avatar fallback (Phase 2 §3.4 logic) takes the same box, fills via `position: absolute; inset: 0;` inside the wrapper.
- Decorative / non-loading thumbnails (gradient-only): same wrapper, no `<img>` inside; the gradient is a CSS background on a `<div>` filling the box.

---

## 12. Date format — site-wide `YYYY.MM.DD`

### 12.1 Helper — `src/lib/dateFormat.js`

```
formatDate(iso, options?) → string
formatDateTime(iso, options?) → string
formatDateRange(startIso, endIso?) → string
```

#### `formatDate(iso)`

Returns `YYYY.MM.DD` (zero-padded month/day) regardless of locale.

```
formatDate("2026-07-04")        → "2026.07.04"
formatDate("2026-07-04T19:00:00-07:00") → "2026.07.04"   // time component dropped
formatDate("2026-12-31")        → "2026.12.31"
```

Implementation: parse with `new Date(iso)`, then format via `Intl.DateTimeFormat("en-CA", { year: 'numeric', month: '2-digit', day: '2-digit' })` and replace the dashes with dots. (en-CA is the locale that natively gives ISO date order — clever shortcut.) Fallback: manual `${y}.${pad(m)}.${pad(d)}`.

#### `formatDateTime(iso)`

When the ISO had a time component, append the time:

```
formatDateTime("2026-07-04T19:00:00-07:00") → "2026.07.04 7:00 PM"   // local time of viewer
formatDateTime("2026-07-04")                → "2026.07.04"           // no time → no time portion
```

Time format is `h:mm A` via `Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })` so the user's locale picks 12h vs 24h. The display always sits AFTER the date with a space separator.

#### `formatDateRange(startIso, endIso)`

For multi-day events:

```
formatDateRange("2026-07-04", "2026-07-04") → "2026.07.04"  // collapse same-day
formatDateRange("2026-07-04", "2026-07-06") → "2026.07.04 – 2026.07.06"
formatDateRange("2026-12-30", "2027-01-02") → "2026.12.30 – 2027.01.02"
formatDateRange("2026-07-04", null)         → "2026.07.04"  // no end
```

### 12.2 Where applied

- EventCard meta row (replaces the locale `Intl.DateTimeFormat` weekday format from Phase 2).
- HeroCarousel slide.
- EventCalendar — implicitly via the day cell's day number (just `D`, not full date — `formatDate` not used here, but `Intl.DateTimeFormat` for month-name is).
- NewsCard date stamp.
- MemberCard "since" tooltip on cover-band ribbon (already format-flexible per Phase 3 §3.6 tooltip).

### 12.3 Migration note for Phase 2 EventCard

Phase 2 §3.3 used `Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })` ("Sat, Jul 4, 2026"). Phase 5 replaces this with `formatDate()` ("2026.07.04"). The migration is intentional and aligns with the bang-dream.com convention. Visual diff should be minimal — same row position, just compacter format.

### 12.4 Edge cases

- Invalid ISO string → return the original string verbatim (so authors see the broken value rendered, not silently hidden). No exceptions thrown.
- Date in distant past (year < 1970) → still formats correctly via `Intl.DateTimeFormat`.
- Missing date entirely → caller should not invoke; document the precondition.
- Timezone: `formatDate` is timezone-naive in the sense that it just slices the ISO date portion. `formatDateTime` uses the viewer's local timezone, which can produce off-by-a-day from the venue timezone (Phase 2 §1.3 documented this drift). Acceptable for fan-community scale.

Per-coverage tier: pure logic ≥80% per-file. Edge tests cover all ISO shapes above + invalid input.

---

## 13. Tri-lingual typography — JP / ZH / EN coexistence

### 13.1 Font stack

System-only fonts (no web font dependency, matches Phase 1 §6):

```css
font-family:
  system-ui,
  -apple-system,
  "Segoe UI",
  "PingFang SC",          /* Apple ZH default */
  "Hiragino Sans GB",     /* legacy Apple ZH */
  "Microsoft YaHei",      /* Windows ZH */
  "Noto Sans CJK SC",     /* Linux/Android ZH */
  "Hiragino Kaku Gothic ProN",  /* Apple JP */
  "Meiryo",               /* Windows JP */
  "Helvetica Neue",
  Arial,
  sans-serif;
```

Each browser walks the stack until it finds a glyph that supports the codepoint. CJK glyphs come from CJK fonts even when Latin is inheriting `system-ui` — the cascade is per-glyph at this level.

### 13.2 Per-script line-height + letter-spacing

| Script | Optimal line-height | Optimal letter-spacing | Rationale |
|---|---|---|---|
| JP (kana + kanji) | `1.4` | `0.05em` to `0.15em` (tracked-out) | Japanese typography prefers slightly tracked-out kana for elegance; smaller body sizes benefit more |
| ZH (simplified Chinese) | `1.05` to `1.2` | `-0.02em` to `0` | Hanzi are square — no need for tracking; tighter line-height because the characters are baseline-centered, not descender-heavy |
| EN | `1.3` to `1.7` (body) | `0` to `-0.5px` (display only) | Standard Latin — line-height varies by content density |

Phase 5 specifies these at the elements where the tri-lingual stack appears (Hero §3.2, About §8.1, Footer §4.7). Other places in the site use single-script content and inherit from default (line-height 1.7 body, 1.1-1.5 headings).

### 13.3 Weight contrast

When the three scripts coexist (Hero, About hero, Footer brand line), use weight to differentiate:

- JP top: 400 — quiet sister
- ZH H1: 800 — focal anchor
- EN below: 500 — reading-weight, lower than ZH but readable as identity

This weight contrast carries the hierarchy that the size contrast alone wouldn't fully sell, especially in the Footer where all three lines render at similar small sizes.

### 13.4 Vertical baseline interplay

When the three scripts stack, the visual baseline of CJK is slightly higher than Latin (CJK glyphs are "centered" in their box rather than baseline-aligned). To compensate:

- Add `padding-top: 0.0625em` to the EN line below the ZH H1 in the stacked Hero/About-hero layout. This adjusts the EN baseline to look optically aligned with the ZH glyphs above.
- Don't apply this in the Footer brand line where the three are inline (the inline-flex `align-items: baseline` handles itself adequately at small sizes).

### 13.5 Fallback when a name is missing/empty

The Hero, About hero, and Footer brand line MUST handle the case where one or two of the three names are missing in `site.json` (defensive — prevents the page from crashing if an admin edits down to one). Behavior:

- All three present (default): stack as specified.
- ZH missing: render JP and EN; the JP line stays small at top, EN promotes to `<h1>` with the ZH H1 size. Keep `lang` attributes.
- JP missing: render ZH H1 + EN below.
- EN missing: render JP + ZH H1.
- Only one present: render as `<h1>` at the canonical hero size.
- All three missing: render a fallback `<h1>BanG Dream NA</h1>` (last-resort short brand) so the page never has zero brand identity.

The defensive renderer should NOT throw and should NOT shift layout — if the JP top line is missing, the ZH H1 just doesn't have anything above it (no empty box).

### 13.6 Mobile (<540px)

- All three lines remain stacked. Sizes already use `clamp()` so they down-scale gracefully.
- Footer brand line goes vertical (already documented §4.7).
- About hero stays compact — no special handling.

---

## 14. Accessibility

### 14.1 WCAG AA across all 8 themes

All Phase 5 chrome (navbar, footer, sidebars, calendar, news cards, hero stacks, drawer) consumes existing tokens that Phase 1/2 already verified. No new hex literals introduced. Reviewer confirms by:

- Cycling all 8 themes on `/`, `/news`, `/events`, `/events?view=calendar`, `/members`, `/about`.
- Checking text color pairs against background pairs on each chrome surface.

Specific Phase 5 attention points:
- Sticky navbar with `backdrop-filter` may render slightly differently across browsers — manually verify text remains AA against the partially-transparent background. If contrast wobbles in any theme, increase the bg `color-mix` percentage (88% → 92%).
- `card-thumb-16-9` placeholder color (`var(--color-border)`) on a slow-loading image must not display text without sufficient contrast. The slide title overlay handles its own contrast via the bottom gradient (§3.6).
- LangToggle active segment: foreground `var(--color-on-primary)` is theme-aware (Phase 2 §3 token addition) — verify HHW (`--color-on-primary` is dark) works.

### 14.2 Focus visible

Every interactive element gets a visible focus ring. Defaults:
- Pills/chips/segments: `outline: 2px solid var(--color-primary); outline-offset: 2px`
- Buttons (icon-only): same
- Links: same; `border-radius` of the focus outline matches the element's `border-radius`
- Form inputs: `outline: 2px solid var(--color-primary); outline-offset: 0; border-color: transparent` (outline replaces the border visually)
- Calendar day cells: `outline: 2px solid var(--color-primary); outline-offset: -2px` (inset because cells abut)

### 14.3 Hero heading semantics

- `<h1>` lives on the ZH name line in Hero §3.2 and About §8.1 — single H1 per page, canonical Chinese community name.
- `<p lang="ja">` and `<p lang="en">` for sister lines — paragraphs (not headings) so screen readers don't announce them as section heads.
- Each tri-lingual span has the appropriate `lang` attribute so screen readers switch pronunciation engines.
- Footer brand spans similarly use `lang` per language (§4.7).

### 14.4 LangToggle aria-pressed + aria-label

- Container: `role="group"`, `aria-label="UI language"` (§9.3).
- Each segment: `aria-pressed={isActive}`. Screen reader announces "中, pressed" or "EN, not pressed".
- Tooltip on container: bilingual `"UI language / 界面语言"`.

### 14.5 EventCalendar keyboard navigation

When the calendar root has focus (or a day cell is focused):

| Key | Action |
|---|---|
| ← (Left arrow) | Previous day (focus moves; if crosses month boundary, calendar advances to prev month) |
| → (Right arrow) | Next day |
| ↑ (Up arrow) | Same weekday, previous week |
| ↓ (Down arrow) | Same weekday, next week |
| Home | First day of focused week |
| End | Last day of focused week |
| PgUp | Previous month |
| PgDn | Next month |
| Enter / Space | Open/close the day expansion panel |
| Tab | Exit calendar grid (moves to next focusable element) |

Implementation: roving tabindex pattern — only the focused day has `tabindex="0"`, others `tabindex="-1"`. Arrow keys re-assign tabindex.

### 14.6 MobileDrawer focus trap

Per §10.5 — Tab/Shift+Tab cycle within the drawer; focus returns to the hamburger trigger on close.

### 14.7 Reduced motion summary

| Component | Default | Reduced motion |
|---|---|---|
| HeroCarousel | Auto-advance 6s, slide fade transition | No auto-advance; manual nav only; instant slide change |
| MobileDrawer | 220ms slide-in | Instant appear; backdrop fades 50ms only |
| QR popover | 180ms scale-in | Instant show |
| FAQ accordion | (native `<details>`, no animation) | unchanged |
| Calendar day expansion panel | 200ms height transition | Instant |
| Card hover lift | 200ms transform | Drop transform; border + shadow still apply |
| LangToggle / chip / segment hover | 150ms color/bg transitions | unchanged (sub-200ms transitions are acceptable for crossfades) |

### 14.8 Live regions

- Filter result counts (Events sidebar, News sidebar, Members FilterBar): wrap in `<div role="status" aria-live="polite">` so screen readers announce "12 upcoming · 4 past" updates as filters change.
- HeroCarousel auto-advance does NOT use `aria-live` — would produce too much chatter. Manual nav is keyboard-accessible.
- LangToggle change does NOT need a live region — the visible UI re-rendering speaks for itself; a `aria-live` announcement of "Language changed to English" would be redundant.

### 14.9 Skip link

Add a "Skip to main content" link as the very first focusable element on the page. Hidden visually until focused; on focus, slides into top-left at high contrast.

```css
.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 6px;
  z-index: 1000;
  transition: top 150ms;
}
.skip-link:focus {
  top: 1rem;
  outline: 2px solid var(--color-text);
}
```

Target `#main` — `<main id="main">` on each page.

---

## 15. News page

### 15.1 Page layout

Mirrors Events layout (sidebar + main content), reusing the same grid.

```
+-----------+  +----------------------------+
| NewsSidebar| |  Main content              |
| (sticky)  |  |  Hero compact              |
|           |  |  NewsList                  |
| Category  |  |    NewsCard                |
| Date      |  |    NewsCard                |
| Search    |  |    ...                     |
+-----------+  +----------------------------+
```

### 15.2 Page hero (compact)

- Same shape as Events hero (Phase 2 §2.1) — `min-height: 240px`, 0.08 gradient, `<h1>News</h1>` + subtitle.
- Subtitle: `"Announcements, recaps, and updates from the community."` (`news.subtitle` i18n key).

### 15.3 NewsCard

Each news item card.

```
+-------------------------------------------+
| [16:9 thumbnail]                          |
|                                           |
+-------------------------------------------+
| 2026.04.29  ·  Announcement               |  ← date · category
| Title goes here, two lines max if long.   |  ← headline
+-------------------------------------------+
```

- Container: `<a class="news-card">`, vertical layout (image on top, content below).
- `padding: 0`, `border-radius: 14px`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `display: flex`, `flex-direction: column`, `overflow: hidden`, `text-decoration: none`, `color: inherit`.
- Image: `<div class="card-thumb-16-9">` per §11. `border-radius: 14px 14px 0 0`. If `image` field missing, gradient fallback (same letter-avatar behavior as Phase 2 §3.4 — first letter of `title` over `--gradient-hero`).
- Content block: `padding: 1rem 1.25rem 1.25rem`.
  - Meta row: date + dot + category.
    - Date: `font-size: 0.8125rem`, weight 600, `color: var(--color-text-muted)`. `formatDate()` from §12.
    - Separator dot: `·` middle dot, `aria-hidden`.
    - Category: pill-shaped, `font-size: 0.75rem`, weight 700, uppercase, letter-spacing 0.05em, `color: var(--color-text)`, `background: var(--color-border)`, `padding: 0.125rem 0.5rem`, `border-radius: 999px`.
  - Headline: `<h3>`, `font-size: 1.125rem`, weight 700, line-height 1.3, `color: var(--color-text)`, line-clamp 2 (same `-webkit-box-orient` pattern from Phase 2/3).

### 15.4 NewsCard hover

- `transform: translateY(-4px)`, `border-color: var(--color-primary)`, soft `box-shadow` (same as EventCard hover Phase 2 §3.5).
- Whole card is `<a>` — clicking anywhere navigates. For Phase 5 the link target is the news article page (Phase 6+) — for now, NewsCard accepts a `link` field on the news entry; if missing, card is non-interactive (matches Phase 2 EventCard pattern for events without `links[0]`).
- `prefers-reduced-motion: reduce` → no transform, border + shadow still change.

### 15.5 NewsList

- `<ul>` of `<li>` wrapping NewsCard.
- Grid: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, `gap: 1.5rem`.
- Sort: newest first (date DESC). Tie-breaker: `id`.
- Single column at mobile, 2-3 cols at tablet/desktop based on container width.

### 15.6 NewsSidebar

Mirrors EventSidebar §6 with the following sections:

- **Category** — multi-select chips. Categories enumerated from data: `Announcement`, `Event Recap`, `Site Update`, `Other`. (Architect: enumerate from `news.json` or hardcode? Designer recommends hardcoded enum like `event.type` so visitors see the same chip set even if `news.json` is empty.)
- **Date Range** — same from/to native inputs as EventSidebar §6.2.3.
- **Keyword Search** — same debounced search input. Match: case-insensitive substring on `news.title` and `news.body`.

No "Band" filter on NewsSidebar — news isn't band-keyed (community-wide).

Mobile collapse, reset button, result count — all follow EventSidebar §6 patterns.

### 15.7 `news.json` schema

```jsonc
[
  {
    "id": "2026-aniv-recap",                      // required, unique
    "date": "2026-04-29",                         // required, ISO 8601
    "title": "11th Anniversary Watch Party recap", // required
    "body": "## Recap\n\n...",                     // required, markdown subset (Phase 2 §1.4)
    "category": "Event Recap",                     // required, one of the enum
    "image": "/news/2026-aniv-recap.jpg",          // optional
    "link": "/news/2026-aniv-recap"                // optional; full Phase 5 has no detail page so usually empty
  }
]
```

Empty array `[]` → empty state ("No news yet — check back soon."). All filters disabled (parallel to Phase 2 §6.1).

### 15.8 Empty states

- **No news at all** — same pattern as Events §6.1 (centered card, dashed border, icon, title, body).
- **Filter zero results** — inline empty row with "Clear filters" button.

### 15.9 Edge cases

- News entry with very long body: only the title shows on the card (body is for the future detail page). Card stays compact.
- News entry with no image: gradient fallback letter-avatar, same as EventCard (§3.4 Phase 2). Letter is first char of `title`.
- Category not in enum: render with the literal category text, no special styling (defensive). Validator (build-time) flags drift.
- Mobile sidebar: same collapsible drawer pattern as EventSidebar §6.6.

---

## 16. File-by-file diff (for Architect's blueprint)

### 16.1 New files

```
src/pages/
├── News.{jsx,css,test.jsx}
├── About.{jsx,css,test.jsx}

src/components/
├── HeroCarousel/HeroCarousel.{jsx,css,test.jsx}
├── HeroStatTiles/HeroStatTiles.{jsx,css,test.jsx}    # fallback for empty events
├── EventCalendar/EventCalendar.{jsx,css,test.jsx}
├── EventSidebar/EventSidebar.{jsx,css,test.jsx}
├── NewsCard/NewsCard.{jsx,css,test.jsx}
├── NewsList/NewsList.{jsx,css,test.jsx}
├── NewsSidebar/NewsSidebar.{jsx,css,test.jsx}
├── PlatformIcon/PlatformIcon.{jsx,css,test.jsx}
├── LangToggle/LangToggle.{jsx,css,test.jsx}
├── MobileDrawer/MobileDrawer.{jsx,css,test.jsx}
├── ViewToggle/ViewToggle.{jsx,css,test.jsx}          # list/calendar toggle on /events

src/lib/
├── dateFormat.{js,test.js}                            # formatDate, formatDateTime, formatDateRange
├── carousel.{js,test.js}                              # rotation state machine
├── calendar.{js,test.js}                              # buildMonthGrid, eventsForDay, prev/nextMonth
├── uiLanguage.{js,test.js}                            # get/set/subscribe + t(key, params)

src/data/
├── news.json
├── social.json
├── about.json
├── i18n.json
```

### 16.2 Modified files

```
src/App.jsx                                # add /news, /about routes; wire MobileDrawer at top level
src/data/site.json                          # add `communityNameJp`
src/components/Navbar/Navbar.jsx            # add News + About links, LangToggle, hamburger trigger
src/components/Navbar/Navbar.css            # sticky + blur + responsive collapse
src/components/Footer/Footer.jsx            # rewrite 3-column with social row + tri-lingual brand line
src/components/Footer/Footer.css            # 3-col grid, brand line styling
src/components/Hero/Hero.jsx                # tri-lingual heading + HeroCarousel/HeroStatTiles
src/components/Hero/Hero.css                # tri-lingual typography rules
src/components/EventCard/EventCard.jsx      # use formatDate() + card-thumb-16-9 wrapper
src/components/EventCard/EventCard.css      # adopt shared 16:9 class
src/pages/Home.jsx                          # ComingSoonCards → HeroCarousel + stats fallback
src/pages/Events.jsx                        # add ?view=list|calendar via useSearchParams
src/pages/Events.css                        # grid layout for sidebar + content
src/pages/Members.jsx                       # (no functional change; date format updates if "since" added)
src/theme/theme.css                         # add .card-thumb-16-9, .skip-link
```

### 16.3 site.json schema after Phase 5

```json
{
  "discordInvite": "https://discord.gg/WfMBKaW8Br",
  "communityName": "BanG Dream North America Chinese Community",
  "communityNameZh": "北美炸梦同好会",
  "communityNameJp": "バンドリ北米華人コミュニティ",
  "tagline": "Concerts, communities, and conventions across North America"
}
```

(Note: `communityName` lengthens to the full English name. The compact `BD!NA` brand wordmark in the navbar is hardcoded in the navbar — not derived from `communityName`.)

---

## 17. Coverage acceptance per Phase 5 file

Per task brief + plan §"Coverage gate":

### 17.1 Tier A — pure logic ≥80% per-file (all of: lines, branches, functions, statements)

- `src/lib/dateFormat.js` — covers ISO date-only, ISO with time + offset, ISO with time no offset, multi-day range, single-day range, invalid input, missing input.
- `src/lib/carousel.js` — start, stop, prev, next, goTo, getCurrent, auto-advance interval, pause/resume, empty items, single item, intervalMs ≤ 0, listener add/remove.
- `src/lib/calendar.js` — buildMonthGrid for month with 28/29/30/31 days, leap year Feb, year boundary (Jan/Dec), eventsForDay with single date, eventsForDay with multi-day range crossing the target date, prev/next month with year rollover.
- `src/lib/uiLanguage.js` — get/set valid lang, get/set invalid lang (rejected), subscribe/unsubscribe, t() with key present, t() with key missing (EN fallback), t() with key missing in EN too (key literal), t() with params, t() with no params, localStorage throws, navigator.language detection (zh*, en*, other).

### 17.2 Tier B — components with logic ≥80% branch/function

- `HeroCarousel` — auto-advance, hover pause/resume, prev/next clicks, dot click, keyboard left/right, empty events fallback, slide rendering with image vs gradient fallback.
- `EventSidebar` — chip click for category, chip click for band, date input change, search input debounced, clear-all button, mobile collapse toggle, result count.
- `EventCalendar` — month nav prev/next, day click expansion, keyboard nav (arrow keys + home/end + pgup/pgdn + enter), today highlight, multi-day event rendering, off-month dim, +N indicator for >4 events.
- `NewsSidebar` — same controls as EventSidebar minus the band facet.

### 17.3 Tier C — presentational components, behavior-only tests

- `PlatformIcon` — assertions:
  - Active link state renders an `<a>` with the URL.
  - Disabled state renders a `<button disabled>` with the tooltip.
  - QR-only state opens the popover on click; ESC closes it.
  - The icon SVG renders inside the pill (test by `svg` role or a class assertion is acceptable; don't count divs).
- `MobileDrawer` — assertions:
  - Open via hamburger trigger; close via X button + ESC + backdrop click.
  - Focus moves to close button on open; returns to hamburger on close.
  - Tab cycles within the drawer (focus trap).
  - Body scroll locks while open.
  - Drawer auto-closes when crossing the 540px breakpoint.
- `LangToggle` — assertions:
  - Click `中` switches lang to zh; localStorage updated; subscribers notified.
  - Click `EN` switches to en.
  - Active button has `aria-pressed="true"`.
  - localStorage failure → still works in-memory.
- `NewsCard` — assertions:
  - Renders title, date (formatted), category pill.
  - Image renders inside `card-thumb-16-9`; gradient fallback when image missing.
  - Whole card is `<a>` with href; non-interactive when no `link` field.
- `ViewToggle` — assertions:
  - Click "Calendar" updates URL to `?view=calendar`.
  - Click "List" removes/sets `?view=list`.
  - Active button reflects URL state.

### 17.4 Coverage exclusions (no synthetic targets)

- `HeroStatTiles` — render-only stat numbers; tested with text-content assertions.
- Card CSS-only treatments (hover, focus rings) — verified by Reviewer manual cycle, not unit-tested.
- Theme switching across components — already covered by Phase 1 ThemeContext tests; Phase 5 Reviewer cycles all 8 themes manually on each new page.
- Anti-pattern reminder: NO tests of the form "renders 7 divs" or "has class X". All Phase 5 tests target user-facing behavior or pure-logic outputs.

---

## 18. Mobile breakpoint summary

Consolidated table — rows are component, columns are width buckets.

| Component | ≥1280px | 768–1279 | 540–767 | <540 |
|---|---|---|---|---|
| Navbar | logo + 5 links + tail (3 items) | same | logo + hamburger | logo + hamburger |
| Hero stack | 3 names large | scaled | scaled | scaled, smaller |
| HeroCarousel | full width up to 720 | same | same | same w/ smaller arrows |
| Footer | 3 columns + brand inline | 2-col + brand inline | 1-col + brand stacked | 1-col + brand stacked |
| EventSidebar | sticky 240px sidebar | drawer (collapse toggle) | drawer | drawer |
| EventList | wide cards | wide cards | wide cards | stacked banner cards |
| EventCalendar | full grid 96px cells | same | 80px cells | 64px cells, 1-char weekday header |
| NewsSidebar | sticky 240px sidebar | drawer | drawer | drawer |
| NewsList | 3-col grid | 2-col | 1-col | 1-col |
| MemberCard | 3-col grid | 2-col | 1-col | 1-col vertical layout (Phase 3) |
| About | content-centered single column | same | same | same compact |
| MobileDrawer | (not active) | (not active) | active right-slide | active right-slide |

No horizontal scroll at any width down to 320px.

---

## 19. Open issues for Architect / Developer

1. **`color-mix()` browser support** — used in navbar bg + footer bg subtle tint. Safari 16.4+, Chrome 111+, Firefox 113+. Architect verifies the project's Browserslist baseline accepts these. If not, fallback to a per-theme custom property `--color-bg-chrome` set to a pre-mixed hex (8 themes × 1 token = 8 entries, manageable). Designer recommends shipping `color-mix()` directly — supported across all browsers our user demographic uses.

2. **`backdrop-filter` Safari prefix** — included `-webkit-backdrop-filter`. Document this in the navbar CSS for future maintainers.

3. **`<details>` styling for the FAQ chevron** — modern browsers accept `summary { list-style: none }` to hide the native marker. Safari needs `summary::-webkit-details-marker { display: none }`. Both should be included in the FAQ CSS.

4. **`<input type="date">` styling consistency** — native date pickers vary across browsers/OSes. Phase 5 accepts native rendering; if visual inconsistency annoys users, Phase 6+ can adopt a custom date picker (recommend `react-day-picker` if/when needed).

5. **`useSearchParams` for `?view=list|calendar`** — react-router-dom v6 hook. Architect uses this; no manual `URLSearchParams` parsing needed.

6. **HeroCarousel and Reduced Motion** — when `prefers-reduced-motion: reduce`, auto-advance is disabled. Verify the carousel still has visible navigation affordances (prev/next + dots) so users can move through slides manually. Don't conditionally render the dots — they stay always.

7. **Tri-lingual stack font fallback** — JP fallback fonts in the stack (`Hiragino Kaku Gothic ProN`, `Meiryo`) are deliberately listed AFTER the ZH fonts. On a Mac, `PingFang SC` will satisfy ZH glyphs; the JP-specific kana `バンドリ` will fall through to `Hiragino Kaku Gothic ProN` (next in stack). On Windows, `Microsoft YaHei` covers ZH; JP falls through to `Meiryo`. Architect: validate this on a few QA devices.

8. **Sticky navbar offset for in-page anchors** — `scroll-margin-top: 64px` on `<h2>` / `<h3>` sections. About page especially needs this for FAQ #faq-{n} hash targets.

9. **HeroCarousel component coupling with `useUiLanguage`** — slide titles and dates are content (single-language), but UI labels like "Previous event" / "Next event" are chrome (translatable). Architect threads `useUiLanguage` through the carousel cleanly — preferably the dot/arrow ARIA labels are computed inline via `t('btn.prevEvent')` etc., not passed as props.

10. **i18n.json key naming convention** — dot-namespaced (`nav.home`, `filter.category`, etc.) for readability. Strict ASCII keys only — no spaces, no punctuation, no quotes (helps avoid `feedback_no_smart_quotes.md`-style typos).

11. **Empty `social.json` array** — render the column heading + a single muted line "Communities coming soon." Do NOT render an empty `<ul>`. (Phase 5 ships with 5 entries; this is defensive for Phase 4 admin scenarios where someone empties the array.)

12. **News page route nesting for Phase 6+** — Phase 5 `/news` is a list-only page. If Phase 6 adds detail pages (`/news/:id`), the list-page `Link` href on each NewsCard would change from `null`/disabled to `/news/${id}`. Architect should make NewsCard's `link` prop forward-compatible with this change without requiring a full rewrite.

13. **Calendar today highlight logic** — uses `new Date()` at render time; doesn't auto-update if the user leaves the calendar page open past midnight. Phase 5 accepts this; Phase 6+ can add a `useEffect` re-checker on a 60s interval if needed.

14. **MobileDrawer + ThemeSwitcher inline expansion vs popover** — §10.3 specifies inline expansion in the drawer rather than the popover from Phase 1. Architect confirms: ThemeSwitcher accepts a `variant` prop (`"popover"` default, `"inline"` for drawer use) so the swatch grid can render directly in the drawer body without the absolute-positioned popover wrapper. This is the only API change to Phase 1's ThemeSwitcher.

15. **Card-thumb-16-9 placement in CSS architecture** — Designer recommends `src/theme/theme.css` since it's a global utility. If Architect prefers a separate `src/theme/cards.css` partial, fine — must be imported by `App.css` so it's globally available.

16. **Sidebar-page grid responsive breakpoint** — set at 1024px (sidebar appears at ≥1024px, drawer below). Architect can shift to 1080px or 960px if QA reveals the 240px sidebar + main content feels cramped at 1024px. Designer prefers 1024px as the established convention.

17. **HeroCarousel "events.json" data dependency** — Phase 5 reads events.json synchronously at module-import time (consistent with Phase 2/3). When Phase 6+ moves to fetched data (admin backend), the carousel will need a loading skeleton. Out of scope for Phase 5.

---

## 20. Reviewer acceptance checklist (Phase 5)

### 20.1 IA + chrome (P5A)

- [ ] All 5 routes mount and render without console errors: `/`, `/news`, `/events`, `/members`, `/about`.
- [ ] Navbar shows 5 nav tabs at ≥768px with `LangToggle + ThemeSwitcher + Discord` in the tail.
- [ ] Navbar at <540px shows only logo + hamburger; opening hamburger reveals nav links + LangToggle + ThemeSwitcher + Discord pill.
- [ ] Sticky navbar stays in place on scroll across all pages; backdrop blur is visible against page content.
- [ ] Active route highlighted in navbar.
- [ ] LangToggle persists choice across page reloads (localStorage `bangdream-na:uiLanguage`).
- [ ] Switching lang updates only chrome strings (nav labels, footer headings, sidebar legends, button labels, empty states). Brand identity tri-lingual block stays unchanged.
- [ ] Switching lang does NOT swap event/member/news/about content.
- [ ] Footer 3-column at ≥1024px, 2-column at 768–1023, 1-column at <768.
- [ ] Footer Communities column shows Discord pill (active) + 4 disabled platform pills (QQ, 小红书, X, 微信). Discord pill clicks open the invite URL in a new tab.
- [ ] Footer tri-lingual brand line shows JP / ZH / EN with separator dots; vertical stack at <540px.
- [ ] All dates site-wide render as `YYYY.MM.DD` (verify on EventCard, NewsCard, HeroCarousel, calendar expansion).
- [ ] `card-thumb-16-9` enforces 16:9 on EventCard image, NewsCard image, HeroCarousel slide.

### 20.2 Hero + Home (P5B)

- [ ] Hero shows JP top, ZH H1 center, EN below — all three present, weight contrast as spec'd.
- [ ] Hero has `<h1>` exactly once on the page (the ZH name).
- [ ] Hero `lang="ja"` / `lang="zh"` / `lang="en"` attributes present on respective spans.
- [ ] HeroCarousel rotates through up to 5 upcoming events when `events.json` has them.
- [ ] HeroCarousel auto-advances every 6 seconds; pauses on hover; resumes on leave; pauses when document hidden; respects reduced-motion.
- [ ] HeroCarousel prev/next arrows + dot indicators work; left/right arrow keys also work.
- [ ] HeroCarousel falls back to HeroStatTiles when no upcoming events exist; tiles show member count + past event count.
- [ ] Tagline still renders below the EN name; not influenced by LangToggle.

### 20.3 Events upgrade

- [ ] EventSidebar shows on `/events` with 4 sections: Category, Band, Date Range, Keyword Search.
- [ ] All four filter facets work and combine with AND semantics.
- [ ] Sidebar is sticky at ≥1024px; collapses to drawer toggle below.
- [ ] `?view=list` (or no query) shows EventList; `?view=calendar` shows EventCalendar.
- [ ] View toggle persists in URL on refresh.
- [ ] EventCalendar: month grid with 7 columns, today highlighted, prev/next navigation, off-month days dimmed.
- [ ] Calendar dot color matches event type.
- [ ] Click a date with events → expansion panel shows that day's events.
- [ ] Multi-day events show as dots on each spanned day.
- [ ] Calendar keyboard navigation works (arrow keys, home/end, pgup/pgdn, enter).
- [ ] EventSidebar mobile collapse toggle button shows active filter count badge.
- [ ] Result count text updates live as filters change.

### 20.4 News page

- [ ] `/news` mounts.
- [ ] NewsCard layout: 16:9 thumbnail on top, date · category meta row, headline below.
- [ ] NewsCard hover: lift + theme-tinted glow.
- [ ] NewsList grid is responsive (3-col → 2-col → 1-col).
- [ ] NewsSidebar shows 3 facets (Category, Date Range, Keyword Search); same drawer collapse pattern as EventSidebar at <1024px.
- [ ] Empty `news.json` → empty state card.
- [ ] Filter zero results → inline empty row with "Clear filters".

### 20.5 About page

- [ ] `/about` mounts.
- [ ] About hero shows tri-lingual title block (JP top, ZH H1, EN below).
- [ ] All five sections visible / accessible: Mission, History, FAQ, How to Join, Code of Conduct, Disclaimer.
- [ ] FAQ uses native `<details>`; click expands; chevron rotates.
- [ ] Hash anchor `#faq-{n}` auto-opens that FAQ on page load.
- [ ] COC is a collapsible `<details>` (not visible by default).
- [ ] Disclaimer is always visible.
- [ ] Footer About column links anchor-scroll to the right sections with `scroll-margin-top` clearing the sticky nav.

### 20.6 LangToggle

- [ ] Pill switch shows `中 / EN` segments.
- [ ] Active segment styling: `--color-primary` background + `--color-on-primary` text.
- [ ] `aria-pressed` correctly reflects state.
- [ ] Tooltip "UI language / 界面语言" visible on hover.
- [ ] Default detection from `navigator.language` works (ZH browsers default to ZH).
- [ ] localStorage failure mode: lang still works in-memory for the session.

### 20.7 MobileDrawer

- [ ] Triggered by hamburger button at <540px (and 540–767 if hamburger is active).
- [ ] Slides in from right; backdrop fades in.
- [ ] Close: ESC, backdrop click, X button.
- [ ] Body scroll locked while open.
- [ ] Focus trap: Tab cycles within drawer; focus moves to close-X on open.
- [ ] Focus returns to hamburger on close.
- [ ] Drawer auto-closes when window crosses 540px (resize event).
- [ ] Theme swatch grid expands inline inside drawer (not popover) when ThemeSwitcher trigger is tapped.

### 20.8 PlatformIcon

- [ ] Discord pill: active link, opens URL in new tab.
- [ ] QQ / Xiaohongshu / X / Wechat pills: disabled state, tooltip "Coming soon" / "敬请期待".
- [ ] (Manual test post-Phase 4 when QR is added) QR-only pill opens popover with QR image.

### 20.9 Card-thumb-16-9

- [ ] Inspecting EventCard image cell, NewsCard image, HeroCarousel slide in DevTools shows `aspect-ratio: 16 / 9`.
- [ ] Slow-loaded images don't shift layout (aspect-ratio reserves space).

### 20.10 Date format

- [ ] Every date on every page renders as `YYYY.MM.DD`.
- [ ] Dates with time component (Phase 2 events) render as `YYYY.MM.DD H:MM AM/PM` in the meta row.
- [ ] Multi-day events show range `YYYY.MM.DD – YYYY.MM.DD`.

### 20.11 Tri-lingual typography

- [ ] All three names render with appropriate weights (400/800/500).
- [ ] JP line has tracked-out letter-spacing.
- [ ] ZH line has tighter line-height than EN/JP.
- [ ] `lang` attributes present on every script-specific span.
- [ ] Defensive: if any one name is missing in `site.json`, the others still render without layout collapse.

### 20.12 Accessibility

- [ ] All 8 themes pass AA on all new chrome surfaces (manual cycle on `/`, `/news`, `/events`, `/about`).
- [ ] Focus rings visible on every interactive element.
- [ ] Skip-to-main-content link works (Tab to it, Enter, focus moves to main).
- [ ] Calendar arrow-key navigation works.
- [ ] LangToggle `aria-pressed` works in both directions.
- [ ] MobileDrawer focus trap works.
- [ ] Reduced-motion respected: HeroCarousel doesn't auto-advance; drawer/popover/calendar transitions instant.
- [ ] Live region announcements: filter result counts update on screen reader.
- [ ] All screen-reader announcements use the correct `lang` (esp. tri-lingual brand block).

### 20.13 Coverage

- [ ] Pure logic files (dateFormat, carousel, calendar, uiLanguage) ≥80% per-file lines/branches/functions/statements.
- [ ] HeroCarousel, EventSidebar, EventCalendar, NewsSidebar ≥80% branch/function coverage.
- [ ] PlatformIcon, MobileDrawer, LangToggle, NewsCard, ViewToggle: behavior assertions pass; no synthetic line-coverage targets.
- [ ] No tests of the form "renders 7 divs" or "has class foo-bar".

### 20.14 Cross-phase regressions

- [ ] Phase 1 ThemeSwitcher still works (popover variant unchanged on desktop).
- [ ] Phase 2 EventCard still renders correctly with the new `formatDate` + `card-thumb-16-9` migrations.
- [ ] Phase 3 MemberCard avatars stay 1:1 (NOT migrated to `card-thumb-16-9`).
- [ ] All 8 themes still apply across the 5 pages.
- [ ] No console errors on any route.

---

## 21. Cross-references

- **Phase 1 design (LOCKED tokens, typography, accessibility baseline)**: `docs/design.md`
- **Phase 2 design (EventCard pattern, type badge, EventFilter — kept for backcompat, no longer rendered)**: `docs/p2-design.md`
- **Phase 3 design (MemberCard, MemberFilter, role badge, oshi semantics)**: `docs/p3-design.md`
- **Approved plan (file tree, milestones, social.json schema, commit-layered P5A/P5B)**: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md`
- **Bang-dream.com reference (IA inspiration, never copied visually)**: `https://bang-dream.com/`, `https://bang-dream.com/news`
- **Aesthetic anchor (hover lift + glow)**: `portfolio/src/components/Projects.css:17-21`

---

**Designer status**: complete. Architect (task #2, parallel) consumes §1 (IA), §5.1 (social.json schema), §15.7 (news.json schema), §16 (file diff), §9.6 (uiLanguage api), §17 (coverage tiers). Developer (task #3) consumes everything. Reviewer (task #4) gates on §20.
