# `bangdream-na` Phase 6 — Architecture Specification (bang-dream.com layout adoption)

**Status**: Architect deliverable for task #2 in team `bangdream-na-phase6`. Ready for Developer dispatch (task #3) once Designer (task #1) is also complete.

**Scope**: Adopt the `bang-dream.com` 3-up peek hero carousel + big-tile platform row. Fold in 4 smaller P5-review asks: logo white-bg fix, Navbar brand text "北美炸梦同好会", remove tail Discord pill, full Chinese ↔ English chrome localization audit. Layered internally as **P6A** (logo + navbar + i18n + site.json — lower risk) → **P6B** (HeroPeekCarousel + PlatformTileRow + posts.js + Home rewrite + Footer collapse — higher visual risk), single PR with commit-level separation.

**What does NOT change**: stack (`react@19`, `vite@8`, `react-router-dom@7`, `vitest@3`), `package.json` deps, `eslint.config.js`, `vercel.json`, `.gitignore`, `index.html`, `src/main.jsx`, `src/theme/`, all Phase 1-5 utility libs (`events.js`, `members.js`, `news.js`, `dateFormat.js`, `carousel.js`, `uiLanguage.js`, `calendar.js`). HeroCarousel from P5 is **kept** (still imported by tests; could orphan-cleanup in a later phase). DiscordCTA component is **kept** (used by Home stat-tile fallback path? — no, not currently, but the file stays to avoid spurious deletes; its only consumers are the Hero + Navbar, both being modified in this phase).

**What changes**: 3 new components, 1 new lib module, 1 new data file, 7 files modified, i18n.json gets a major key expansion. No new npm deps.

---

## 1. No new deps — confirm

`package.json` deltas: **none**. Every Phase 6 deliverable composes from packages already pinned at Phase 1:

- `react` `^19.2.4` — `useState`, `useEffect`, `useRef`, `useId`, `useMemo`, `useSyncExternalStore` all in stable stdlib
- `react-router-dom` `^7.13.2` — `<Link>`, `<NavLink>`, `useLocation` already in use
- `vitest` `^3.2.4` + `@testing-library/react` `^16.3.0` + `@testing-library/jest-dom` + `@testing-library/user-event` + `jsdom` — same test stack as P5

If Developer believes a dep is needed (e.g., `marked` for rich post-card body markdown — N/A for P6, posts use plain title + image), escalate to team-lead before installing. Memory rule `principles.md` immutability is also unchanged: `posts.js` returns new arrays.

---

## 2. New files inventory

```
src/components/
├── HeroPeekCarousel/
│   ├── HeroPeekCarousel.jsx
│   ├── HeroPeekCarousel.css
│   └── HeroPeekCarousel.test.jsx
├── PlatformTileRow/
│   ├── PlatformTileRow.jsx
│   ├── PlatformTileRow.css
│   └── PlatformTileRow.test.jsx
├── PostCard/
│   ├── PostCard.jsx
│   ├── PostCard.css
│   └── PostCard.test.jsx

src/lib/
├── posts.js
└── posts.test.js

src/data/
└── posts.json                # ships [] initial
```

Net: **3 new components × 3 files = 9**, + 1 lib × 2 = 2, + 1 data ⇒ **12 new files**.

### 2.1 `src/data/posts.json`

Ships as: `[]`

Schema (per item, authored manually or via P4 admin):

```jsonc
{
  "id": "string",                   // required; stable e.g. "2025-04-30-spring-meetup-banner"
  "image": "string",                // required (post card is image-led); URL or "/posts/<slug>.jpg"
  "title": "string|null",           // optional overlay title; absent or empty => image-only card
  "url": "string|null",             // optional click target (XHS / blog / Discord pinned message); absent => non-link card
  "datePosted": "string"            // required ISO 8601 date; used for sort + thumbnail ordering
}
```

Authorial intent: user curates banner posts ("我到时候自己写或者xhs啥的同步"). Empty array fallback path is mandatory — `posts.json = []` MUST not break Home page.

### 2.2 `src/lib/posts.js` — pure logic, Tier A

No React imports. No DOM. No timers. Tests run with bare vitest, no jsdom dependency required for the lib itself.

---

## 3. Modified files inventory

| File | Change type | Description |
|---|---|---|
| `src/components/Hero/Hero.jsx` | structural | Remove `discordUrl` prop; remove `<DiscordCTA>` mount inside hero CTA. Logo `<img>` keeps existing `src/alt`; CSS handles white-bg. Children prop stays so `Home.jsx` can still inject the carousel/tiles. |
| `src/components/Hero/Hero.css` | additive | `.hero-logo { background: white; padding: 4px; border-radius: 50%; box-shadow: 0 2px 12px rgba(0,0,0,0.18); }` + `@supports` fallback for any `color-mix` usage in shadow. Same logo bg fix applied via reused `.navbar-logo` selector. |
| `src/components/Navbar/Navbar.jsx` | structural | Brand text "BD!NA" → "北美炸梦同好会"; remove `<DiscordCTA>` from `.navbar-tail`; same edit in mobile drawer header brand text; remove `<DiscordCTA>` from `.mobile-drawer-cta`. `aria-label={brandLabel}` keeps English fallback for screen readers. |
| `src/components/Navbar/Navbar.css` | targeted | `.navbar-tail` regains gap balance after removing 3rd child; widen `.navbar-brand-text` if 5-char Chinese needs more room (no overflow at 1024px desktop); white-bg fix for `.navbar-logo` mirrors hero treatment. |
| `src/pages/Home.jsx` | structural | Replace inner `<HeroCarousel events={events}>` with `<HeroPeekCarousel posts={posts} />`; render `<PlatformTileRow />` below the hero (not inside `<Hero>`). Stat-tile fallback path stays — gated on `posts.length === 0` instead of `upcoming.length === 0`. |
| `src/components/Footer/Footer.jsx` | structural | Drop "Communities" middle column (5 PlatformIcons). Footer collapses to **2 columns**: Quick Links + About&Legal. Tri-lingual brand line + copy unchanged. |
| `src/components/Footer/Footer.css` | structural | Grid template `1fr 1fr` (was 3 cols); mobile single-col stacking unchanged. |
| `src/data/i18n.json` | ★ MAJOR | New keys for tile labels, hero peek aria, post-card empty/aria, brand-text aria fallback, tagline.{en,zh}. Full audit (§7) catches every untranslated chrome string. |
| `src/data/site.json` | structural | Drop `tagline` field; moved to `i18n.json` `tagline.en` + `tagline.zh`. `communityName / Zh / Jp` stay (locked brand identity). |
| `src/components/Hero/Hero.test.jsx` | targeted | Drop assertions that reference `discordUrl` prop or DiscordCTA mount inside hero. Tagline now read from i18n in `Home.jsx` and passed via prop or via `t()` directly inside `Hero` (Architect recommendation: read in Home, pass `tagline` prop string into Hero). |
| `src/components/Navbar/Navbar.test.jsx` | targeted | Brand-text assertion expects "北美炸梦同好会"; tail children count assertion changes from 3 → 2 (LangToggle + ThemeSwitcher only). Mobile drawer DiscordCTA assertion removed. |
| `src/components/Footer/Footer.test.jsx` | targeted | Drop "Communities" heading + 5 PlatformIcon mounts assertion; assert 2-column heading set. |
| `src/pages/Home.test.jsx` | structural | New assertions: HeroPeekCarousel mounts when `posts.json` has entries; PlatformTileRow mounts always; stat-tile fallback when `posts.json = []`. Test fixture overrides `posts.json` import via vitest module mock (or via prop drilling in a re-export — see §6.3 Architect note). |

