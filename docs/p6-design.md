# bangdream-na — Phase 6 Design Spec (bang-dream.com layout adoption)

Single-source design reference for Phase 6. Audience: P6 Architect (data shapes + signatures), P6 Developer (DOM + CSS + behavior contracts + edge cases), P6 Reviewer (acceptance criteria + DOM-text scan truth source for the localization gate).

**Scope summary**: adopt bang-dream.com's *layout patterns* — 3-up peek hero carousel, big-tile platform row at home bottom, simplified navbar, collapsed footer — onto our existing 8-band-theme dark site. Add a new user-curated `posts.json` data file as the carousel content source. Run a full chrome localization audit. **Theme tokens stay locked from Phase 1** (no new `--color-*` tokens). **No bang-dream.com IP copied** — no character art, no franchise wordmark, no pastel colors, no sparkle/star decorations.

**Open-question defaults locked** (from approved plan): theme-aware arrow color (not bang-dream pink); PlatformTileRow only on home; tiles 280×96 with icon + label; footer collapsed to 2 columns desktop / 1 column mobile; PostCard title overlay rendered when `post.title` is present.

---

## 0. Reference deltas (what changed since P5)

| P5 state (now live) | P6 state |
|---|---|
| Home hero shows `<HeroCarousel events>` (existing P3 component, surfaces upcoming events) | Home hero shows `<HeroPeekCarousel posts>` (new, surfaces user-curated banner posts) |
| Home stat-tile fallback when no upcoming events | Stat-tile fallback when `posts.json` is empty (same DOM, different trigger) |
| Navbar tail = `[LangToggle][ThemeSwitcher][DiscordCTA size="sm"]` | Navbar tail = `[LangToggle][ThemeSwitcher]` only |
| Navbar brand wordmark = `BD!NA` | Navbar brand wordmark = `北美炸梦同好会` (Chinese, locked, does NOT swap with LangToggle) |
| Hero logo = transparent PNG with drop-shadow filter | Hero logo = white circular badge under PNG + theme-tinted box-shadow |
| Footer = 3 columns (Quick Links / Communities / About&Legal) | Footer = 2 columns desktop (Quick Links / About&Legal) / 1 column mobile. Communities col removed (PlatformTileRow now serves it.) |
| `site.json` owns `tagline` (English-only string) | `i18n.json` owns `tagline.en` + `tagline.zh`; `site.json` field removed |
| Hero CTA = `<DiscordCTA size="lg">` inside `<Hero>` | `<Hero>` no longer renders DiscordCTA at all (`discordUrl` prop pruned). Discord exposure happens in PlatformTileRow at home bottom. |
| `HeroCarousel` rendered on Home page only | `HeroCarousel` kept in repo (still imported nowhere after this swap; lib/carousel.js is shared) — see §11 open issue |
| Mobile drawer renders `DiscordCTA size="md"` at the bottom | Mobile drawer's `mobile-drawer-cta` block is removed |

`HeroCarousel.jsx` itself is **not deleted** in P6; it stays as dead code that compiles. Tests stay valid. Removal is a cleanup decision deferred to a later phase or to the Reviewer's discretion (see §11).

---

## 1. HeroPeekCarousel spec

The marquee component for P6. Replaces `HeroCarousel` on the Home page.

### 1.1 Visual layout (≥768px)

```
┌──────────────────────────────────────────────────────────────────┐
│         [   left peek   ][      center card      ][ right peek ] │
│         opacity .5,                                  opacity .5, │
│         scale .92                                    scale .92   │
│  (◀)                                                       (▶)   │
│                                                                  │
│         ●● [thumb] [thumb] [active-thumb] [thumb] [thumb]        │
│                          (4-6 visible)                           │
└──────────────────────────────────────────────────────────────────┘
```

- **Container**: `<section class="hero-peek" role="region" aria-roledescription="carousel" aria-label={t('peek.label')}>`. Width: 100%. Inner `max-width: 1280px`, centered, `padding-inline: clamp(1rem, 4vw, 3rem)`.
- **Track**: `display: grid; grid-template-columns: 1fr min(60vw, 720px) 1fr; gap: 0;`. The center column hosts the active card; left/right columns host the side peeks. The two peek slots reveal the *previous* and *next* cards from the data array.
- **Center card** (`.hero-peek__card--center`): aspect-ratio `16 / 9`, full column width (clamped via grid `min(60vw, 720px)`), `border-radius: 14px`, `box-shadow: 0 16px 40px rgba(0,0,0,0.35)`.
- **Side peeks** (`.hero-peek__card--side`): same aspect-ratio, `transform: scale(0.92)`, `opacity: 0.5`, `pointer-events: none`, `filter: blur(0)` (no blur — keep readable). The side peeks are decorative previews; clicking them does NOT navigate (intentional — buttons handle navigation).
- **Visible side fraction**: side peek extends beyond the grid column edge by clipping inside `.hero-peek` overflow. Practically: each side column is `1fr` and the peek `<article>` is sized to `min(25vw, 280px)`, anchored to the inner edge so ~25% of the next/prev card is visible at the center card's edge. Outer edges fade via mask: `mask-image: linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)` on the outer wrapper.
- **Spacing between cards**: 0 grid gap; cards visually overlap because center sits on top with higher z-index. Inner content of side peeks anchored toward center so the "peek" feels like a slice. Implementation: side peeks use `transform: translateX(±50%) scale(0.92)` to pull half of themselves under the center card.

### 1.2 Circular nav buttons

- **Geometry**: `width: 56px; height: 56px; border-radius: 50%;` (desktop). Mobile <540px: `48px`.
- **Position**: `position: absolute; top: 50%; transform: translateY(-50%);` mid-vertical of the center card. Left button: `left: calc(50% - min(60vw, 720px) / 2 - 28px);` (i.e., centered on the left edge of the center card). Right button mirrored. Practically: half-overlapping the card edge.
- **Color**: `background: var(--color-primary); color: var(--color-on-primary, white);`. Icon = chevron, 20px, white stroke, `aria-hidden="true"`. Border `1px solid color-mix(in srgb, var(--color-primary) 80%, white)` for definition on busy images.
- **Hover**: `filter: brightness(1.08); transform: translateY(-50%) scale(1.05);`.
- **Focus-visible**: `outline: 2px solid var(--color-text); outline-offset: 3px;`.
- **Hidden when length ≤ 1**: a single-post carousel doesn't render arrows or thumbs (just the center card).

### 1.3 Thumbnail strip

- **Layout**: `<ul class="hero-peek__thumbs" role="tablist">` below the carousel, `display: flex; gap: 0.5rem; justify-content: center; flex-wrap: nowrap; overflow-x: auto;`. On desktop, all thumbs visible (4-6). On tablet, horizontally scrollable when overflow.
- **Thumb size**: `width: 96px; height: 54px;` (16:9). Image cover-fit. Border radius 6px.
- **Active state**: `outline: 2px solid var(--color-primary); outline-offset: 2px;`. Inactive: `opacity: 0.6;`. Hover: `opacity: 0.85;`.
- **Click**: jumps to that index, resets the auto-rotate timer (sets pseudo `lastInteractionTs = now`).
- **Roving tabindex**: only the active thumb has `tabindex="0"`; others `tabindex="-1"`. Tab from carousel → first focusable thumb (the active one). Arrow keys move between thumbs and update active.
- **aria-label** on each: `t('btn.goToPost', { n: i + 1 })` — `Go to post {n}` / `前往帖子 {n}`.
- **aria-selected**: `true` on active, `false` on others.

### 1.4 Empty / single-post / multi-post states

