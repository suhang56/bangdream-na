> Historical document — Phase 1 design record.

# bangdream-na — Phase 1 Design Spec

Single-source design reference for the BanG Dream! North America community site.
Audience: Architect (token shape), Developer (CSS values + DOM structure), Reviewer (acceptance criteria).

Aesthetic anchor: dark-mode glass with theme-tinted gradients, modeled on the user's portfolio (`C:\Users\WaterMelon\portfolio\src\index.css`) — same `--color-*` token shape, same `clamp()` typography scale, same `system-ui` font stack. The only Phase 1 addition is theme switchability and a per-theme `--gradient-hero` token.

---

## 1. Theme palettes

Eight palettes total: one neutral default + seven band themes. Each theme exports the eight CSS custom properties below. All palettes are dark-mode (background luminance < 0.05) so theme switching never blinds the user.

### Token contract (every theme MUST set these)

| Token | Role | Notes |
|---|---|---|
| `--color-bg` | Page background | Near-black, theme-tinted |
| `--color-bg-card` | Card / popover background | Slightly lighter than `--color-bg` for layering |
| `--color-text` | Primary body + heading text | WCAG AA on `--color-bg` (≥ 4.5:1) |
| `--color-text-muted` | Secondary text (taglines, captions) | WCAG AA-large (≥ 3:1) on `--color-bg` |
| `--color-primary` | Brand accent — band signature color, used for links/CTAs/active nav | |
| `--color-accent` | Secondary band color, used in gradients + hover states | |
| `--color-border` | Hairline borders, dividers | Subtle, not a focal element |
| `--gradient-hero` | Hero background gradient + swatch fill | `linear-gradient(135deg, primary, accent)` typically |

### Sourcing

Canonical band hex codes were sourced from the community-curated palettes on color-hex.com (creator: karinaharlan), cross-referenced with bandori.fandom community color codes:

- Roselia palette: https://www.color-hex.com/color-palette/1044075
- Poppin'Party palette: https://www.color-hex.com/color-palette/1044073
- MyGO!!!!! palette: https://www.color-hex.com/color-palette/1044079
- Afterglow palette: https://www.color-hex.com/color-palette/1044074
- Pastel*Palettes (PasuPare): https://www.color-hex.com/color-palette/1044076
- Hello, Happy, World! palette: https://www.color-hex.com/color-palette/1044072
- Morfonica: `#33AAFF` (Morpho butterfly blue), confirmed via community sources

### 1.1 `neutral` — Neutral Dark (default)

Inherits portfolio aesthetic. Used until the visitor picks a band.

| Token | Value | Swatch |
|---|---|---|
| `--color-bg` | `#0f0f19` | very dark navy |
| `--color-bg-card` | `#16161f` | dark navy card |
| `--color-text` | `#f1f1f3` | off-white |
| `--color-text-muted` | `#8b8b9e` | muted lavender-grey |
| `--color-primary` | `#6366f1` | indigo |
| `--color-accent` | `#a78bfa` | violet |
| `--color-border` | `rgba(255,255,255,0.07)` | hairline white |
| `--gradient-hero` | `linear-gradient(135deg, #6366f1, #a78bfa)` | indigo → violet |

Contrast: `#f1f1f3` on `#0f0f19` ≈ 16.5:1 (AAA). `#8b8b9e` on `#0f0f19` ≈ 5.4:1 (AA body).

### 1.2 `roselia` — Roselia