**Files explicitly NOT modified**:
- `src/components/HeroCarousel/*` — kept; tests still pass; carousel.js shared dependency consumed by HeroPeekCarousel.
- `src/components/DiscordCTA/*` — kept; orphaned but inexpensive; removal in a future cleanup phase.
- `src/components/PlatformIcon/*` — kept; Footer (after collapse) does NOT reference it, but PlatformTileRow may share its SVG components (see §6.2).

---

## 4. Function signatures — `src/lib/posts.js`

All pure. Inputs immutable (memory `principles.md`). Returns new arrays/objects. Tier A coverage gate.

```js
/**
 * @typedef {Object} PostEntry
 * @property {string} id
 * @property {string} image
 * @property {string|null|undefined} [title]
 * @property {string|null|undefined} [url]
 * @property {string} datePosted - ISO 8601
 */

/**
 * Parse a post's datePosted string. Mirrors lib/events.js parseEventDate
 * for consistency. Returns null for malformed input.
 *
 * @param {unknown} iso
 * @returns {Date|null}
 */
export function parsePostDate(iso)

/**
 * Returns a NEW sorted array. Does not mutate input.
 * 'desc' (default) = newest first (matches "most recent banner first" carousel order).
 * 'asc' = oldest first.
 * Malformed-date entries sort to the END regardless of dir (mirrors sortEventsByDate).
 *
 * @param {PostEntry[]} posts
 * @param {'asc'|'desc'} [dir='desc']
 * @returns {PostEntry[]}
 */
export function sortPostsByDate(posts, dir = 'desc')

/**
 * Returns a new array of "featured" posts for HeroPeekCarousel:
 *  - drops entries with malformed datePosted
 *  - drops entries missing required `image` field (post card is image-led)
 *  - sorts newest-first
 *  - slices to `max`
 *
 * `now` is reserved for future "expire after N days" filtering — currently unused
 * but kept in the signature so a future change doesn't widen the contract.
 *
 * @param {PostEntry[]} posts
 * @param {number} [max=6]
 * @param {Date} [now=new Date()]
 * @returns {PostEntry[]}
 */
export function pickFeaturedPosts(posts, max = 6, now = new Date())
```

### 4.1 Edge cases for `posts.js` (Tier A — non-negotiable)

`parsePostDate`:
- `""` → `null`
- non-string (`null`, `undefined`, `0`, `42`, `{}`, `[]`) → `null`
- `"not-a-date"` → `null`
- `"2025-13-40"` → `null`
- whitespace-only `"   "` → `null` (treat as malformed)
- valid `"2025-04-30T19:00:00-07:00"` → Date instance with matching epoch
- valid date-only `"2025-04-30"` → Date instance

`sortPostsByDate`:
- `null` / `undefined` / non-array input → returns `[]`
- empty `[]` → returns `[]` (new empty array, not the same reference)
- single entry → returns 1-element new array
- 2 entries with mixed dates → newest first when `desc`, oldest first when `asc`
- entries with malformed `datePosted` → sort to end; valid entries sort relative to each other
- input array NOT mutated (assert `posts === input` is false but `input.length` unchanged)

`pickFeaturedPosts`:
- empty array → `[]`
- single valid post → `[post]`
- 10 posts, `max=3` → returns 3
- all malformed dates → `[]` (every entry dropped)
- mixed: 2 valid + 3 malformed → returns 2 valid in newest-first order
- entries with `image=""` or missing `image` → dropped (image-led card)
- `max=0` → `[]`
- `max=undefined` → uses default 6
- duplicate `id`s (authoring error) → not deduped here; carousel render uses `key={id}` so React would warn; lib does not silently sweep authorial mistakes
- input array NOT mutated
- `now` parameter — currently no behavior depends on it; pass-through accepted; documented as reserved

---

## 5. HeroPeekCarousel implementation strategy

### 5.1 Component contract

```jsx
<HeroPeekCarousel
  posts={PostEntry[]}
  max={6}                  // optional; default 6
  intervalMs={6000}        // optional; default 6000
  now={Date}               // optional; for testability
/>
```

### 5.2 Internal state

- `currentIndex: number` — index into `slides` (the result of `pickFeaturedPosts`)
- `paused: boolean` — true while hovered/focused/document-hidden
- `userInteractedAt: number` — epoch ms of last user click on prev/next/thumbnail (consumed by `shouldAutoAdvance` for explicit suppression after manual nav; matches P5 carousel pattern)

Reuses `src/lib/carousel.js` exports `next`/`prev`/`shouldAutoAdvance` (already in P5).

### 5.3 Render layout — 3-up peek

For `slides.length === N` and active `currentIndex = i`:

- Left peek slide → `slides[(i - 1 + N) % N]` — class `hero-peek__slide--peek hero-peek__slide--left`, opacity 0.5, scale 0.92
- Center slide → `slides[i]` — class `hero-peek__slide--center`, opacity 1, scale 1
- Right peek slide → `slides[(i + 1) % N]` — class `hero-peek__slide--peek hero-peek__slide--right`, opacity 0.5, scale 0.92

Wrap-around: when `N === 1`, only center renders (no peek). When `N === 2`, both peek positions render the same single non-center slide on different sides (this is OK visually — a one-and-a-half-up peek that loops back).

CSS uses `transform: translateX()` for slide motion + `transition: transform 0.4s ease-out, opacity 0.3s ease`. **All transitions disabled** when `prefers-reduced-motion: reduce` matches.

### 5.4 Auto-advance

```jsx
useEffect(() => {
  if (length <= 1) return undefined
  if (paused) return undefined
  if (reducedMotion) return undefined
  const id = setInterval(() => {
    setCurrentIndex((idx) => carouselNext(idx, length))
  }, intervalMs)
  return () => clearInterval(id)
}, [length, paused, reducedMotion, intervalMs])
```

`reducedMotion` is read once via `getReducedMotion()` (matches P5 HeroCarousel pattern). For dynamic responsiveness to OS preference change mid-session, an optional second `useEffect` may add a `change` listener — Architect rates this **NOT mandatory** for P6 (the OS-level toggle is rare during a session); add only if Reviewer flags.

### 5.5 Keyboard

Container `tabIndex={0}`, `onKeyDown` handler:

| Key | Behavior |
|---|---|
| `ArrowLeft` | `setCurrentIndex(idx => carouselPrev(idx, length))` + `preventDefault` |
| `ArrowRight` | `setCurrentIndex(idx => carouselNext(idx, length))` + `preventDefault` |
| `Home` | `setCurrentIndex(0)` + `preventDefault` |
| `End` | `setCurrentIndex(length - 1)` + `preventDefault` |
| any other | bubble |

Each interaction also bumps `userInteractedAt = Date.now()` so subsequent `shouldAutoAdvance` polling skips a tick — keeps user from being whisked away mid-read.

### 5.6 Thumbnail strip

Below the 3-up area: a horizontal row of `slides.length` thumbnails (image-only, ~96×54 each).

ARIA: `role="tablist"` on the strip; each thumb is `<button role="tab" aria-selected={i === currentIndex}>`.

Roving tabindex: only the active thumb has `tabindex={0}`; others have `tabindex={-1}`. Click a thumb → `setCurrentIndex(i)` + bump `userInteractedAt`.

When `slides.length === 1`, hide the strip entirely (a single thumb is just noise).

### 5.7 ARIA + announcements

- Container: `role="region" aria-roledescription="carousel" aria-label="Featured posts"`.
- Center slide region has `aria-live="polite"`. Slot announces `"Slide {n} of {total}"` (translated key `aria.slideNofM`) as visually-hidden text within the live region. Avoid announcing on every auto-advance tick — that would be noisy. Architect recommendation: **only announce on user-initiated change** (prev/next/thumb click + arrow keys + Home/End). Auto-rotate updates DOM but not the live-region text. If accessibility audit later disagrees, expand to announce-always; for now this matches W3C carousel pattern guidance.
- Prev/next buttons: `aria-label={t('aria.prevPost')}` / `t('aria.nextPost')`.
- Thumbs: `aria-label={t('aria.goToPostN', { n: i + 1 })}`.

### 5.8 Mobile collapse

CSS media `@media (max-width: 540px)`:
- Peek sides hidden (`display: none`), center expands to full width.
- Prev/next reposition INLINE below center as horizontal pill buttons (not floating circles), per plan default.
- Thumbnail strip becomes scrollable horizontally.

### 5.9 Empty state

`slides.length === 0` (after `pickFeaturedPosts` filter) → return `null`. The Home page handles the fallback to stat-tiles separately based on its own `posts.length === 0` check, NOT the filtered result. Architect recommendation: Home gate on **raw** `posts.length === 0` so the visible tagline / fallback doesn't flicker between an authored-but-malformed posts.json and an empty one. (If posts.json has 3 entries all with malformed dates, the carousel returns null but Home doesn't know — for P6 we accept this tiny inconsistency since malformed posts.json is an authoring bug, not a runtime concern.)

### 5.10 Edge cases for HeroPeekCarousel (Tier B — ≥80% branch/function)

- `posts === undefined` or non-array → render returns null (no crash)
- `posts === []` → returns null
- single post (`posts.length === 1`) → renders only center slide; no peeks; no thumb strip; no prev/next buttons; no auto-advance (`length <= 1` branch)
- 2 posts → renders center + duplicate-side peek; auto-advance ON; prev/next ON; thumb strip with 2 thumbs
- N posts (`N >= 3`) → 3-up window slides correctly; prev/next wrap at boundaries
- `ArrowLeft` from `currentIndex=0` wraps to `length - 1`
- `ArrowRight` from `currentIndex=length-1` wraps to `0`
- `Home` → 0; `End` → `length - 1`
- hover → pauses auto-advance; mouse-leave → resumes
- focus enters region → pauses; blur leaves → resumes
- `prefers-reduced-motion: reduce` matched → auto-advance never starts; CSS transitions disabled (component renders `data-reduced-motion="true"` flag for CSS hook)
- rapid prev/next click during auto-rotate → currentIndex tracks user clicks correctly (no race; `setCurrentIndex` functional updater)
- thumb click → currentIndex jumps to clicked thumb; live region announces "Slide N of M"
- post entry missing `title` → no overlay rendered (image-only card)
- post entry missing `url` → card is non-clickable `<div>`/`<article>`, not an `<a>`
- post entry with very long title (200 chars) → title clamped via CSS `-webkit-line-clamp: 2` + `text-overflow: ellipsis`
- document.hidden becomes true → `paused` set true via `visibilitychange` handler; resumes when visible

---

## 6. PlatformTileRow implementation strategy

### 6.1 Component contract

```jsx
<PlatformTileRow />
```