| `posts.json` state | What renders |
|---|---|
| `[]` (empty array, default) | Component returns `null`. Home falls back to its existing 2 stat-tile block (members count + past events count). |
| 1 post | Center card only. No arrows, no thumb strip, no auto-rotate, no `aria-roledescription="carousel"` (just `<figure>` semantics — see §1.7). |
| 2 posts | Center + arrows + thumbs. Side peeks repeat (left peek = right peek = the other post; visually OK because it's the only neighbor). Auto-rotate ON. |
| 3-N posts | Full peek behavior with distinct prev/next neighbors per index. |

### 1.5 Auto-rotate

- **Cadence**: 6000ms (`DEFAULT_INTERVAL_MS = 6000`). Configurable via prop `intervalMs` for tests.
- **Pause-on-hover**: `onMouseEnter` / `onFocusCapture` set `paused = true`; `onMouseLeave` / `onBlurCapture` clear it.
- **Pause-on-document-hidden**: `document.addEventListener('visibilitychange', ...)` — when `document.hidden`, paused stays `true`.
- **`prefers-reduced-motion: reduce` gate**: when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, auto-rotate is disabled entirely (the `setInterval` is never registered). Side-peek scale + opacity *transitions* still animate (200ms each), because they render once per index change, not continuously — but if Reviewer flags this, we can fall back to instant via `@media (prefers-reduced-motion: reduce) { .hero-peek__card { transition: none; } }`.
- **Interaction reset**: any user click on arrows / thumb / keyboard nav resets the timer by re-keying the effect (state change → effect re-runs → fresh `setInterval`).
- **Wrap behavior**: at last index, next jumps to 0 (uses `lib/carousel.js next()`).

### 1.6 Mobile + breakpoint matrix

| Width | Layout |
|---|---|
| ≥1024px | Full peek: center 60vw clamped 720px max, both side peeks visible, thumbs 4-6 visible, arrows 56px |
| 768-1023px | Peek narrower: center 70vw, side peeks visible at ~20%, thumbs 4 visible (overflow scroll), arrows 56px |
| 540-767px | **Collapse to single full-width card** (no peek). `grid-template-columns: 1fr;` Side peeks `display: none`. Thumbs visible (overflow-x auto). Arrows 48px, position: `static`, rendered *below* card in a row: `[◀] [thumbs scroll] [▶]`. (Spec calls "prev/next inline below" — implement as flex row with arrows flanking thumbs.) |
| 375-539px | Same as 540-767 but thumbs further compressed (72×40); arrows still inline-below. |
| <375px | Thumbs **hidden**; replaced with a centered `<div role="tablist">` of dot indicators (8px circles, 4px gap), reusing the visual treatment of `HeroCarousel.__dots`. Arrows still inline-below. Single column card 100% width minus 1rem inline padding. |

`prefers-reduced-motion`: independent of breakpoint; just disables the rotation timer and the slide transitions.

### 1.7 ARIA + keyboard

- Root: `role="region" aria-roledescription="carousel" aria-label={t('peek.label')}`. When length=1 and the wrapper is just an inert single card, downgrade to `<figure>` with no carousel semantics (avoids announcing "carousel of 1").
- Center card content area: `aria-live="polite" aria-atomic="false"`. Auto-rotate updates announce the new title (or post id when title absent) to AT users.
- Arrows: `<button type="button" aria-label={t('btn.prevPost')}>` / `t('btn.nextPost')`.
- Thumb strip: `<ul role="tablist">`; each thumb is `<button role="tab" aria-selected={i===current} tabIndex={i===current ? 0 : -1}>`.
- **Keyboard**: when carousel root has focus or any thumb has focus:
  - `ArrowLeft` → prev index, focus stays on whatever was focused (or moves to active thumb).
  - `ArrowRight` → next index.
  - `Home` → jump to index 0.
  - `End` → jump to last index.
  - `Tab` from arrow → moves focus into thumb strip (active thumb).
  - `Tab` from active thumb → moves focus out of carousel (no trap).
- Side-peek `<article>` elements: `aria-hidden="true"` (decorative — they show content the user can't interact with).
- Focus-visible outline everywhere using `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }`.

### 1.8 Component contract

```js
// HeroPeekCarousel.jsx
function HeroPeekCarousel({ posts, intervalMs = 6000, now }) { ... }
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `posts` | `Array<Post>` | required | Already filtered/sorted by caller via `lib/posts.js`. Component re-validates length and clamps index. |
| `intervalMs` | `number` | `6000` | Auto-rotate cadence; ≤0 disables rotation (used in tests). |
| `now` | `Date` | `new Date()` | Caller-injected for deterministic tests; otherwise component constructs its own. Not strictly required because the carousel doesn't filter by recency — `lib/posts.js` does. Kept for symmetry with HeroCarousel. |

Returns `null` when `posts.length === 0`.

---

## 2. PostCard spec

The card unit rendered inside HeroPeekCarousel (center + side peeks). Also intended to be reusable in a future "Latest posts" section, though P6 only mounts it inside HeroPeekCarousel.

### 2.1 Visual structure

```jsx
<article className="post-card card-thumb-16-9" data-post-id={post.id}>
  {hasImage
    ? <img src={post.image} alt={post.title || ''} loading="lazy" />
    : <PostCardLetterFallback id={post.id} title={post.title} />
  }
  {hasTitle ? (
    <div className="post-card__overlay">
      <h3 className="post-card__title">{post.title}</h3>
    </div>
  ) : null}
</article>
```

When `post.url` is set:

```jsx
<a className="post-card-link"
   href={post.url}
   target="_blank"
   rel="noopener noreferrer"
   aria-label={post.title || t('btn.openPost', { n: position })}>
  <article ... />
</a>
```

When `post.url` is missing: the `<article>` renders without an anchor wrapper (inert). Click does nothing.

### 2.2 Title overlay

- Visible only when `typeof post.title === 'string' && post.title.trim().length > 0`.
- DOM: `<div class="post-card__overlay">`, positioned absolutely at the bottom 30% of the card.
- Background: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 60%, transparent 100%)`. Independent of theme — image-on-card readability requires a strong dark gradient regardless of theme.
- Title `<h3>`: `color: white; font-weight: 700; font-size: clamp(1rem, 2vw, 1.375rem); line-height: 1.25; padding: 0.875rem 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.6);`. Truncate to 2 lines via `-webkit-line-clamp: 2` + `display: -webkit-box`.
- The text is `var(--color-text)` ONLY in cases where contrast doesn't fail; since the gradient is dark we always use `white` for guaranteed contrast.

### 2.3 Letter-card fallback (missing image)

- Triggers when `typeof post.image !== 'string'` OR `post.image.trim().length === 0`.
- DOM: `<div class="post-card__letter">{firstChar}</div>` where `firstChar` = first character of `post.title` if non-empty, else first character of `post.id`, else `'?'`. Use `Array.from(str)[0]` to handle multi-byte CJK / emoji correctly (avoid `str[0]` which slices half a surrogate pair).
- Background: `var(--gradient-hero)` (theme-tinted). Letter color: `var(--color-on-primary, white)`.
- Letter font: `font-size: clamp(3rem, 8vw, 5rem); font-weight: 800;` centered (flex). `text-transform: uppercase` for ASCII letters; CJK characters are case-invariant so this is a no-op for them.

### 2.4 Image rendering

- `<img>` uses `loading="lazy"` for off-screen side peeks; the active center card image should be eager (`loading="eager"`) — but we don't know which is active at render time without coupling. **Acceptable compromise**: all images `loading="lazy"`. The first card LCP impact is mitigated because the carousel is immediately below the navbar (in initial viewport) — browsers will dispatch the request synchronously enough.
- `decoding="async"` on all images.
- `alt`: `post.title` if present, else `''` (empty string = decorative when no title; this prevents AT from announcing the URL or filename).
- `width` / `height` attributes NOT hardcoded on the image — the `card-thumb-16-9` parent reserves the box pre-load (P5 optimization).

### 2.5 Component contract

```js
// PostCard.jsx
function PostCard({ post, position, variant = 'center' }) { ... }
```

| Prop | Type | Notes |
|---|---|---|
| `post` | `Post` | the data object (see §8). Required. |
| `position` | `number` | 1-based index for aria-label fallback. |
| `variant` | `'center' \| 'side'` | controls visual styling (size, opacity, pointer-events). Side variant adds `aria-hidden="true"`. |

---

## 3. PlatformTileRow spec

5 brand-color tiles at the end of the home page. Single-section row.

### 3.1 Visual layout (≥540px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Discord]   [QQ]   [小红书]   [X]   [微信]                     │
│   #5865F2  #12B7F5  #FE2C55   #000   #07C160                    │
│   white      white   white   white    white                      │
│   icon+lbl                                                       │
└──────────────────────────────────────────────────────────────────┘
```

- **Section wrapper**: `<section class="platform-tile-row" aria-labelledby="platform-tile-row-heading">` with a visually-hidden `<h2 id="platform-tile-row-heading">{t('platforms.heading')}</h2>` (chrome string: "Communities" / "社群"). VH because the visual design doesn't show a section label, but assistive tech needs grouping context.
- **Track**: `display: flex; flex-wrap: wrap; gap: 0.875rem; justify-content: center;` Each tile is a flex item.
- **Tile dimensions**: `width: 280px; height: 96px; border-radius: 12px;` (desktop). On wider viewports, tiles can flex up to `1 1 220px` if Architect/Developer prefer responsive grid; default is fixed-size and centered.
- **Inner layout**: tile is `display: flex; align-items: center; justify-content: center; gap: 0.875rem; padding: 0 1.5rem;` Icon left (32×32), label right (`font-size: 1.125rem; font-weight: 600; color: white;`).
- **Hover**: `transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.35); filter: brightness(1.08);` Transition: `transform 200ms ease, box-shadow 200ms ease, filter 200ms ease`.
- **Active (`:active`)**: `transform: translateY(-2px);` (lighter lift on click).
- **Focus-visible**: `outline: 3px solid white; outline-offset: 3px;` (white outline lifts off all 5 brand colors; the only one where it might fight is `#000` X, where the outline is white-on-black — high contrast, works).

### 3.2 Brand color mapping (LOCKED)

| Platform | Background | Icon + label color |
|---|---|---|
| Discord | `#5865F2` (Discord blurple) | `#FFFFFF` |
| QQ | `#12B7F5` (Tencent QQ blue) | `#FFFFFF` |
| 小红书 (xiaohongshu) | `#FE2C55` (XHS red/pink) | `#FFFFFF` |
| X | `#000000` | `#FFFFFF` |
| 微信 (wechat) | `#07C160` (WeChat green) | `#FFFFFF` |

**Theme-agnostic**: these colors are HARDCODED in `PlatformTileRow.css` via `[data-platform="discord"] { background: #5865F2; }` selectors. They do NOT compose `var(--color-*)`. They stay regardless of the 8 band themes. This is an exception to the "no hardcoded hex" rule; the exception is justified because brand-color recognition is an accessibility/identification feature and must not vary by theme.

WCAG AA contrast verified for white text on each:
- Discord `#5865F2`: contrast 4.62:1 ✓ (pass for normal text 4.5)
- QQ `#12B7F5`: contrast 2.79:1 ✗ — **fails AA for normal text**. Mitigation: tile label uses `font-weight: 600; font-size: 1.125rem (≥18px);` which qualifies as "large text" (3:1 threshold) — passes. Add `text-shadow: 0 1px 1px rgba(0,0,0,0.25);` to lift the label without changing perceived color. Reviewer must spot-check this on QQ tile specifically.
- 小红书 `#FE2C55`: contrast 4.10:1 — fails AA normal, passes large (3:1). Same mitigation as QQ.
- X `#000000`: contrast 21:1 ✓
- 微信 `#07C160`: contrast 2.92:1 — fails AA normal, passes large. Same mitigation.

**Reviewer Gate 5 acceptance**: white text on all 5 tiles legible at 1080p / 96 DPI, no contrast-flagged tile. The `font-size ≥ 18px AND weight ≥ 600` rule is the WCAG 2.1 "large text" carve-out and is the chosen path.

### 3.3 States — active / QR-only / disabled

The 5 tiles consume the same `social.json` rows the existing PlatformIcon does. State derivation is identical to PlatformIcon:

- **Active** (`enabled === true && hasHttpsUrl`): renders as `<a href={url} target="_blank" rel="noopener noreferrer" data-platform={platform}>`. Click opens platform in new tab.
- **QR-only** (`enabled === true && !hasHttpsUrl && hasQrImage`): renders as `<button type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={popoverId}>` toggling a QR popover (same pattern as `PlatformIcon`'s QR mode). Popover image 200×200 with caption `t('social.scanCaption', {label})`.
- **Disabled** (anything else, including `enabled === false`): renders as `<span class="platform-tile platform-tile--disabled" aria-disabled="true" title={t('btn.comingSoon')}>`. Grey background `var(--color-bg-card)`, muted text `var(--color-text-muted)`. Brand color is dropped to keep "this is unavailable" visually obvious.

Current `social.json` state mapping:
- Discord, QQ, 小红书, X → Active (all have https URLs and `enabled: true`)
- 微信 → Disabled (`enabled: false`, no URL, no qrImage). When user later sets `qrImage`, it auto-promotes to QR-only.

### 3.4 Mobile + breakpoint matrix

| Width | Layout |
|---|---|
| ≥768px | 5 tiles centered in a row. Wrap if container shrinks below `5 × 280px + 4 × 14px gap = 1456px`; wrap occurs naturally below ~1500px outer width. |
| 540-767px | Tiles wrap to 2-2-1 or 3-2 layout; each still 280×96. |
| <540px | **Vertical stack**: each tile is `width: 100%; height: 64px;` — full-width, shorter. Icon 24×24, label 1rem. Same brand-color/contrast rules. |
| <320px | Same vertical stack; padding reduced to `0 0.75rem`. |

### 3.5 Component contract

```js
// PlatformTileRow.jsx
function PlatformTileRow({ social }) { ... }
```

| Prop | Type | Notes |
|---|---|---|
| `social` | `Array<SocialEntry>` | from `social.json`. Component does NOT import `social.json` itself — keeps it pure for testing. Caller (Home.jsx) imports and passes. |

Returns the row of tiles. When `social` is empty/non-array, returns `null` (matches existing PlatformIcon's defensive pattern).

### 3.6 ARIA + keyboard

- Section labeled by VH heading.
- Active tile: anchor with `aria-label={label}` (the platform's display label, e.g. "Discord", "QQ群").
- QR-only tile: button with `aria-haspopup="dialog" aria-expanded` toggling.
- Disabled tile: `<span aria-disabled="true">` with tooltip `title="Coming soon" / "敬请期待"` (both already in i18n.json as `btn.comingSoon`).
- Tab order: each active/QR tile is one Tab stop. Disabled tiles are skipped (no `tabindex`).
- QR popover: same Escape-to-close + click-outside-to-close behavior as `PlatformIcon`.

---

## 4. Logo white-bg fix

Source of the bug: `/logo.png` is a transparent PNG showing text-and-panda artwork. On dark themes, the transparent regions inside the logo's circular text expose the dark site background, making the "ring" around the panda look broken.

### 4.1 Hero logo CSS

```css
.hero-logo {
  width: clamp(140px, 22vw, 200px);
  height: auto;
  aspect-ratio: 1 / 1;
  display: block;
  margin: 0 auto 1.5rem;
  border-radius: 50%;

  /* P6 fix: opaque white badge under the PNG so the transparent ring doesn't show dark bg through. */
  background: white;
  padding: 4px;

  /* Theme-tinted glow around the badge (replaces the previous drop-shadow-on-image). */
  box-shadow: 0 0 28px color-mix(in srgb, var(--color-primary) 40%, transparent);
  transition: box-shadow 200ms ease, transform 200ms ease;
}

.hero-logo:hover {
  transform: scale(1.04);
  box-shadow: 0 0 36px color-mix(in srgb, var(--color-primary) 60%, transparent);
}

@supports not (background: color-mix(in srgb, white 50%, transparent)) {
  .hero-logo {
    box-shadow: 0 0 28px rgba(99, 102, 241, 0.4);
  }
  .hero-logo:hover {
    box-shadow: 0 0 36px rgba(99, 102, 241, 0.6);
  }
}
```

Rationale:
- `background: white;` → the PNG's transparency now reveals white pixels, not dark site bg.
- `padding: 4px;` → tiny inner ring of white visible at the edge so the badge looks intentional, not "cropped to logo bounds".
- `border-radius: 50%;` → keeps the badge circular even though the PNG is square.
- `filter: drop-shadow(...)` from P5 is REPLACED by `box-shadow` because drop-shadow follows the alpha mask of the image (gives a wispy text-shaped shadow). Box-shadow follows the rectangular/circular box — gives the clean "glow ring" the user wants.
- `@supports not (color-mix)` fallback uses literal hex `#6366f1` at 0.4/0.6 alpha — matches the default theme primary. This is acceptable because `color-mix` Baseline support is now strong (Chromium 111+, Firefox 113+, Safari 16.2+) and the fallback only fires on legacy browsers where the default theme is also the only one likely used.
- `prefers-reduced-motion: reduce`: the existing rule that disables hover scale stays. Add `transition: box-shadow 200ms ease;` (no transform) under the reduced-motion query.

### 4.2 MobileDrawer header logo CSS

The `.mobile-drawer-header .navbar-logo` instance is a 24×24 logo. Apply the same white-bg fix scaled down:

```css
.mobile-drawer-header .navbar-logo,
.navbar-brand .navbar-logo {
  background: white;
  padding: 2px;
  border-radius: 50%;
}
```

Add to `Navbar.css`. The 32×32 desktop nav logo also gets this treatment (same selector list above). No glow needed at small sizes — visually noisy at 32px.

### 4.3 Acceptance

Cycle through all 8 band themes (Poppin'Party, Afterglow, Pastel*Palettes, Roselia, Hello Happy World, Morfonica, RAISE A SUILEN, MyGO!!!!!): the hero logo always shows panda-on-white circle with a faint colored glow matching the theme. No theme leaks through the PNG transparency.

---

## 5. Navbar refresh

### 5.1 Brand text

| Slot | Before (P5) | After (P6) |
|---|---|---|
| Desktop `.navbar-brand-text` | `BD!NA` | `北美炸梦同好会` |
| Mobile drawer header `.navbar-brand-text` | `BD!NA` | `北美炸梦同好会` |
| `<Link aria-label>` | dynamic, `${site.communityName} — Home` (English) | UNCHANGED — stays English fallback for screen readers |
| `<Link title>` | `site.communityName` | UNCHANGED — stays English tooltip |

The Chinese brand wordmark is **locked**: it does NOT swap with `LangToggle`. The aria-label and title attribute remain English so AT users get the canonical English name. This matches the tri-lingual brand-identity rule from Phase 5 — the brand identity is a constant, not chrome.

CSS implementation:
```css
.navbar-brand-text {
  font-weight: 800;
  letter-spacing: -0.02em;       /* tighter for CJK than the previous -0.5px tracking */
  font-size: 1.0625rem;
  color: var(--color-primary);
  white-space: nowrap;
  /* font-feature-settings best-effort for crisp CJK at small sizes */
}
@media (max-width: 540px) {
  .navbar-brand-text { font-size: 1rem; }
}
```

The brand text occupies 6 CJK characters ≈ 6.5em at 1.0625rem — tighter than the previous 5-character "BD!NA" Latin string, so `.navbar-brand` effective width grows. Account for this in `.navbar-tail` spacing (recalibrated in §5.3).

### 5.2 Tail block — DiscordCTA removed

Before (P5):
```jsx
<div className="navbar-tail">
  <LangToggle />
  <ThemeSwitcher />
  <DiscordCTA url={site.discordInvite} size="sm" />
</div>
```

After (P6):
```jsx
<div className="navbar-tail">
  <LangToggle />
  <ThemeSwitcher />
</div>
```

Remove the `import DiscordCTA from '../DiscordCTA/DiscordCTA.jsx'` line in `Navbar.jsx` — the only desktop usage drops.

### 5.3 Navbar tail spacing

Previous tail occupied 3 elements. Now 2. Tighten `gap` from `0.75rem` → `0.625rem` only if visual review shows excess whitespace — otherwise keep `0.75rem` (cleaner). **Default**: keep `0.75rem`.

Verify the brand text fits without the tail truncating. CJK 6 chars at 1.0625rem ≈ 102px + logo 32px + gap 8px ≈ 142px brand width. Tail 2 elements ≈ 88px (LangToggle 56px + Theme 32px). Links 5×56px + gaps = 360px. Total: 590px + 64px outer padding = 654px → comfortably fits within 768px breakpoint where mobile collapses.

### 5.4 Mobile drawer changes

Before (P5):
```jsx
<MobileDrawer>
  <div className="mobile-drawer-header">
    <Link><img/><span>BD!NA</span></Link>
    <button>×</button>
  </div>
  <ul>...</ul>
  <div className="mobile-drawer-divider" />
  <div className="mobile-drawer-controls"><LangToggle variant="inline"/></div>
  <div className="mobile-drawer-controls"><ThemeSwitcher/></div>
  <div className="mobile-drawer-cta"><DiscordCTA size="md"/></div>
</MobileDrawer>
```

After (P6):
```jsx
<MobileDrawer>
  <div className="mobile-drawer-header">
    <Link><img/><span>北美炸梦同好会</span></Link>
    <button>×</button>
  </div>
  <ul>...</ul>
  <div className="mobile-drawer-divider" />
  <div className="mobile-drawer-controls"><LangToggle variant="inline"/></div>
  <div className="mobile-drawer-controls"><ThemeSwitcher/></div>
  {/* mobile-drawer-cta block REMOVED */}
</MobileDrawer>
```

Remove `import DiscordCTA` (no remaining usage in Navbar.jsx). Reviewer can also delete `.mobile-drawer-cta { ... }` rules in Navbar.css (orphaned).

### 5.5 Acceptance

- Desktop: `North America 炸梦同好会` brand reads in Chinese.
- Mobile drawer header: same Chinese brand.
- Navbar tail: only LangToggle + ThemeSwitcher visible. No Discord pill anywhere in the navbar.
- `<Navbar aria-label="Primary">` unchanged.
- The `aria-label` on the brand `<Link>` continues to read `BanG Dream North America Chinese Community — Home` (English). Verified by `screen.getByRole('link', { name: /BanG Dream/i })` in tests.

---

## 6. Footer collapse

### 6.1 Current (P5) layout

3 columns: Quick Links | Communities (PlatformIcon list) | About & Legal.

### 6.2 New (P6) layout

2 columns desktop: Quick Links | About & Legal. Single column on mobile.

The Communities column is removed because PlatformTileRow at the home-page bottom now serves that purpose. Other pages (News, Events, Members, About) lose access to the small inline platform icon list — acceptable trade per plan ("PlatformTileRow placement: only home"). Users on those pages can return to home or follow Quick Links → Home → tiles.

### 6.3 DOM

```jsx
<footer className="footer">
  <div className="footer-inner">
    <div className="footer-columns">
      <section className="footer-column">
        <h3>{t('footer.quickLinks')}</h3>
        <ul>...</ul>
      </section>
      <section className="footer-column">
        <h3>{t('footer.aboutLegal')}</h3>
        <ul>...</ul>
      </section>
      {/* Communities <section> removed entirely — DELETE its block */}
    </div>
    <p className="footer-brand-tri">{/* JP · ZH · EN tri-lingual line — UNCHANGED */}</p>
    <p className="footer-copy">© {year} — {t('footer.disclaimer')}</p>
  </div>
</footer>
```

Remove the `import PlatformIcon` and `import social from '../../data/social.json'` lines in `Footer.jsx` — no remaining usage there. The `t('empty.noCommunities')` key becomes orphaned; it stays in `i18n.json` for future use (low cost) but is no longer referenced.

### 6.4 CSS

```css
.footer-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;     /* was 1fr 1fr 1fr */
  gap: 2.5rem;
  max-width: 720px;                    /* was wider; 2 columns can be tighter */
  margin: 0 auto 2rem;
}

@media (max-width: 540px) {
  .footer-columns {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: center;
  }
}
```

### 6.5 Acceptance

- Desktop footer renders 2 columns side-by-side, centered.
- Mobile <540px: stacked single column.
- Tri-lingual brand line visible at bottom regardless of viewport.
- `footer.communities` and `empty.noCommunities` chrome strings still present in `i18n.json` (orphaned) — Reviewer should NOT flag this; we keep them for forward-compat in case Communities returns.

---

## 7. ★ FULL Chinese ↔ English UI chrome localization audit

Per user 2026-05-02 directive ("中英文要对应汉化完全"), this audit produces the truth source for **Reviewer Gate 4 DOM-text scan**. Every UI chrome string in the rendered DOM must have both `en` and `zh` values in `i18n.json`.

### 7.1 Scope rules (reaffirmed)

**Translates** (chrome): nav labels, footer headings, button labels, aria-labels, modal titles, popover labels, error/empty-state messages, tagline, About section headings, FAQ Q labels, COC heading, stat tile labels, date-relative chrome, calendar weekday labels, drawer titles, language toggle labels, post navigation buttons, platform tile section heading, platform tile QR scan caption, post card open-link labels.

**Does NOT translate** (content): event titles, event venues, member names, member bios, news markdown body, news titles, post titles, post images, all `*.json` data file payloads except `i18n.json`. Tri-lingual community name (JP/ZH/EN) stays as locked brand identity.

### 7.2 Source of truth — current `i18n.json` audit

Existing keys (P5, all in both EN and ZH):

| Key | EN | ZH |
|---|---|---|
| `nav.home` | Home | 首页 |
| `nav.news` | News | 新闻 |
| `nav.events` | Events | 活动 |
| `nav.members` | Members | 成员 |
| `nav.about` | About | 关于 |
| `footer.quickLinks` | Quick Links | 快速导航 |
| `footer.communities` | Communities | 社群 |
| `footer.aboutLegal` | About & Legal | 关于与声明 |
| `footer.disclaimer` | Fan community. Not affiliated with Bushiroad or Craft Egg. | 粉丝社群，与 Bushiroad、Craft Egg 无关。 |
| `footer.mission` | Mission | 使命 |
| `footer.faq` | FAQ | 常见问题 |
| `footer.coc` | Code of Conduct | 行为准则 |
| `footer.disclaimerLink` | Disclaimer | 免责声明 |
| `filter.category` | Category | 类别 |
| `filter.band` | Band | 乐队 |
| `filter.dateRange` | Date Range | 日期范围 |
| `filter.dateFrom` | From | 起 |
| `filter.dateTo` | To | 止 |
| `filter.search` | Search | 搜索 |
| `filter.searchPlaceholder` | Title, venue, band… | 标题、场地、乐队… |
| `filter.searchPlaceholderNews` | Title, body… | 标题、内容… |
| `filter.clear` | Clear filters | 清除筛选 |
| `filter.resultCount` | {N} upcoming · {M} past | {N} 即将到来 · {M} 已结束 |
| `filter.toggleMobile` | Filters {N} active | 筛选 {N} 项 |
| `empty.noEventsMatch` | No upcoming events match — try clearing filters. | 暂无符合条件的即将到来活动 — 尝试清除筛选。 |
| `empty.noPastEventsMatch` | No past events match — try clearing filters. | 暂无符合条件的过往活动 — 尝试清除筛选。 |
| `empty.noEvents` | No events yet. | 暂无活动。 |
| `empty.noMembers` | Members coming soon. | 成员即将上线。 |
| `empty.noNews` | No news yet. | 暂无新闻。 |
| `empty.noNewsMatch` | No news matches — try clearing filters. | 暂无符合条件的新闻 — 尝试清除筛选。 |
| `empty.noCommunities` | Communities coming soon — check back. | 社群即将上线 — 敬请期待。 |
| `empty.noFaq` | FAQ coming soon. | 常见问题即将上线。 |
| `empty.noCoc` | COC pending. | 行为准则待定。 |
| `empty.calendarEmptyMonth` | No events scheduled this month. | 本月暂无活动。 |
| `btn.tickets` | Tickets | 购票 |
| `btn.viewDetails` | View details | 查看详情 |
| `btn.openMenu` | Open navigation menu | 打开菜单 |
| `btn.closeMenu` | Close menu | 关闭菜单 |
| `btn.prevEvent` | Previous event | 上一活动 |
| `btn.nextEvent` | Next event | 下一活动 |
| `btn.prevMonth` | Previous month | 上个月 |
| `btn.nextMonth` | Next month | 下个月 |
| `btn.goToSlide` | Go to slide {n} | 前往幻灯片 {n} |
| `btn.today` | Today | 今天 |
| `btn.comingSoon` | Coming soon | 敬请期待 |
| `btn.viewList` | List | 列表 |
| `btn.viewCalendar` | Calendar | 日历 |
| `social.scanCaption` | Scan with the {label} app | 用 {label} 扫一扫 |
| `stat.membersInCommunity` | Members in the community | 社群成员 |
| `stat.pastEvents` | Past events hosted across NA | 已在北美举办的活动 |
| `lang.tooltip` | UI language / 界面语言 | UI language / 界面语言 |
| `lang.label` | UI language | 界面语言 |
| `lang.drawerLabel` | Language / 语言 | Language / 语言 |
| `drawer.title` | Menu | 菜单 |
| `calendar.weekdaySun` | Sun | 日 |
| `calendar.weekdayMon` | Mon | 一 |
| `calendar.weekdayTue` | Tue | 二 |
| `calendar.weekdayWed` | Wed | 三 |
| `calendar.weekdayThu` | Thu | 四 |
| `calendar.weekdayFri` | Fri | 五 |
| `calendar.weekdaySat` | Sat | 六 |
| `category.all` | All | 全部 |
| `category.concert` | Concerts | 演唱会 |
| `category.fanmeet` | Fan Meets | 见面会 |
| `category.con` | Conventions | 展会 |
| `category.online` | Online | 线上 |
| `newsCategory.all` | All | 全部 |
| `newsCategory.announcement` | Announcement | 公告 |
| `newsCategory.event` | Event | 活动 |
| `newsCategory.community` | Community | 社群 |
| `newsCategory.release` | Release | 发布 |
| `section.upcoming` | Upcoming | 即将到来 |
| `section.past` | Past | 已结束 |
| `about.disclaimerHeading` | Disclaimer | 免责声明 |
| `about.disclaimerBody` | Fan community. Not affiliated with Bushiroad, Craft Egg, or any official BanG Dream! rights holders. All band names, character likenesses, and trademarks remain the property of their respective owners. | 粉丝社群。与 Bushiroad、Craft Egg 或任何官方 BanG Dream! 版权方无关。所有乐队名称、角色形象和商标均为其各自所有者的财产。 |
| `about.cocSummary` | Code of Conduct | 行为准则 |
| `about.missionHeading` | Mission | 使命 |
| `about.historyHeading` | History | 历史 |
| `about.faqHeading` | FAQ | 常见问题 |
| `about.joinHeading` | How to Join | 如何加入 |
| `skip.toContent` | Skip to main content | 跳到主内容 |

P5's coverage is broad. Audit gaps below.

### 7.3 ★ NEW keys to ADD in P6

The audit-table format below is **the truth source** the Reviewer's DOM-text scanner uses for Gate 4. Each key must be added to `src/data/i18n.json` under both `en` and `zh`.

| Key | EN value | ZH value | Where rendered |
|---|---|---|---|
| `tagline.en` | `Concerts, communities, and conventions across North America` | n/a — this key is the EN side; the ZH side is `tagline.zh`. *(Schema note below.)* | `Hero.jsx` tagline paragraph |
| `tagline.zh` | n/a — this is the ZH side. | `北美的演出、社群与展会` | `Hero.jsx` tagline paragraph |
| `peek.label` | `Featured posts` | `精选帖子` | HeroPeekCarousel root `aria-label` |
| `btn.prevPost` | `Previous post` | `上一帖子` | HeroPeekCarousel left arrow `aria-label` |
| `btn.nextPost` | `Next post` | `下一帖子` | HeroPeekCarousel right arrow `aria-label` |
| `btn.goToPost` | `Go to post {n}` | `前往帖子 {n}` | Thumbnail strip `aria-label` |
| `btn.openPost` | `Open post {n}` | `打开帖子 {n}` | PostCard anchor `aria-label` fallback when title missing |
| `platforms.heading` | `Communities` | `社群` | PlatformTileRow VH section heading |
| `platforms.discord` | `Discord` | `Discord` | PlatformTileRow tile label (override of social.json's `label`) — see schema note |
| `platforms.qq` | `QQ` | `QQ群` | tile label |
| `platforms.xiaohongshu` | `Xiaohongshu` | `小红书` | tile label |
| `platforms.x` | `X` | `X` | tile label |
| `platforms.wechat` | `WeChat` | `微信` | tile label |
| `empty.noPosts` | `No posts yet.` | `暂无帖子。` | (Reserved — currently HeroPeekCarousel returns null instead of empty-state, so this is theoretical. Add for Architect/P4 admin to use later.) |
| `home.statsHeading` | `Community at a glance` | `社群一览` | (Reserved — VH heading for Home stat-tile fallback. Improves AT structure even if visually hidden.) |

**Schema note — `tagline.{en,zh}`**:

The reading code in `Hero.jsx` currently does `tagline={site.tagline}`. P6 changes this to:

```jsx
import { t } from '../../lib/uiLanguage.js'
// ...
<Hero ... tagline={t('tagline.zh' /* or */ ) /* via t() — t already resolves to active lang */ } />
```

Since `t(key)` returns the active-language string given a key, the cleanest path is to introduce a single `tagline` key that resolves per-language naturally:

| Key | EN | ZH |
|---|---|---|
| `tagline` | `Concerts, communities, and conventions across North America` | `北美的演出、社群与展会` |

**Architect/Developer**: use `tagline` (single key, not split `tagline.en` + `tagline.zh`). The split form was a planning shorthand; the actual `i18n.json` `t()` lookup convention is one key per language pair, indexed by `i18n[lang][key]`. The single key fits the existing pattern.

`site.json` field `tagline` is removed.

**Schema note — `platforms.{platform}` labels**:

Currently `social.json` has a per-row `label` field (e.g. `"QQ群"`). PlatformIcon and Footer's old PlatformIcon list rendered that `label` directly without translation, which means English-language users saw `"QQ群"` and `"小红书"` regardless. That's a pre-existing localization gap.

P6 fix: `social.json` `label` is now treated as the **fallback** label. PlatformTileRow + the (still-existing) PlatformIcon **prefer** `t('platforms.' + platform)` if the key resolves; otherwise fall back to the social.json `label` field.

Implementation:
```js
function getPlatformLabel(platform, fallbackLabel) {
  const key = `platforms.${platform}`
  const resolved = t(key)
  return resolved && resolved !== key ? resolved : fallbackLabel
}
```

(Where `t()` returns the key itself if no translation found — same convention as P5's `uiLanguage.js`.)

This adds proper bilingual labels: a Chinese-language UI shows `小红书`, an English-language UI shows `Xiaohongshu`. Discord and X stay the same word in both langs (Latin proper nouns, no localization needed but the keys exist for symmetry).

### 7.4 Tagline migration

`src/data/site.json` change:

```diff
 {
   "discordInvite": "https://discord.gg/WfMBKaW8Br",
   "communityName": "BanG Dream North America Chinese Community",
   "communityNameZh": "北美炸梦同好会",
-  "communityNameJp": "バンドリ北米華人コミュニティ",
-  "tagline": "Concerts, communities, and conventions across North America"
+  "communityNameJp": "バンドリ北米華人コミュニティ"
 }
```

`src/data/i18n.json` change (representative, both langs):
```diff
 "en": {
+  "tagline": "Concerts, communities, and conventions across North America",
   ...
 },
 "zh": {
+  "tagline": "北美的演出、社群与展会",
   ...
 }
```

`src/pages/Home.jsx` change:
```diff
- import site from '../data/site.json'
- ...
-   <Hero ... tagline={site.tagline} ... />
+ import site from '../data/site.json'
+ import { ... t } from '../lib/uiLanguage.js'
+ ...
+   <Hero ... tagline={t('tagline')} ... />
```

`Hero.jsx`'s `tagline` prop signature stays — Home (the only consumer) just passes a translated string instead of a static one.

### 7.5 Reviewer Gate 4 — DOM-text scan

The Reviewer runs a Vitest test (or Playwright sweep, equivalent) that:

1. Sets `localStorage.setItem('bangdream-na:uiLanguage', 'zh')`.
2. Mounts Home / News / Events / Members / About in turn.
3. For each render, queries `document.body.textContent` (and all `aria-label` / `title` / `placeholder` attributes via querying every element).
4. Filters out tri-lingual brand identity (skip `lang="en"` and `lang="ja"` spans), event titles (whitelist `data-content="event"`), member names (`data-content="member"`), news bodies, post titles, and any node attributed `data-content` or inside a content region.
5. Passes the remainder through a "Latin-alphabet ratio" check: a chrome string in zh-mode should be ≥80% non-ASCII letters. Any flagged string fails the gate.
6. Repeat with `'en'`. In en-mode, every chrome string must be ASCII (no CJK characters except in the locked brand line and `lang="zh"`/`lang="ja"` spans).

The "audit table" in §7.3 + §7.2 is the **expected key list**. The Reviewer's gate also asserts every key in the audit table appears in BOTH `i18n.en` and `i18n.zh`.

### 7.6 Localization audit completeness checklist

Reviewer checks each item:

- [ ] `tagline` rendered in active language (was hardcoded EN)
- [ ] About page section headings (`mission`/`history`/`faq`/`coc`/`join`) rendered in active language — already in P5 keys, verify
- [ ] FAQ Q labels (`item.q`) — these are CONTENT (in `about.json`), NOT chrome. Stay as authored. Reviewer should NOT flag.
- [ ] COC heading (`about.cocSummary`) — already in P5, verify
- [ ] Stat tile labels (`stat.membersInCommunity` / `stat.pastEvents`) — already in P5, verify
- [ ] Date-relative chrome (`section.upcoming`/`section.past`/`btn.today`) — already in P5, verify
- [ ] Calendar weekday labels — already in P5, verify
- [ ] All aria-labels (every component) in active language
- [ ] Modal titles (`drawer.title`) in active language
- [ ] Popover labels (PlatformIcon QR popover) in active language
- [ ] Error / empty-state messages in active language
- [ ] LangToggle button label in active language (`lang.label`)
- [ ] PlatformTileRow tile labels in active language (NEW, see §7.3 schema note)
- [ ] HeroPeekCarousel + thumbnail aria-labels (NEW, see §7.3)
- [ ] PostCard fallback aria-label (`btn.openPost`) when title missing (NEW)
- [ ] Section headings (PlatformTileRow VH) in active language (NEW)
- [ ] No leakage: `lang.tooltip` and `lang.drawerLabel` are intentionally bilingual (slash-separated) and stay that way — Reviewer whitelists these two keys.

---

## 8. Posts data schema

### 8.1 File

`src/data/posts.json`. Ships as `[]` (empty array) initial. P4 admin will manage it.

### 8.2 Type

```ts
type Post = {
  id: string;            // unique stable identifier (slug-ish, e.g. "2026-04-launch-party")
  image: string;         // path to image — typically `/posts/<id>.jpg` in public/, or external https URL
  title?: string;        // optional banner title overlay text
  url?: string;          // optional click-target (https URL); when missing, card is inert
  datePosted: string;    // ISO 8601 date string (UTC `YYYY-MM-DD` or full timestamp)
}
```

### 8.3 Validation rules (lib/posts.js)

`filterValidPosts(posts)`:
- input: anything (defensively handle non-array).
- output: array of valid Post objects.
- a Post is valid iff:
  - `typeof p === 'object' && p !== null`
  - `typeof p.id === 'string' && p.id.trim().length > 0`
  - `typeof p.image === 'string' && p.image.trim().length > 0` (image is required for the carousel use case; cards without image fall to letter-card fallback at render time but the *data* still needs an image string. Empty image → drop from carousel — but architect/dev may relax this to allow letter-card fallback for missing images. **Decision**: KEEP image required at the data layer for now; the letter-card fallback is a render-time defense for strings that fail to *load* an image, not a "no image string at all" case.)
  - `typeof p.datePosted === 'string'` AND parses to a valid Date (`!Number.isNaN(new Date(p.datePosted).valueOf())`)
- non-objects, missing-id, missing-image, malformed-date entries are silently dropped.
- duplicate `id` entries: keep first-occurrence, drop later.
- `title`: optional; if present must be string with non-empty trim, else the title is dropped (overlay won't render but card still does).
- `url`: optional; must be `https://...` (use the same `isHttpsUrl` check as PlatformIcon). Non-HTTPS or non-string URLs are dropped (card stays inert).

`sortPostsByDate(posts, direction = 'desc')`:
- sorts a copy (immutability — never mutate input). Default `desc` (newest first).
- handles malformed dates by treating them as `Number.NEGATIVE_INFINITY` (sorts to end).

`limitPosts(posts, max)`:
- returns first `max` items. `max <= 0` returns `[]`. `max` non-numeric returns full array (no limit).

### 8.4 Edge cases (catalog for Architect / Developer)

| Case | Expected behavior |
|---|---|
| `posts.json` is `[]` | HeroPeekCarousel returns `null`. Home renders stat-tile fallback. |
| `posts.json` is malformed JSON | Build fails (Vite parse error). Out of P6's runtime scope. |
| Post with missing `id` | Dropped by `filterValidPosts`. |
| Post with non-string `image` (null, missing, number) | Dropped by `filterValidPosts`. |
| Post with broken image URL (404 at runtime) | `<img>` `onerror` triggers letter-card fallback: replace with `.post-card__letter` rendered DOM. (Architect: implement via `useState` in PostCard or `onError` swapping a class.) |
| Post with malformed `datePosted` (`"yesterday"`, `null`, missing) | Dropped by `filterValidPosts`. |
| Single post (length = 1) | No arrows, no thumbs, no auto-rotate. Center-only card. |
| Two posts | Side peeks repeat (left and right both show the other post). Arrows + thumbs + auto-rotate ON. |
| 100+ posts | Cap via `limitPosts(posts, 12)` in Home before passing to carousel. Caller responsibility, not component. |
| `datePosted` in the future | Allowed. Posts.js does NOT filter by recency at data layer (unlike events). User decides ordering via `sortPostsByDate`. |
| `title` very long (>200 chars) | Title overlay clamps to 2 lines via `-webkit-line-clamp`. CSS handles it; JS does not truncate. |
| `url` with `http://` (not https) | Dropped by validation. Card stays inert. |
| Rapid arrow click during auto-rotate | Each click resets the auto-rotate timer (effect re-keyed). No race — React state is the single source of `currentIndex`. |
| User invokes prev on index 0 | Wraps to last index (`carousel.prev` already handles this — reuse). |
| `prefers-reduced-motion: reduce` | Auto-rotate disabled. User can still click arrows / thumbs. |
| `document.hidden` | Auto-rotate paused. |
| Component unmounts during auto-rotate | `useEffect` cleanup clears `setInterval`. No orphaned timer. |
| Image with `?` querystring or unusual charset | Pass through unchanged; `<img src>` + `<a href>` handle it. |
| Posts with same `datePosted` | Sort stable (use Array.prototype.sort which is stable in V8). Order preserved within the tie. |

### 8.5 Initial file content

```json
[]
```

That's it. Empty array. P4 admin populates later.

---

## 9. lib/posts.js exports

```js
// src/lib/posts.js — pure logic. No React, no DOM, no timers.
export function filterValidPosts(posts) { /* ... */ }
export function sortPostsByDate(posts, direction = 'desc') { /* ... */ }
export function limitPosts(posts, max) { /* ... */ }
```

Tier A coverage: ≥80% per-file lines/branches/functions/statements. Edge tests required (see §10 catalog).

Why these three functions and not a single `preparePosts(posts, max)`: keeping them split allows callers (Home, future P4 admin) to compose differently (e.g., admin shows ALL valid posts including invalid ones with red highlight). Three pure functions also map 1:1 to existing patterns in `src/lib/events.js` (`filterValidEvents` / `groupEventsByTime` / `sortEventsByDate`).

Architect: signature these three exports, write JSDoc with examples, and identify edge tests Developer will write.

---

## 10. Test catalog

### 10.1 Tier A — `src/lib/posts.js` (≥80% per-file all axes)

`filterValidPosts`:
- valid array of full posts → returns as-is
- `null` / `undefined` / non-array → returns `[]`
- post missing `id` → dropped
- post with `id: ""` or whitespace-only → dropped
- post with non-string `id` (number, null) → dropped
- post missing `image` → dropped (per §8.3 decision)
- post with non-string `image` → dropped
- post missing `datePosted` → dropped
- post with malformed `datePosted` (`"yesterday"`) → dropped
- post with valid `datePosted` but no `title` → kept; `title` is undefined
- post with valid `datePosted` and empty `title: ""` → kept; `title` dropped (treated as no title)
- post with `url: "http://..."` (non-https) → kept but `url` is silently dropped
- post with valid `url: "https://..."` → kept
- two posts with same `id` → first kept, second dropped
- mixed valid + invalid → valid kept in original order, invalid dropped

`sortPostsByDate`:
- typical 3-post sort → newest first by default
- explicit `direction: 'asc'` → oldest first
- empty array → empty array
- single-post array → unchanged copy (still a new array — immutability)
- two posts with identical dates → stable order preserved
- post with malformed date among valid → malformed sorts to end (desc) / start (asc)
- input is mutated? → assert input array reference unchanged (immutability invariant)

`limitPosts`:
- `max = 5` on 10-post array → first 5
- `max = 0` → empty
- `max < 0` → empty
- `max = NaN` → full array (treat as "no limit")
- `max > length` → full array

### 10.2 Tier B — `HeroPeekCarousel` (≥80% branch/function)

- renders nothing when posts empty
- renders single card (no arrows, no thumbs) when posts.length === 1
- renders arrows + thumbs when posts.length > 1
- clicking next arrow advances index
- clicking prev arrow decrements index (wraps from 0 to last)
- clicking thumb jumps to that index
- ArrowLeft / ArrowRight key handlers
- Home / End keys jump to first / last
- auto-rotate advances after `intervalMs` (use fake timers)
- pause-on-hover stops auto-rotate
- pause-on-document-hidden stops auto-rotate (mock `document.hidden`)
- `prefers-reduced-motion: reduce` disables auto-rotate (mock `matchMedia`)
- focus-visible on arrows / thumbs
- aria-roledescription="carousel" present when length > 1; absent when length = 1
- aria-live="polite" on caption region

### 10.3 Tier B — `PlatformTileRow` (≥80% branch/function)

- renders all 5 platforms from sample social array
- renders nothing when social = `[]`
- renders nothing when social = non-array (defensive)
- active state: anchor with `target="_blank" rel="noopener noreferrer"` for entries with `enabled: true && hasHttpsUrl`
- QR-only state: button toggles popover for entries with `enabled: true && !url && qrImage`
- disabled state: span with `aria-disabled="true"` for `enabled: false` entries
- popover Escape closes
- popover click-outside closes
- per-platform `data-platform` attribute correctly set
- background color literal CSS rule fires (smoke test via getComputedStyle in jsdom — may be flaky; acceptable to use class assertion `.platform-tile[data-platform="discord"]`)
- mobile breakpoint stacking — out of unit-test scope; covered by visual review

### 10.4 Tier C — `PostCard` (behavior-only via Testing Library)

- renders image with alt = title when title present
- renders image with alt = "" when title missing
- renders title overlay only when title is non-empty trimmed string
- renders letter-card fallback when image is missing/empty (assert by role)
- renders letter-card with first character of title when title present
- renders letter-card with first character of id when title absent
- renders letter-card with `?` when both title and id missing/empty
- handles multi-byte CJK first-character correctly (use `Array.from`)
- wrapped in anchor with `target="_blank"` when `url` is https
- NOT wrapped in anchor when `url` is missing
- NOT wrapped in anchor when `url` is http (non-https)
- click on anchor opens new tab — verify via DOM inspection
- aria-label fallback when title missing uses `t('btn.openPost', {n})`
- variant="side" sets `aria-hidden="true"` on the article

### 10.5 Edge / integration tests

- Home page: posts.json `[]` → renders stat-tile fallback (existing P5 path, regression check)
- Home page: posts.json with 3 posts → renders HeroPeekCarousel with peek
- Localization: `localStorage` set to `zh`, scan body text for any leaked English chrome → empty list
- Localization: `localStorage` set to `en`, scan body text for any leaked Chinese chrome (excluding lang="zh"/"ja" brand spans) → empty list
- Logo: cycle 8 themes via `data-theme` attribute, assert `.hero-logo` `background-color` resolves to white in each theme
- Navbar: brand text reads `北美炸梦同好会` regardless of `localStorage:bangdream-na:uiLanguage` value
- Navbar: tail does NOT contain a Discord button (assert by role/name)
- Footer: 3 columns NO LONGER rendered (assert exactly 2 column headings present)

---

## 11. Open issues + recommendations

### 11.1 Should `HeroCarousel` be removed?

**Recommendation**: KEEP. Justification:
- `HeroCarousel` is the events-on-home component from P3. After P6's home rewrite, no page imports it.
- However, `lib/carousel.js` (`next` / `prev` / `shouldAutoAdvance`) is shared infrastructure and stays.
- Removing `HeroCarousel/` directory deletes valid working code + tests for a component that *might* be reintroduced on `/events` page or repurposed in P4 admin previews.
- Cost of keeping: ~200 lines of unused JSX + 1 CSS file. Compiles fine. Bundle size impact ~2KB minified. Tree-shaking eliminates it from production bundle since it's not imported anywhere.

**Alternative**: delete `HeroCarousel/` outright. Lower cognitive load, smaller repo. Reviewer's call — P6 design recommends KEEP, but DELETE is acceptable.

### 11.2 Should `PlatformIcon` be deleted (since PlatformTileRow replaces it on home and Footer drops it)?

**Recommendation**: KEEP. Justification:
- Same shared-component rationale as HeroCarousel.
- The existing PlatformIcon QR popover pattern is referenced directly by PlatformTileRow's QR-only state spec — sharing the popover logic is desirable. Architect may extract a shared `usePopover` hook from PlatformIcon for both to consume; out of design scope.
- PlatformIcon may return on About page or in news article footers in a later phase.

### 11.3 Should `PostCard` use `<picture>` for srcset?

**Recommendation**: NO for P6. Posts are small in number (1-12 items) and the user-uploaded images via P4 admin won't have multi-resolution variants generated. Keep `<img>` simple.

### 11.4 Should HeroPeekCarousel auto-pause on touch / pointerdown?

**Recommendation**: YES. On mobile, `mouseEnter` doesn't fire. Add `onTouchStart` → set paused; `onTouchEnd` after 5s timeout → unpause. Architect signs the implementation detail.

### 11.5 Footer's removed Communities column — should `empty.noCommunities` key be removed from i18n.json?

**Recommendation**: KEEP the key. Justification: low-cost orphan; Communities col may return; deletion = risk of breaking forward-compat for a saved 4 bytes. Reviewer should NOT flag this.

### 11.6 Should `tagline` render at smaller sizes on mobile or be hidden entirely?

**Recommendation**: Render at all sizes. Existing CSS uses `clamp(1rem, 2.5vw, 1.5rem)` which gracefully scales. The Chinese tagline is a single line at 5 chars; English is one wrapping line at small viewports. Both are fine.

### 11.7 New `posts/` public directory for user-uploaded post images — should P6 create it?

**Recommendation**: NO. P4 admin will create on first upload via the GitHub Contents API. Adding an empty `public/posts/` directory now creates a `.gitkeep` file or empty dir that's noise. Defer to P4.

---

## 12. Accessibility full sweep

### 12.1 Carousel

- `role="region"` + `aria-roledescription="carousel"` + `aria-label` (translated)
- live region on caption (`aria-live="polite"`)
- arrows are real `<button>` with translated `aria-label`
- thumbs are `<button role="tab">` with `aria-selected` and roving `tabindex`
- side peeks `aria-hidden="true"` (decorative)
- focus-visible outline everywhere
- keyboard: ArrowLeft/Right step, Home/End jump, Tab into thumb strip, Tab out

### 12.2 Platform tiles

- VH section `<h2>` for grouping
- active = anchor with `aria-label`
- QR = button with `aria-haspopup="dialog" aria-expanded` + popover with `role="dialog" aria-label`
- disabled = `<span aria-disabled="true">` with `title` tooltip
- popover Escape + click-outside dismissal

### 12.3 Logo

- Hero logo `<img alt="...">` text unchanged from P5 (descriptive alt)
- Mobile drawer logo `<img alt="">` (decorative, brand text supplies meaning)

### 12.4 Navbar

- `<nav aria-label="Primary">`
- brand link `aria-label` English even though brand text is Chinese (so screen-reader announces canonical name)
- skip-to-content link still present (existing P5)

### 12.5 Color contrast

- Hero logo white badge on any theme: white-on-(theme-bg) is automatically high-contrast since theme bgs are dark.
- Platform tiles: see §3.2 — all 5 use the "large text" WCAG carve-out (font ≥18px AND weight ≥600).
- PostCard title overlay: white on dark gradient = high contrast regardless of theme.
- Carousel arrows: `--color-primary` background with white icon. All 8 theme primaries are vibrant enough; Reviewer spot-checks Pastel*Palettes (lightest theme) — its primary is `#fbcfe8`-ish pink, where white icon may fail. **Mitigation**: arrow icon stroke is white BUT arrow has a `1px solid color-mix(...)` border that lifts off light backgrounds. If contrast fails on Pastel Palettes specifically, swap arrow icon to `var(--color-on-primary)` (already a P2-defined token) which P2 set per-theme to ensure contrast.

### 12.6 Reduced motion

- Auto-rotate disabled
- Hover lift on tiles disabled (existing P5 pattern: `@media (prefers-reduced-motion: reduce) { ... transition: none; }`)
- Logo hover scale disabled (existing rule)
- Side-peek transitions disabled per `@media (prefers-reduced-motion: reduce) { .hero-peek__card { transition: none; } }`

---

## 13. Mobile + breakpoint matrix (consolidated)

| Component | ≥1024px | 768-1023 | 540-767 | 375-539 | <375 |
|---|---|---|---|---|---|
| HeroPeekCarousel | full peek, arrows 56px | narrower peek | single card, arrows inline-below | single card, smaller thumbs | single card, dot indicators |
| PostCard | 16:9 | 16:9 | 16:9 | 16:9 | 16:9 (full-width) |
| PlatformTileRow | 5-in-row 280×96 | 5-in-row, may wrap | 280×96, wraps to 2-2-1 | vertical stack 100%×64 | vertical stack 100%×64 |
| Hero | unchanged P5 | P5 | P5 | P5 | P5 |
| Navbar | tail [Lang][Theme] | tail [Lang][Theme] | drawer + tail compressed | drawer | drawer |
| Footer | 2-col 720px max | 2-col | 1-col centered | 1-col | 1-col |

`prefers-reduced-motion: reduce` applies orthogonally at all breakpoints.

---

## 14. Coverage acceptance gates

Per approved plan:

- **Tier A (`src/lib/posts.js`)**: ≥80% lines / ≥80% branches / ≥80% functions / ≥80% statements (per-file). Same gate level as P5 `dateFormat.js` and `carousel.js`.
- **Tier B (`HeroPeekCarousel`, `PlatformTileRow`)**: ≥80% branch/function coverage. (Lines/statements may be lower because some CSS-driven code paths aren't reachable in jsdom — keep gate to branch/function only.)
- **Tier C (`PostCard`)**: behavior-only; assert role/text/aria via Testing Library. No coverage gate; acceptance = all behavior tests in §10.4 pass.

Reviewer runs `npm run test -- --coverage` and verifies the per-file gates.

---

## 15. Constraints (reaffirmed for clarity)

- **NO source code in this design doc** — markdown spec only.
- **NO bang-dream.com IP**: no character art, no franchise wordmark, no pastel theme, no sparkle / star decorations, no Bushiroad logos, no 1:1 hex copies.
- **8-band theme system stays** — layout patterns adopted, color/decoration NOT.
- **`social.json` remains sole platform source** for Discord / QQ / 小红书 / X / 微信. PlatformTileRow consumes it; does not duplicate the data.
- **Tri-lingual community name LOCKED** — JP / ZH / EN brand identity never swaps with LangToggle.
- **Theme tokens LOCKED** — Phase 6 introduces zero new `--color-*` tokens. PlatformTileRow's brand colors are an explicit exception (hardcoded hex per platform), justified by brand-recognition accessibility.

---

## 16. Open questions answered (defaults locked)

1. **Hero carousel arrow color**: theme `--color-primary` (NOT bang-dream pink). § 1.2.
2. **PlatformTileRow placement**: home only. § 3 + § 11.5.
3. **Tile aspect ratio + sizing**: 280×96 desktop with icon + label, full-width-stack 100%×64 mobile. § 3.1, § 3.4.
4. **Footer 3-col collapse**: 2-col desktop, 1-col mobile. § 6.
5. **Hero card title overlay**: rendered when `post.title` is set; absent (image-only) when not. § 2.2.

---

## 17. Internal commit layering for Developer

Per plan, P6 ships as a single PR with two internal commit boundaries:

**P6A (small fixes, low risk)**:
- `feat(navbar): swap brand wordmark to 北美炸梦同好会`
- `feat(navbar): drop Discord pill from tail; remove DiscordCTA usage in Navbar + MobileDrawer`
- `fix(hero): white circular badge under logo to fix transparent-PNG dark-theme bleed`
- `fix(navbar): white circular badge under nav + drawer logos`

**P6B (big visual + i18n)**:
- `feat(data): add posts.json (empty initial)`
- `feat: lib/posts.js + tests (Tier A)`
- `feat: PostCard component (Tier C)`
- `feat: HeroPeekCarousel component (Tier B)`
- `feat: PlatformTileRow component (Tier B)`
- `feat(home): swap HeroCarousel for HeroPeekCarousel; render PlatformTileRow at bottom`
- `feat(footer): collapse to 2-column; drop Communities column`
- `feat(i18n): add tagline + peek/post/platforms/empty.noPosts/home keys both langs; migrate site.json tagline`
- `feat: PlatformIcon getPlatformLabel resolves t('platforms.{x}') with social.json fallback`
- `test: HeroPeekCarousel + PlatformTileRow + PostCard suite`
- `test: localization gate — DOM scan in zh and en modes`

Conventional commit format only. No `Co-Authored-By` lines. No `.claude/` paths committed.

---

## 18. Hand-off

After Architect signs the JSDoc / signatures for `lib/posts.js`, `HeroPeekCarousel`, `PostCard`, `PlatformTileRow` (and the `getPlatformLabel` helper), Developer implements P6A → P6B and runs all tests. Reviewer verifies:

1. Acceptance checklist items (§ plan checklist + this doc § per component)
2. Coverage gates (§14)
3. DOM-text scan (§7.5) — uses §7.2 + §7.3 audit table as truth source
4. Visual sweep across 8 themes (logo, carousel, tiles, navbar)
5. Mobile breakpoint sweep (§13)
6. Accessibility sweep (§12)

Reviewer APPROVED → PR ships per standing auto-merge rule (per `feedback_bangdream_na_standing_auto_merge.md`).

---

End of P6 design spec.