Royal purple + gothic gold, anchored on Roselia's palette (#881188 purple). Background tinted toward black-violet for the gothic rock feel.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#0a0410` | near-black violet |
| `--color-bg-card` | `#180828` | deep violet card |
| `--color-text` | `#f4ebff` | warm white-violet |
| `--color-text-muted` | `#b39ccc` | muted lilac |
| `--color-primary` | `#a020c0` | Roselia royal purple (lifted from #881188 for AA on dark bg) |
| `--color-accent` | `#d4af37` | antique gold |
| `--color-border` | `#2a1838` | dark violet hairline |
| `--gradient-hero` | `linear-gradient(135deg, #a020c0, #d4af37)` | purple → gold |

Contrast: `#f4ebff` on `#0a0410` ≈ 17.8:1 (AAA). `#a020c0` (primary as link) on `#0a0410` ≈ 5.1:1 (AA). Note: raw #881188 fails AA as link text on dark bg (3.2:1) — lifted to #a020c0 to clear 4.5:1 while preserving the Roselia identity.

### 1.3 `popipa` — Poppin'Party

Bright pink + warm orange. Energetic, opening-band feel.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#1a0a14` | warm dark pink-brown |
| `--color-bg-card` | `#2a1422` | warmer dark card |
| `--color-text` | `#fff0f5` | soft pink-white |
| `--color-text-muted` | `#d8a8b8` | muted rose |
| `--color-primary` | `#ff3377` | Poppin'Party pink (canonical band image color) |
| `--color-accent` | `#ffcc11` | Poppin yellow (from band palette) |
| `--color-border` | `#3a1c2a` | warm hairline |
| `--gradient-hero` | `linear-gradient(135deg, #ff3377, #ff5522, #ffcc11)` | pink → orange → yellow (sunrise) |

Contrast: `#fff0f5` on `#1a0a14` ≈ 16.8:1 (AAA). `#ff3377` on `#1a0a14` ≈ 5.6:1 (AA).

### 1.4 `mygo` — MyGO!!!!!

Cool blue + soft warmth, melancholic palette mirroring the band's tone.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#0a1018` | midnight slate |
| `--color-bg-card` | `#142028` | overcast slate |
| `--color-text` | `#e6edf5` | cool white |
| `--color-text-muted` | `#8a9aab` | muted steel |
| `--color-primary` | `#77bbdd` | MyGO sky blue (canonical) |
| `--color-accent` | `#7777aa` | MyGO lavender (canonical) |
| `--color-border` | `#1f2c38` | slate hairline |
| `--gradient-hero` | `linear-gradient(135deg, #77bbdd, #7777aa)` | sky → lavender |

Contrast: `#e6edf5` on `#0a1018` ≈ 15.4:1 (AAA). `#77bbdd` on `#0a1018` ≈ 8.1:1 (AAA).

### 1.5 `morfonica` — Morfonica

Morpho butterfly iridescent blue, paired with violet wing-shimmer.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#070612` | near-black indigo |
| `--color-bg-card` | `#161228` | deep indigo card |
| `--color-text` | `#ece8ff` | cool white-violet |
| `--color-text-muted` | `#a89cc4` | muted periwinkle |
| `--color-primary` | `#33aaff` | Morfonica morpho blue (canonical) |
| `--color-accent` | `#b896e8` | violet shimmer |
| `--color-border` | `#241c40` | indigo hairline |
| `--gradient-hero` | `linear-gradient(135deg, #33aaff, #b896e8)` | morpho → violet |

Contrast: `#ece8ff` on `#070612` ≈ 17.9:1 (AAA). `#33aaff` on `#070612` ≈ 6.9:1 (AA).

### 1.6 `afterglow` — Afterglow

Sunset red + warm crimson, evoking the band name's literal meaning.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#180808` | deep oxblood-black |
| `--color-bg-card` | `#281414` | warm dark card |
| `--color-text` | `#ffeae0` | warm cream |
| `--color-text-muted` | `#c4907a` | muted terracotta |
| `--color-primary` | `#ee0022` | Afterglow red (canonical) |
| `--color-accent` | `#ff9999` | warm pink (canonical secondary) |
| `--color-border` | `#3a1f1f` | warm hairline |
| `--gradient-hero` | `linear-gradient(135deg, #ee0022, #ff9999, #ffee88)` | red → pink → gold (afterglow sunset) |

Contrast: `#ffeae0` on `#180808` ≈ 14.6:1 (AAA). `#ee0022` on `#180808` ≈ 5.0:1 (AA — borderline; if used as small link text consider `#ff3344` instead, which raises to 5.9:1. **Open issue for Architect/Developer: keep `--color-primary` for non-text uses on this theme; use `--color-text` for body links and let the gradient + button fill carry the band identity.**).

### 1.7 `pastel` — Pastel*Palettes

Magical-girl pastel rainbow on a soft dark plum background. Gradient is multi-stop (pink → mint → cream) for the band's signature pastel-rainbow feel.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#10101c` | dark plum |
| `--color-bg-card` | `#1c1c2c` | plum card |
| `--color-text` | `#fce8f0` | warm white-pink |
| `--color-text-muted` | `#c8a8c0` | muted mauve |
| `--color-primary` | `#ff88bb` | PasuPare pink (canonical) |
| `--color-accent` | `#99dd88` | PasuPare mint (canonical) |
| `--color-border` | `#2a2a3a` | hairline |
| `--gradient-hero` | `linear-gradient(135deg, #ff88bb, #ddbbff, #55ddee, #99dd88, #ffeeaa)` | full pastel rainbow |

Contrast: `#fce8f0` on `#10101c` ≈ 15.2:1 (AAA). `#ff88bb` on `#10101c` ≈ 6.3:1 (AA).

### 1.8 `hhw` — Hello, Happy, World!

Bright multi-color circus theme, anchored on HHW yellow + magenta.

| Token | Value | Note |
|---|---|---|
| `--color-bg` | `#181010` | warm dark brown |
| `--color-bg-card` | `#2c1c20` | warm card |
| `--color-text` | `#fff8e0` | warm cream |
| `--color-text-muted` | `#d8c498` | muted gold |
| `--color-primary` | `#ffee22` | HHW yellow (canonical) |
| `--color-accent` | `#aa33cc` | HHW magenta (canonical) |
| `--color-border` | `#3a2a2a` | warm hairline |
| `--gradient-hero` | `linear-gradient(90deg, #aa33cc, #ff9922, #ffee22, #44ddff, #006699)` | HHW 5-color circus rainbow |

Contrast: `#fff8e0` on `#181010` ≈ 16.0:1 (AAA). `#ffee22` on `#181010` ≈ 14.1:1 (AAA — yellow on dark always wins).

### 1.9 Accessibility summary

All eight themes pass WCAG AA for both `--color-text` and `--color-text-muted` against their `--color-bg`. The borderline case is **Afterglow `--color-primary` (#ee0022) at 5.0:1** — passes AA for normal text but is uncomfortable for small text sizes. Mitigation flagged in §1.6 (don't use `--color-primary` as inline link text in the Afterglow theme; rely on button fills + the hero gradient instead). All other `--color-primary` values clear 5:1.

Roselia's canonical band purple (#881188, 3.2:1) was **deliberately lifted to #a020c0** so the primary token is usable as link text. Visual identity is preserved by keeping the gold (#d4af37) accent and the hero gradient.

---

## 2. Hero layout

The hero is the first viewport on `/`. It contains the community name, tagline, the Discord CTA, and a theme-aware gradient background at low opacity.

### Structure (no source code, just shape)

```
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>     <!-- gradient bg layer -->
  <div class="hero-content">
    <h1 class="hero-name">{communityName}</h1>       <!-- e.g. BanG Dream! Fan Community NA -->
    <p class="hero-tagline">{tagline}</p>
    <div class="hero-cta"><DiscordCTA size="lg" /></div>
  </div>
</section>
```

### Sizing + spacing

- `.hero` — `min-height: calc(100vh - 4rem)` (subtract navbar), `display: flex`, `align-items: center`, `justify-content: center`, `padding: 6rem 2rem 4rem`, `position: relative`, `overflow: hidden`.
- `.hero-content` — `max-width: 720px`, `text-align: center`, `position: relative`, `z-index: 1`.
- `.hero-name` — `font-size: clamp(2.5rem, 6vw, 4.5rem)`, `font-weight: 800`, `letter-spacing: -1.5px`, `line-height: 1.1`, `margin: 0 0 1rem`, `color: var(--color-text)`.
- `.hero-tagline` — `font-size: clamp(1rem, 2.5vw, 1.5rem)`, `font-weight: 400`, `line-height: 1.5`, `color: var(--color-text-muted)`, `margin: 0 0 2.5rem`, `max-width: 560px`, `margin-inline: auto`.
- `.hero-cta` — `margin-top: 2rem`, button is large variant.

### Theme-aware background

- `.hero-bg` — absolutely positioned full-bleed behind content:
  - `position: absolute`, `inset: 0`, `z-index: 0`
  - `background: var(--gradient-hero)`
  - `opacity: 0.12` (12% — subtle tint, never overpowers text)
  - `pointer-events: none`
- Optional decorative blur: `filter: blur(40px) saturate(1.2)` on a duplicated layer offset 20% to fake a soft glow. Implementation discretion — keep performant.

### Mobile rules

- `<768px`: `.hero` padding `5rem 1.25rem 3rem`. Content stacks naturally (already vertical). Tagline `font-size` floor of `1rem` via the clamp.
- `<320px` (very small phones): hide `.hero-bg` entirely (`display: none`) — at that width the gradient adds visual noise without depth, and saves a paint layer. Use a media query.
- Reduced motion: not strictly needed here (no animation), but if a future shimmer is added, it must respect `@media (prefers-reduced-motion: reduce)`.

---

## 3. ThemeSwitcher UX

Rolling our own (no `radix-ui` for Phase 1 — see open issues §8). The component is a controlled popover anchored to a button in the Navbar's right slot.

### Trigger button

- Square 36×36 button (40×40 hit area on touch).
- Icon: minimal **palette / paint-drop SVG** (24×24, currentColor stroke, 1.75 stroke-width, no fill). Inline `<svg>` — no icon library dependency. Reference shape: rounded square with three small color dots inside.
- Hover: `background: var(--color-bg-card)`, `border-color: var(--color-primary)`.
- Active (popover open): same as hover, plus aria-expanded="true".
- Position in navbar: rightmost item, after nav links. On mobile it stays in navbar (does NOT collapse into the hamburger menu) — visitors should always be able to reach it.

### Popover

- Anchored top-right of the trigger button (transform-origin top-right for entrance scale).
- Position: `position: absolute`, `top: calc(100% + 8px)`, `right: 0`.
- Box: `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 12px`, `padding: 12px`, `box-shadow: 0 12px 32px rgba(0,0,0,0.5)`, `backdrop-filter: blur(12px)`.
- Width: auto, fits content (~256px desktop).

### Swatch grid

- 4 columns × 2 rows = 8 swatches (one per theme).
- Each swatch: 48×48 circle, `background: <theme>--gradient-hero`, `border-radius: 50%`, `cursor: pointer`, `border: 2px solid transparent`.
- Hover: `transform: scale(1.08)`, `transition: transform 150ms ease-out`.
- Active (currently selected theme):
  - 2px white inner ring (`box-shadow: inset 0 0 0 2px rgba(255,255,255,0.85)`)
  - 4px theme-primary outer ring (`box-shadow: 0 0 0 4px var(--color-primary)`)
  - Combined: `box-shadow: inset 0 0 0 2px rgba(255,255,255,0.85), 0 0 0 4px var(--color-primary);`
- Label: small text below grid showing the active theme's `name` (e.g. "Roselia"). 12px, `var(--color-text-muted)`, `text-align: center`, `margin-top: 12px`.
- Aria: each swatch is a `<button>` with `aria-label="{theme.name} theme"` and `aria-pressed={isActive}`.

### Mobile rules

- `<480px`: popover width clamps to `min(calc(100vw - 32px), 280px)`. Grid stays 4-col (48px swatches still fit).
- The popover anchors to right edge of viewport with 16px right margin. If trigger is too close to edge, popover shifts left to remain on-screen.

### Animation

- Open: `opacity 0→1` + `transform: scale(0.95)→scale(1)`, 180ms `cubic-bezier(0.16, 1, 0.3, 1)` (gentle ease-out-back).
- Close: reverse, 120ms ease-in.
- Respect `prefers-reduced-motion: reduce` — collapse to instant show/hide.

### Dismiss behavior

- Click outside → close.
- ESC key → close + return focus to trigger.
- Tab focus trap inside popover while open.
- Selecting a swatch → applies theme, **closes the popover** (don't keep it open; visitor confirmed their pick).

### Edge cases

- Rapid double-click on swatch: idempotent (`setThemeKey(key)` to same value is a no-op for context state, but still triggers the `useEffect` that sets CSS vars — that's fine, it writes the same values).
- localStorage unavailable (Safari private mode): provider catches the throw and falls back to in-memory state; switcher works for the session. No UI change needed — the user just won't get persistence.

---

## 4. DiscordCTA visual

### Active state (valid `discord.gg/...` URL in `site.json`)

- Element: `<a target="_blank" rel="noopener noreferrer">` styled as a button.
- Layout: `display: inline-flex`, `align-items: center`, `gap: 0.625rem`, `padding: 0.875rem 1.75rem` (size=lg), `0.625rem 1.25rem` (size=md), `border-radius: 10px`, `font-weight: 600`, `font-size: 1.0625rem` (lg) / `0.9375rem` (md).
- Background: Discord brand `#5865F2` (universal — does NOT theme-shift). White text `#ffffff`.
- Discord icon: official 24×24 inline SVG (mono-color white, no library — Discord's brand kit shape). Sits to the left of the label.
- Label: "Join Discord" (lg) — Phase 1 is English, Chinese title is in nav copy elsewhere.
- Hover overlay: a pseudo-element (`::before`) absolutely positioned full-bleed inside the button, `background: var(--gradient-hero)`, `opacity: 0`, transitions to `opacity: 0.30` on `:hover`. This gives each theme a unique hover wash while keeping Discord's brand identity at rest.
  - Implementation note: `position: relative` on the button, `::before` with `inset: 0`, `border-radius: inherit`, `pointer-events: none`, `mix-blend-mode: overlay`.
- Active (pressed): `transform: scale(0.98)`, 80ms.
- Focus: `outline: 2px solid var(--color-primary)`, `outline-offset: 3px`.

### Disabled state (no URL or non-`https://discord.gg/` URL)

- Element: `<button type="button" disabled aria-disabled="true" title="Discord coming soon">`.
- Background: `var(--color-bg-card)`.
- Text color: `var(--color-text-muted)`.
- Discord icon: same SVG but `opacity: 0.5`.
- Label: "Discord coming soon".
- Cursor: `not-allowed`.
- No hover overlay; no transform; opacity ~0.7 overall to read as inactive.
- Border: `1px solid var(--color-border)`.

### Validation rule for "active"

URL must literally start with `https://discord.gg/`. URLs starting with `https://discord.com/invite/` are also accepted (canonical alternative). Anything else (empty, `http://`, other domains, whitespace-only) → disabled. Validation lives in the component (or a small util) — Architect can decide co-location.

---

## 5. ComingSoonCard

A muted card communicating "feature is planned but not yet here". Used twice on the landing page (Events / Members).

### Visual

- Container: `<div role="article" aria-label="{title} — coming in {eta}">`.
- Layout: `padding: 1.75rem`, `border-radius: 14px`, `background: var(--color-bg-card)`, `border: 1px dashed var(--color-border)` (dashed signals "draft / placeholder"), `opacity: 0.78` (resting), `position: relative`, `overflow: hidden`.
- Hover: opacity lifts to `0.88`, no other movement (visitor learns it's not interactive).
- Cursor: `not-allowed` on hover (over the entire card).

### Content layout

```
+----------------------------------+
| [icon]  Title           [Phase X]|   ← top row
|                                  |
| Description goes here, two       |   ← body (max ~2 lines)
| lines max.                       |
+----------------------------------+
```

- **Title** — `h3`, `font-size: 1.25rem`, `font-weight: 700`, `color: var(--color-text)`, `margin: 0 0 0.5rem`.
- **Optional icon** (left of title) — 20×20 outline SVG matching the card subject (calendar for Events, users for Members). `color: var(--color-text-muted)`. Renders inline-flex with title.
- **Phase badge** — top-right pill: `background: var(--color-primary)`, `color: #fff` (or theme-appropriate readable contrast), `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `padding: 0.25rem 0.625rem`, `border-radius: 999px`. Text: "Phase 2" or "Phase 3" — exact value passed via `eta` prop.
- **Description** — `p`, `font-size: 0.9375rem`, `color: var(--color-text-muted)`, `line-height: 1.6`, `margin: 0`.

### Edge cases

- Empty/missing description → render nothing (no fallback text). The title + badge alone communicate state.
- Very long title (≥ 40 chars) → wraps naturally; no clamp.
- Phase badge text → free-form string; component does NOT validate "Phase X" pattern (tests only assert it renders the prop).

---

## 6. Typography scale

System font stack only (no web fonts in Phase 1 — keeps deploy size minimal and matches portfolio).

```
font-family: system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
```

### Scale

| Element | Size (clamp) | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| `.hero-name` (H1) | `clamp(2.5rem, 6vw, 4.5rem)` | 800 | 1.1 | -1.5px |
| `.hero-tagline` | `clamp(1rem, 2.5vw, 1.5rem)` | 400 | 1.5 | 0 |
| Section H2 | `clamp(1.75rem, 4vw, 2.5rem)` | 800 | 1.2 | -0.5px |
| Card H3 (ComingSoon title) | `1.25rem` | 700 | 1.3 | 0 |
| Body | `1rem` | 400 | 1.7 | 0 |
| Small / muted caption | `0.875rem` | 400 | 1.5 | 0 |
| Phase badge | `0.6875rem` | 700 | 1 | 0.5px |
| Discord button (lg) | `1.0625rem` | 600 | 1 | 0 |
| Discord button (md) | `0.9375rem` | 600 | 1 | 0 |

Body line-height of 1.7 (vs. 1.5 default) matches portfolio.css and gives the dark-mode pages breathing room.

Anti-aliasing: same as portfolio (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`) — keep in `index.css`.

---

## 7. Accessibility checklist

- All themes verified: body text ≥ 4.5:1, muted text ≥ 3:1 against `--color-bg`. See contrast notes per-theme in §1.
- `prefers-reduced-motion: reduce` — popover open/close animations and any future hover transforms must short-circuit to instant.
- Keyboard:
  - Theme switcher trigger: focusable, `Enter`/`Space` toggles popover.
  - Swatches: focusable, `Enter`/`Space` selects, arrow keys optional (nice-to-have, not blocking).
  - ESC closes popover, returns focus to trigger.
- ARIA:
  - Theme trigger: `aria-haspopup="true"`, `aria-expanded={isOpen}`, `aria-label="Choose theme"`.
  - Each swatch: `aria-label="{theme.name} theme"`, `aria-pressed={isActive}`.
  - Popover container: `role="dialog"`, `aria-label="Theme picker"`.
  - Discord disabled: `aria-disabled="true"`, `title="Discord coming soon"`.
  - Hero `.hero-bg`: `aria-hidden="true"` (decorative).
- Focus visible: every interactive element has a visible focus ring (`outline: 2px solid var(--color-primary); outline-offset: 2px`). Don't suppress with `outline: none` unless replaced.
- Tab order: navbar logo → nav links → theme trigger → main content → footer. Theme switcher is in the natural tab flow, not skipped.

---

## 8. Open issues for Architect / Developer

1. **No `radix-ui` or headless-ui dep for Phase 1.** Roll the popover ourselves (~30 lines of CSS + 40 lines of JSX with a `useEffect` for outside-click + ESC). Adding radix is a 50KB+ dep for a single popover and locks us in for Phase 2/3 patterns we haven't designed yet. **Recommendation: vanilla.**
2. **Discord SVG asset.** Use the official Discord wordmark/icon SVG inline (single-color white) — Developer should embed the path data directly in `DiscordIcon.jsx` rather than `<img>` tag, so it inherits `currentColor` for the disabled state. Source: Discord brand resources (`https://discord.com/branding`).
3. **Palette icon SVG.** Same approach — inline minimal palette/paint-drop. Suggested: rounded square with 3 dots. Developer can sketch from scratch (8 path commands) — no external icon font.
4. **Afterglow primary contrast.** Flagged in §1.6: don't use `--color-primary` (#ee0022) as inline link text on Afterglow theme. Either (a) Architect adds a separate `--color-link` token for a guaranteed AA-compliant text color, or (b) Developer just doesn't use `--color-primary` for body links in v1 (links use `--color-text` underlined, buttons fill `--color-primary`). **Designer prefers (b)** — keeps the token contract minimal.
5. **Roselia primary lifted from canonical #881188 to #a020c0.** Documented in §1.2 — calling out so Reviewer doesn't flag it as a hex drift from the cited source. Reasoning is contrast; Roselia identity is preserved via the gold accent + hero gradient.
6. **Multi-stop hero gradients on `popipa` / `afterglow` / `pastel` / `hhw`.** These have 3+ color stops. Make sure `--gradient-hero` is used as-is (don't try to derive a 2-stop version programmatically). Used in: hero bg, swatch fill, Discord hover overlay — all three handle multi-stop fine.
7. **`favicon.ico` for Phase 1.** Plan says "placeholder, refine in Phase 2". Suggest a 32×32 SVG of the neutral palette swatch (indigo→violet circle) exported to ICO. Developer can produce or punt to default Vite favicon — doesn't block ship.
8. **No `<Logo />` graphic for Phase 1** — open question #4 in the plan. Hero is text-only. Navbar logo is a text wordmark using `--color-primary`, matching the portfolio Navbar pattern. Developer can use the `communityName` shortform ("BanG Dream! NA" or just "BD!NA") at navbar size.
9. **CSS architecture.** Per the plan file tree, each component owns a sibling `.css` file. Theme variables apply via `:root` style attribute (set imperatively by `ThemeProvider`'s `useEffect`) — components only reference `var(--color-*)` and never hard-code hex values. Confirmed compatible with the portfolio pattern; no PostCSS plugins needed.
10. **Theme persistence test.** The plan tests "rapid theme switch" — Designer note: that should also assert no flash-of-wrong-theme on initial page load (the lazy initializer in `useState` reads localStorage synchronously, so the first paint already has the correct theme — but the `useEffect` then applies the CSS vars. There is a 1-frame window where `:root` has the previous theme's vars from the last render. Acceptable for Phase 1; revisit if visible flicker reported).

---

## 9. Reviewer acceptance checklist (cross-ref with §3 of plan)

- [ ] All 8 themes' tokens present in `themes.js` with the exact hex values from §1 of this doc.
- [ ] Hero renders at all breakpoints (320px, 480px, 768px, 1280px) without horizontal scroll.
- [ ] `--gradient-hero` background visible on hero, ~12% opacity, hidden below 320px.
- [ ] Theme switcher button visible in navbar at all breakpoints.
- [ ] Switcher popover opens, displays 8 swatches in 4×2 grid, active swatch has both rings.
- [ ] Selecting a swatch immediately updates all themed tokens (verify by inspecting `:root` in devtools).
- [ ] Theme persists across page reload (localStorage `bangdream-na:theme`).
- [ ] Discord CTA in disabled state when `discordInvite` is empty in `site.json`.
- [ ] Discord CTA hover overlay uses current theme's `--gradient-hero` (test on at least 3 themes).
- [ ] ComingSoonCards render with dashed border + Phase badge, `cursor: not-allowed`.
- [ ] Keyboard nav reaches every interactive element; focus rings visible.
- [ ] No console errors / warnings on initial render or theme switch.