No props. Reads `src/data/social.json` directly (same pattern as Footer). Pure presentational; no internal state EXCEPT what bubbles from a tile's QR popover (handled per-tile in PlatformIcon-style internal state OR via shared `socialPopover.js` util — see §6.3).

### 6.2 Per-tile rendering branch

For each platform entry in social.json:

```js
const isActive = entry.enabled === true && isHttpsUrl(entry.url)
const isQr = entry.enabled === true && !isActive && hasQrImage(entry.qrImage)
const isDisabled = !isActive && !isQr
```

- `isActive` → `<a className="platform-tile platform-tile--<platform>" href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>` with brand-color background, white icon + white label, hover-lift.
- `isQr` → `<button className="platform-tile platform-tile--<platform>">` opens shared QR popover (logic mirrors `PlatformIcon`'s — see §6.3 for de-dup recommendation).
- `isDisabled` → `<span className="platform-tile platform-tile--<platform> platform-tile--disabled" aria-disabled="true" title={t('btn.comingSoon')}>` — non-interactive, ~50% opacity, "Coming soon" tooltip.

### 6.3 Brand colors + icon SVGs — Architect decision on extraction

Brand color map (used as CSS classes, NOT inline styles, so themes can later override if needed):

| platform | hex | contrast vs `#FFFFFF` text |
|---|---|---|
| `discord` | `#5865F2` | 4.99:1 ✅ AA |
| `qq` | `#12B7F5` | 2.86:1 ⚠️ FAIL — see Designer note |
| `xiaohongshu` | `#FE2C55` | 4.16:1 ✅ AA |
| `x` | `#000000` | 21:1 ✅ AAA |
| `wechat` | `#07C160` | 2.92:1 ⚠️ FAIL — see Designer note |

**Architect note on contrast**: QQ light-blue and WeChat green DO NOT meet WCAG AA (4.5:1) for white text body copy. Designer must either (a) shift the brand hex slightly darker on these two tiles (Designer territory — not Architect), or (b) add a 1px white outline (`text-shadow: 0 0 2px rgba(0,0,0,0.4)`) under the label to push apparent contrast. **Recommendation**: option (b). Easier, preserves brand recognizability. Designer commits exact hex/shadow tokens.

**Icon SVGs — extraction decision**: Currently 5 SVG render functions live inside `src/components/PlatformIcon/PlatformIcon.jsx` (`DiscordSvg`, `QQSvg`, `XiaohongshuSvg`, `XSvg`, `WechatSvg`). PlatformTileRow needs the same SVGs.

**Architect recommendation**: extract the 5 SVG components into a new shared module:

```
src/components/PlatformIcon/icons.js        # exports DiscordSvg, QQSvg, ... (5 named exports)
```

Then both `PlatformIcon.jsx` and `PlatformTileRow.jsx` import from it. The extraction is a pure refactor; coverage on PlatformIcon stays unchanged (the SVGs were never tested for content, only that they render). The refactor commit is small and self-contained — fold into P6B commit #1 (see §9).

**QR popover de-dup decision**: The popover (open on click, close on Escape + outside click) logic is ~30 LoC duplicated between PlatformIcon and any future PlatformTileRow QR tile. **Architect recommendation**: leave the duplication for P6. WeChat is the only QR candidate, and it ships as `enabled=false` (no QR yet — see open issue 3). Extracting `socialPopover.js` is premature — wait until a second QR-only platform exists. Memory rule from `principles.md` parallel: "Three similar lines is better than a premature abstraction." Future P4-admin or P7 extracts when warranted.

### 6.4 Tile structure + sizing

- Desktop: `grid-template-columns: repeat(5, 1fr)`, gap 12px, each tile 280×96 (per plan default open issue 3).
- Tablet (540-900px): `repeat(3, 1fr)`, wraps to 2 rows (3+2).
- Mobile (<540px): `repeat(1, 1fr)`, 80px tall, full-width stack.
- Inside each tile: flex row, icon (24×24, white via `fill="currentColor"` + `color: white`), label (font-weight 600, font-size 1rem mobile / 1.125rem desktop, `color: white`).

### 6.5 Edge cases for PlatformTileRow (Tier B — ≥80% branch/function)

- 5 active platforms — all render as `<a>` with `href` + `target="_blank"` + `rel="noopener noreferrer"`
- 5 disabled platforms — all render as `<span aria-disabled="true">`; no clickable behavior
- mixed (current state: discord/qq/xhs/x active, wechat disabled) — assertions per platform
- a platform with `enabled=true` but `url=""` and `qrImage=null` → falls through to disabled branch (defensive)
- a platform with `enabled=true` + `url=""` + `qrImage="/wechat-qr.png"` → QR button branch; click opens popover; Escape closes; outside-click closes; re-click toggles
- a platform with unrecognized `platform` key (e.g., authoring typo `"twitter"`) → SVG `Icon` is undefined; tile still renders text-only (icon position empty); does NOT crash
- `social.json` is non-array (corrupted) → renders empty placeholder (consistent with Footer pattern: `Array.isArray(social) ? social : []`)
- `social.json` is empty `[]` → renders nothing (or an empty container — Designer call); component returns valid empty parent
- `url` is `http://` not `https://` → `isHttpsUrl` returns false → falls to disabled or QR branch (matches PlatformIcon helper); reasoning: prevent mixed-content + accidental http leaks
- keyboard tabbing through tiles → focus order matches DOM order; `outline:2px solid var(--color-primary)` for focus ring

---

## 7. i18n.json expansion plan — full chrome localization audit

### 7.1 Structure (top-level grouping)

The existing `_meta` + `en` + `zh` sections stay. Within `en` and `zh`, keys remain flat-dotted strings (no nested objects). New groups added in P6:

| Group prefix | Purpose | Example keys |
|---|---|---|
| `tagline.*` | Hero subtitle (moved from `site.json`) | `tagline.en` `tagline.zh` |
| `hero.*` | Hero section chrome | `hero.brandAriaLabel` (English fallback for screen readers when brand text is Chinese) |
| `tile.*` | PlatformTileRow labels (deferred — Architect recommends reusing `social.json` `label` field; do NOT duplicate platform names into i18n) |
| `aria.*` | Carousel + tile + popover ARIA labels not already in `btn.*` | `aria.peekCarouselLabel`, `aria.prevPost`, `aria.nextPost`, `aria.goToPostN`, `aria.slideNofM`, `aria.platformRowLabel` |
| `empty.*` | Empty state copy (extends existing) | `empty.noPosts` |
| `post.*` | PostCard chrome (image-led; little to translate) | (likely none — title is content; `post.untitledFallback` if Designer wants visible "Featured post" overlay when title missing) |
| `home.*` | Home page section headings | `home.featuredHeading` (above carousel — Designer call whether visible) |

### 7.2 Concrete new key list (P6 minimum delta)

The Reviewer audit (§7.5) checks **every chrome string** is keyed. Architect-locked new keys:

- `tagline.en` (move from `site.json`, value `"Concerts, communities, and conventions across North America"`)
- `tagline.zh` (NEW translation — Designer/Reviewer commits final wording; placeholder `"在北美一起听演唱会、办活动、做朋友"`; not a Chinese teacher's signoff but acceptable in the absence of a curated translation)
- `hero.brandAriaLabel` (= `"BanG Dream NA Chinese Community"` EN; ZH = same English so screen readers can disambiguate; **OR** key omitted and brand-text component handles fallback inline — Architect's accepted choice)
- `aria.peekCarouselLabel.en` / `.zh` → `"Featured posts"` / `"精选帖子"`
- `aria.prevPost.en` / `.zh` → `"Previous post"` / `"上一篇"`
- `aria.nextPost.en` / `.zh` → `"Next post"` / `"下一篇"`
- `aria.goToPostN.en` / `.zh` → `"Go to post {n}"` / `"前往第 {n} 篇"`
- `aria.slideNofM.en` / `.zh` → `"Post {n} of {m}"` / `"第 {n} 篇，共 {m} 篇"`
- `aria.platformRowLabel.en` / `.zh` → `"Community platforms"` / `"社群平台"`
- `empty.noPosts.en` / `.zh` → `"No featured posts yet."` / `"暂无精选帖子。"` (Note: Home falls back to stat-tiles, not this empty string, but reserve key for future direct empty render)

Keys MOVED (existing values relocate):
- `site.json` `tagline` → `i18n.json` `tagline.{en,zh}`. Hero now reads tagline via `t('tagline.' + lang)` OR (cleaner) Hero reads `t('tagline')` with two flat keys `tagline.en` + `tagline.zh` + a tiny lookup helper. **Architect recommendation**: keep flat key naming + lookup at consumption: `Home.jsx` calls `t('tagline')` once and the lookup helper internally selects EN/ZH per current language. To make this work without changing `t()`'s 1-key signature, add a single key `tagline` that's looked up in the same dict. — i.e., the standard `t()` flow already does this. Concretely: add `"tagline": "..."` under both `en` and `zh` blocks. **Final spec**: one key `tagline`, present in both `en` and `zh` blocks. Forget the `tagline.en` / `tagline.zh` naming; that was a transitional thought.

### 7.3 i18n.json final delta — corrected

Add to `en` block:
```json
"tagline": "Concerts, communities, and conventions across North America",
"hero.brandAriaLabel": "BanG Dream NA Chinese Community",
"aria.peekCarouselLabel": "Featured posts",
"aria.prevPost": "Previous post",
"aria.nextPost": "Next post",
"aria.goToPostN": "Go to post {n}",
"aria.slideNofM": "Post {n} of {m}",
"aria.platformRowLabel": "Community platforms",
"empty.noPosts": "No featured posts yet."
```

Add to `zh` block:
```json
"tagline": "在北美一起听演唱会、办活动、做朋友",
"hero.brandAriaLabel": "BanG Dream NA Chinese Community",
"aria.peekCarouselLabel": "精选帖子",
"aria.prevPost": "上一篇",
"aria.nextPost": "下一篇",
"aria.goToPostN": "前往第 {n} 篇",
"aria.slideNofM": "第 {n} 篇，共 {m} 篇",
"aria.platformRowLabel": "社群平台",
"empty.noPosts": "暂无精选帖子。"
```

Reviewer may reject `tagline.zh` wording and require Designer to commit a better translation — that's expected; placeholder commits are not blocking for Architect spec.

### 7.4 site.json final delta

```jsonc
{
  "discordInvite": "https://discord.gg/WfMBKaW8Br",
  "communityName": "BanG Dream North America Chinese Community",
  "communityNameZh": "北美炸梦同好会",
  "communityNameJp": "バンドリ北米華人コミュニティ"
  // tagline: REMOVED — moved to i18n.json
}
```

`Home.jsx` consumption pattern: `<Hero tagline={t('tagline')} ...>` instead of `<Hero tagline={site.tagline} ...>`. Hero component itself stays language-blind — it just renders the string it's given.

### 7.5 Reviewer's chrome-string audit — definition

**Goal**: with `localStorage:bangdream-na:uiLanguage = "zh"`, every visible CHROME string in the rendered DOM is Chinese. Same for `"en"`. No leakage.

**Chrome string registry** (Reviewer scans these — anything found in this list MUST be in target language):

| Origin | Selector / location | i18n key |
|---|---|---|
| Navbar nav links | `.navbar-link` text content (5 items) | `nav.home/news/events/members/about` |
| Navbar mobile drawer | `.mobile-drawer-link` text content (5) | same nav.* |
| Navbar drawer label | `.mobile-drawer-label` | `lang.drawerLabel` |
| Navbar drawer title aria-label | drawer `aria-label` | `drawer.title` |
| Navbar hamburger trigger | `aria-label` | `btn.openMenu` |
| Drawer close button | `aria-label` | `btn.closeMenu` |
| LangToggle group label | `aria-label` | `lang.label` |
| ThemeSwitcher (band names) | NOT chrome — band names are brand identity, never translated |
| Hero tagline | `.hero-tagline` text | `tagline` |
| Hero brand ARIA fallback | `aria-label` | `hero.brandAriaLabel` |
| HeroPeekCarousel region label | `aria-label` | `aria.peekCarouselLabel` |
| HeroPeekCarousel prev/next | `aria-label` | `aria.prevPost` / `aria.nextPost` |
| HeroPeekCarousel thumb buttons | `aria-label` | `aria.goToPostN` |
| HeroPeekCarousel live region | text content (when announce fires) | `aria.slideNofM` |
| PlatformTileRow region | `aria-label` | `aria.platformRowLabel` |
| PlatformTileRow disabled tile | `title` attribute | `btn.comingSoon` |
| Home stat tile labels | `.home-stat-tile__label` | `stat.membersInCommunity` / `stat.pastEvents` |
| Footer Quick Links heading | `.footer-heading` (col 1) | `footer.quickLinks` |
| Footer About&Legal heading | `.footer-heading` (col 2) | `footer.aboutLegal` |
| Footer link labels | `.footer-link` text (8 total) | `nav.*` + `footer.mission/faq/coc/disclaimerLink` |
| Footer disclaimer copy | `.footer-copy` | `footer.disclaimer` |
| EventList / NewsList empty states | `.events-empty`, `.news-empty` text | `empty.no*` (existing) |
| EventCalendar weekday header | `.calendar-weekday` text (7) | `calendar.weekday*` (existing) |
| EventSidebar / NewsSidebar | filter section labels + buttons + placeholders | `filter.*` (existing) |
| EventCard "Tickets" / "View details" | `.event-card-cta` | `btn.tickets` / `btn.viewDetails` (existing) |
| About page section headings | `<h2>` in About | `about.*Heading` (existing) |
| About page COC / Disclaimer | summary text + body | `about.cocSummary`, `about.disclaimerHeading`, `about.disclaimerBody` (existing) |
| Skip-to-content link | `.skip-link` text | `skip.toContent` (existing) |

**Content strings explicitly EXCLUDED from chrome scan** (these stay as authored, never translate):
- Event titles, locations, descriptions, link labels (`events.json` content)
- Member display names + bios (`members.json` content)
- News titles + body markdown (`news.json` content)
- Post titles (`posts.json` content)
- About mission / history / faq.q / faq.a / coc body / joinInstructions text (`about.json` content; only the section *headings* like "Mission" are chrome)
- Tri-lingual brand names (`site.communityName`, `Zh`, `Jp`) — locked brand identity
- Theme band names ("Roselia", "Poppin'Party", etc.) in ThemeSwitcher — brand identity
- Footer brand line — that IS the tri-lingual brand line, intentionally three languages at once

**Reviewer test mechanic**:

A new test file `src/test/i18n-audit.test.jsx` runs the audit. Pseudo-code:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { setLanguage, _resetForTests } from '../lib/uiLanguage.js'
import i18n from '../data/i18n.json'

// Routes to scan; each rendered in MemoryRouter at that path
const ROUTES = ['/', '/events', '/members', '/news', '/about']

// English chrome strings that MUST NOT appear when lang === 'zh'
// (compiled from i18n.en values, excluding ones that legitimately may render as English)
const EN_CHROME_VALUES = new Set(Object.values(i18n.en).filter(v => /^[A-Za-z .,'·&-]+$/.test(v)))

describe('chrome localization audit (zh)', () => {
  beforeEach(() => {
    localStorage.setItem('bangdream-na:uiLanguage', 'zh')
    _resetForTests()
  })
  for (const route of ROUTES) {
    it(`route ${route} has no English-only chrome leakage in zh mode`, () => {
      render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
      // walk text nodes; for each non-empty trimmed text node, check:
      //   if it's a member of EN_CHROME_VALUES → FAIL (that string is chrome and should be translated)
      //   if it matches a content data field (event title etc.) → SKIP
      // ...
    })
  }
})
```

This is illustrative — Developer + Reviewer collaborate on the exact node-walker. Memory rule `feedback_normalize_inside_helper.md`: helper internally normalizes the route + lang setup. Reviewer audits the helper's exclusion list against the chrome-string registry table above.

**Practical Reviewer alternative** (acceptable if test mechanic above proves brittle): Reviewer runs the dev server locally, switches LangToggle to `中`, manually visits each of the 5 routes, and confirms no English chrome strings remain. The test mechanic is an aspiration; the manual audit is the binding gate.

---

## 8. Test plan + coverage tier mapping

Phases 1-5 already establish the tier strategy in `vite.config.js` (global ≥80% all axes) + Reviewer per-file audit. P6 reuses the model verbatim.

| Tier | Files | Target | Audit method |
|---|---|---|---|
| **A** Pure logic | `src/lib/posts.js` | ≥80% lines/branches/functions/statements per-file | `coverage/index.html` Reviewer reads |
| **B** Logic-components | `HeroPeekCarousel`, `PlatformTileRow` | ≥80% branch/function | Reviewer + edge test catalog (§5.10, §6.5) |
| **C** Presentational | `PostCard` | NO synthetic line targets — assert role/text/aria/href; behavior-only | Reviewer reads test file |

`Hero.test.jsx`, `Navbar.test.jsx`, `Footer.test.jsx`, `Home.test.jsx` mods are NOT new tests — they are amendments to existing ones. They keep their tier classifications from earlier phases.

### 8.1 Edge tests — non-negotiable per memory `feedback_edge_testing_soul.md`

Per Tier B/A new component (§5.10, §6.5, §4.1).

For amended tests:

- `Hero.test.jsx` — assertion that `<DiscordCTA>` is NOT in the rendered tree (`queryByRole('link', { name: /discord/i })` returns null inside hero region); `discordUrl` prop removal does not break tagline / brand-name rendering.
- `Navbar.test.jsx` — brand text equals "北美炸梦同好会"; `.navbar-tail` contains exactly 2 children; mobile drawer header brand text matches; mobile drawer does NOT contain `<DiscordCTA>`.
- `Footer.test.jsx` — exactly 2 footer-column elements; "Quick Links" + "About & Legal" headings present; "Communities" heading absent; PlatformIcon imports removed (or import stays unused — see Tree-shaking note below).
- `Home.test.jsx` — when `posts.json = []` (mocked), stat-tile fallback renders; when posts present, HeroPeekCarousel renders + PlatformTileRow renders (PlatformTileRow always renders regardless of posts count).

### 8.2 Tree-shaking note on Footer + PlatformIcon

Footer no longer renders `<PlatformIcon>`. Architect recommends **removing the `import PlatformIcon ...` line** from `Footer.jsx` so the linter `no-unused-vars` rule passes. PlatformIcon component file stays on disk (still imported elsewhere if any consumer; if none, it's dead code but not removed in P6).

### 8.3 Localization audit test fixture

`src/test/setup.js` may need to ensure `localStorage` is reset between i18n-audit tests. RTL's auto-cleanup does NOT clear localStorage. Add:

```js
import { afterEach } from 'vitest'
afterEach(() => {
  try { window.localStorage.clear() } catch { /* private mode */ }
})
```

Architect-locked addition. Single line. No new dep.

### 8.4 `vite.config.js` — no change

No coverage exclude additions. PostCard is presentational + Tier C — its branches are exercised by HeroPeekCarousel integration tests, so it should not drag global average below 80%. Reviewer checks the actual coverage report; if global average dips below 80%, Reviewer blocks and Developer adds presentational excludes (same escalation path as P5).

---

## 9. Internal commit ordering — P6A → P6B

Single PR `feat/phase-6 → main`. Commits land in this order so reviewers can audit P6A (low-risk chrome fixes) before reading P6B (visual rewrites).

### P6A — chrome + i18n + small fixes (lower risk)

1. `style(hero,navbar): add white circular background under logo for dark themes`
   - `src/components/Hero/Hero.css` — `.hero-logo` rule
   - `src/components/Navbar/Navbar.css` — `.navbar-logo` rule mirrors
   - Mobile drawer logo gets same treatment via shared selector.
2. `feat(navbar): use Chinese brand text and remove tail Discord pill`
   - `src/components/Navbar/Navbar.jsx` — brand text "北美炸梦同好会"; `.navbar-tail` contains LangToggle + ThemeSwitcher only; mobile drawer header brand text "北美炸梦同好会"; mobile drawer drops `.mobile-drawer-cta` block (DiscordCTA removed there too).
   - `src/components/Navbar/Navbar.css` — tail spacing recalibrated.
   - `src/components/Navbar/Navbar.test.jsx` — assertions updated.
3. `chore(i18n): expand chrome dictionary with hero/peek-carousel/platform-row keys`
   - `src/data/i18n.json` — add 9 keys × 2 langs = 18 entries (per §7.3).
4. `refactor(site): move tagline from site.json to i18n.json`
   - `src/data/site.json` — drop `tagline` field.
   - `src/data/i18n.json` — `"tagline"` key already added in commit 3 (or split — Developer's call; either is fine).
   - `src/pages/Home.jsx` — `tagline={t('tagline')}` instead of `tagline={site.tagline}`.
5. `feat(hero): drop discordUrl prop and inline DiscordCTA`
   - `src/components/Hero/Hero.jsx` — remove `discordUrl` prop + `<DiscordCTA>` mount.
   - `src/components/Hero/Hero.test.jsx` — drop CTA assertions.
   - `src/pages/Home.jsx` — remove `discordUrl` prop pass-through.
   - `src/pages/Home.test.jsx` — small assertion tweaks if any tested CTA presence.

### P6B — bigger visual rewrites (depends on P6A)

6. `feat(data): add posts.json initial empty array`
   - `src/data/posts.json` — `[]`.
7. `feat(lib): add posts.js with parsePostDate / sortPostsByDate / pickFeaturedPosts`
   - `src/lib/posts.js`, `src/lib/posts.test.js` — Tier A coverage with edge cases per §4.1.
8. `refactor(platform-icon): extract icon SVGs to shared icons.js module`
   - `src/components/PlatformIcon/icons.js` — 5 named SVG exports.
   - `src/components/PlatformIcon/PlatformIcon.jsx` — imports from `./icons.js` instead of defining inline.
   - `src/components/PlatformIcon/PlatformIcon.test.jsx` — no behavior change; existing tests should pass unchanged.
9. `feat(components): add PostCard presentational image + optional title overlay`
   - `src/components/PostCard/{PostCard.jsx,PostCard.css,PostCard.test.jsx}`.
10. `feat(components): add HeroPeekCarousel 3-up peek + thumb strip`
    - `src/components/HeroPeekCarousel/{HeroPeekCarousel.jsx,HeroPeekCarousel.css,HeroPeekCarousel.test.jsx}`.
11. `feat(components): add PlatformTileRow with brand-color tiles`
    - `src/components/PlatformTileRow/{PlatformTileRow.jsx,PlatformTileRow.css,PlatformTileRow.test.jsx}`.
12. `feat(home): replace HeroCarousel with HeroPeekCarousel and append PlatformTileRow`
    - `src/pages/Home.jsx` — render swap; PlatformTileRow always rendered below hero; stat-tile fallback when `posts.length === 0`.
    - `src/pages/Home.test.jsx` — assertions updated per §8.1.
13. `style(footer): collapse to 2-column layout (drop Communities)`
    - `src/components/Footer/Footer.jsx` — drop Communities `<section>`; remove unused PlatformIcon import.
    - `src/components/Footer/Footer.css` — grid-template-columns `1fr 1fr` desktop / single-col mobile.
    - `src/components/Footer/Footer.test.jsx` — assertions updated per §8.1.

**Each commit must keep build + tests green** — `npm run build && npm test`. If Developer needs to split for green-build reasons, that's allowed; flag in PR description.

**Optional integration sweep commit at the end** (Developer's call): `chore(tests): add i18n chrome audit smoke for /, /events, /members, /news, /about` — adds the test in §7.5 if the path is feasible; otherwise Reviewer audits manually.

---

## 10. Open issues for Developer — Architect recommendations

| # | Open issue | Architect recommendation |
|---|---|---|
| 1 | Should HeroCarousel from P5 be deleted? | **Keep**. Tests still reference it; `carousel.js` is shared with HeroPeekCarousel. Cleanup-phase candidate, not P6. |
| 2 | QQ + WeChat brand-color contrast vs white text | **Use `text-shadow: 0 0 2px rgba(0,0,0,0.4)`** as cheap apparent-contrast boost. Designer commits exact value if a different shadow color/blur reads better. |
| 3 | WeChat tile state at ship time | **Disabled tile** ("Coming soon" tooltip). User has not uploaded `qrImage` yet. When P4 admin lets them upload `/social/wechat-qr.png`, `social.json` `wechat.qrImage` is set + `enabled` flips true → tile auto-promotes to QR popover branch. No code change needed. |
| 4 | Chinese tagline placeholder wording | Architect-committed placeholder: `"在北美一起听演唱会、办活动、做朋友"`. Designer / Reviewer / user may PR a better translation; do not block on this. |
| 5 | i18n.json `"tagline"` key shape — flat or `tagline.{en,zh}` | **Flat**. One key `tagline`; `t('tagline')` returns lang-appropriate value via existing dict lookup. Matches every other key in the file. |
| 6 | Hero brand aria-label English fallback | The brand text becoming Chinese means screen readers reading the English locale will pronounce CJK characters by codepoint or skip. Add `aria-label={t('hero.brandAriaLabel')}` on the hero brand element so screen readers in EN mode get an English fallback. ZH mode reads the Chinese characters natively. **Architect-committed pattern**. |
| 7 | HeroPeekCarousel announces every auto-rotate? | **No**. Only on user-initiated change (prev/next/Home/End/thumb click). Auto-rotate updates DOM but `aria-live` slot stays silent. Avoids screen-reader noise. |
| 8 | When `posts.length === 0` show fallback at Home level OR HeroPeekCarousel returns null and Home shows nothing? | **Home gates on raw `posts.length === 0`** and renders stat-tiles. HeroPeekCarousel itself may return null (Tier B branch coverage), but Home's gate ensures stat-tiles render in the empty case. Don't double-gate; one source of truth. |
| 9 | PlatformTileRow rendered on which routes? | **Home only** (per plan default). Other pages already have content-specific footers (filter sidebars, etc.). Adding to Events/News pages is a future call. |
| 10 | Mobile tile layout — 2-2-1 or 1-per-row? | **1-per-row mobile**, full-width 80px tall. Visually consistent with bang-dream.com mobile. 2-2-1 squishes labels uncomfortably. |
| 11 | PostCard click target when `url` set | `<a href={url} target="_blank" rel="noopener noreferrer">` wrapping the entire card. ARIA: `aria-label={title || ('Featured post ' + index)}` for image-only cards. |
| 12 | Should Hero `tagline` rendering live-update on LangToggle? | **Yes** — Home.jsx already uses `useSyncExternalStore` to subscribe to language changes; passing `t('tagline')` in render means tagline re-resolves on language switch. No extra wiring needed. |
| 13 | i18n audit test brittleness (text-walk false positives) | **Manual audit by Reviewer is the binding gate**. The test in §7.5 is a nice-to-have; if Developer hits walker-difficulty, defer to Reviewer manual sweep. Memory rule `feedback_team_lead_self_verify_not_reviewer.md` — Reviewer is independent. |
| 14 | Reduced-motion dynamic listener | **Don't add**. One-time read at mount. OS-level toggle mid-session is rare. Add only if Reviewer explicitly flags. |
| 15 | Auto-merge eligibility for the Phase 6 PR | Per memory `feedback_bangdream_na_standing_auto_merge.md` (referenced from plan), Reviewer APPROVED triggers auto-merge. Memory `feedback_never_autonomous_merge_to_default_branch.md` is project-specific and explicitly OVERRIDDEN by the standing auto-merge for this repo per the plan. Team-lead handles the merge. |
| 16 | DiscordCTA component file fate | **Keep on disk**. Cleanup deferred. No consumers after P6; lint may warn `unused-vars` if any test imports it — fix at the call site, not by deletion. |

---

## 11. Acceptance gate (Architect → Developer)

Developer is unblocked when:

- [x] This document exists at `docs/p6-architecture.md`
- [x] Designer's `docs/p6-design.md` exists (parallel task #1) — color tokens (esp. QQ + WeChat tile contrast resolution), spacing (peek opacity/scale, tile dimensions), exact i18n.zh wording for `tagline`
- [x] Both have been read by Developer before any code is written
- [x] No new npm deps
- [x] Each commit in P6A → P6B order leaves build + tests green
- [x] Edge tests per §4.1, §5.10, §6.5 are non-negotiable (memory `feedback_edge_testing_soul.md` soul rule)
- [x] PR body separates P6A and P6B sections for Reviewer audit clarity
- [x] Conventional commit format; **no `Co-Authored-By` lines** (memory `feedback_no_coauthor.md`); `.claude/` stays out of the tree (memory `feedback_no_claude_on_github.md`)

---

## 12. Cross-references

- Approved plan: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md`
- Phase 1 architecture (stack + vitest config): `docs/architecture.md`
- Phase 2 architecture (events lib + EventCard pattern): `docs/p2-architecture.md`
- Phase 3 architecture (members lib + filter debounce): `docs/p3-architecture.md`
- Phase 5 architecture (carousel.js, uiLanguage.js, i18n.json scope): `docs/p5-architecture.md`
- Reused libs: `src/lib/carousel.js` (next/prev/shouldAutoAdvance), `src/lib/uiLanguage.js` (get/set/subscribe + t), `src/lib/dateFormat.js` (formatDate)
- Reused data: `src/data/social.json` (5 platforms incl. wechat disabled)
- Memory rules applied: `feedback_edge_testing_soul.md` (edge tests), `feedback_no_coauthor.md`, `feedback_no_claude_on_github.md`, `feedback_iteration_contract_needs_explicit_ack.md`, `feedback_normalize_inside_helper.md`, `feedback_no_smart_quotes.md`, `feedback_team_lead_self_verify_not_reviewer.md`, `principles.md` immutability, `feedback_behavior_not_mode.md` (LangToggle stays UI chrome only — content untranslated), `feedback_bangdream_na_standing_auto_merge.md` (auto-merge after APPROVED for this repo)

---

**Architect status**: complete. Developer (task #3) is unblocked once Designer (task #1) commits final color tokens + tagline wording.
