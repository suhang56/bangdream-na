# bangdream-na — Phase 3 Design Spec (Members)

Single-source design reference for the **Members** page (`/members`). Audience: Architect (data shape), Developer (CSS values + DOM structure), Reviewer (acceptance criteria).

**Aesthetic anchor**: Phase 1 design tokens (see `docs/design.md` §1 for the eight palettes and §6 for typography). All components consume `var(--color-*)` and `var(--gradient-hero)` — no hard-coded hex except Discord brand purple (already in `DiscordCTA`). Resting card surface follows the `ComingSoonCard` idiom (see `src/components/ComingSoonCard/ComingSoonCard.css`): `background: var(--color-bg-card)`, `border-radius: 14px`, hairline border. The Members card differs by being **fully opaque, interactive, and hoverable** instead of dashed/disabled.

This spec is standalone — Phase 2 (Events) is shipping in parallel. Cross-phase reuse decisions (e.g. shared `<FilterBar />` primitive) belong to the P3 Architect after both designs land.

---

## 1. Data schema

### `src/data/members.json`

Array of member objects. Empty array (`[]`) is a valid initial state — Phase 1 ships with no roster, Members page must render gracefully.

```jsonc
[
  {
    "id": "u-suhang56",                        // required, unique, slug-safe
    "name": "西瓜",                              // required, display name (any script)
    "role": "organizer",                       // required: "member" | "organizer" | "performer" | "alumnus"
    "pronouns": "she/her",                     // optional, free string
    "location": "Bay Area, CA",                // optional, free string
    "oshi": {                                  // optional — entire object hidden if absent
      "band": "Roselia",                       // one of the 7 canonical band names (see §1.2)
      "character": "湊友希那"                    // optional, free string (CJK okay)
    },
    "bio": "Concert organizer for NA meetups. Roselia stan since 2019.",  // optional, plain text or short markdown
    "avatar": "/members/suhang56.jpg",         // optional, absolute path under /public; missing → initials fallback
    "socials": [                               // optional, ordered array; empty array hides the row
      { "platform": "twitter",   "handle": "@suhang56", "url": "https://twitter.com/suhang56" },
      { "platform": "bilibili",  "handle": "suhang56",  "url": "https://space.bilibili.com/..." }
    ],
    "coverBand": {                             // optional, only for "performer" role typically
      "name": "Re:Lia NA",                     // free string — fan cover band name
      "role": "Vocal",                         // free string — instrument or part
      "since": "2024-08-15"                    // ISO date, used for tooltip / future sort; not rendered on card
    }
  }
]
```

### 1.1 Field contract

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | string | Slug-safe, unique. Used as React `key` and as anchor id (`#members/{id}`) for deep-linking in a later phase. |
| `name` | yes | string | Any script (Latin, CJK, kana). Truncates at 40 chars in the card (see §3.2). |
| `role` | yes | enum | `"member"` \| `"organizer"` \| `"performer"` \| `"alumnus"`. Drives badge color + filter facet + alumnus desaturation. |
| `pronouns` | no | string | Renders inline next to name in muted color, parenthesized: `西瓜 (she/her)`. |
| `location` | no | string | Free text. Renders below role badge in muted color. |
| `oshi` | no | object | If present, must have `band`. `character` is optional. Entire line hidden if `oshi` absent or `oshi.band` missing/empty. |
| `oshi.band` | no¹ | enum | One of the seven canonical bands (§1.2). Drives band-chip filter match. |
| `oshi.character` | no | string | Free text. CJK okay. Appended after band: `Oshi: Roselia · 湊友希那`. |
| `bio` | no | string | Plain text or short markdown (link + emphasis only — see §3.3). 2-line clamp on card. |
| `avatar` | no | string | Path under `/public`. Missing/broken → initials fallback (§3.1). |
| `socials` | no | array | Ordered. Each `{ platform, handle, url }`. `platform` is one of: `twitter`, `instagram`, `youtube`, `tiktok`, `bilibili`, `weibo` (§3.5). Empty array hides the row. |
| `coverBand` | no | object | Adds the corner ribbon (§3.6). Required sub-fields if present: `name`, `role`. `since` is ISO date, optional, used in tooltip only. |

¹ `oshi.band` is required *only when `oshi` itself is present*. Shape `{ "oshi": {} }` should render as if `oshi` were absent.

### 1.2 Band enum (matches Phase 1 themes)

`"Roselia"`, `"Poppin'Party"`, `"MyGO!!!!!"`, `"Morfonica"`, `"Afterglow"`, `"Pastel*Palettes"`, `"Hello, Happy, World!"`.

Stored verbatim with the punctuation/casing above so a UI lookup `themeOrder.find(t => themes[t].band === member.oshi.band)` resolves cleanly to the theme key. Architect: confirm the lookup direction (label → theme key) lives in a single helper, not duplicated.

### 1.3 Validation (Architect's call)

The Phase 1 architecture file is silent on schema validation. Designer recommendation: write a `validateMember(m)` util that returns `{ ok: true } | { ok: false, errors: [...] }` and call it once at module-load time on `members.json`. Failures log a `console.warn` listing offending `id`s but do NOT throw — bad rows are filtered out so a typo in one entry doesn't blank the whole page. Edge tests: `validateMember({})` → `errors` non-empty; `validateMember({ id, name, role: "invalid" })` → fails on role enum.

---

## 2. Page layout

### 2.1 Structure

```
<main class="members-page">
  <section class="members-hero">
    <h1 class="members-title">Members</h1>
    <p class="members-subtitle">{count}-person community across NA</p>
  </section>

  <section class="members-filters" aria-label="Filter members">
    <FilterBar
      bands={selectedBands} setBands={...}
      role={selectedRole}    setRole={...}
      query={query}          setQuery={...}
    />
  </section>

  <section class="members-grid-section">
    {filtered.length === 0
      ? <EmptyState variant={members.length === 0 ? 'no-roster' : 'no-results'} />
      : <ul class="members-grid">
          {filtered.map(m => <li><MemberCard ...m /></li>)}
        </ul>}
  </section>
</main>
```

`<ul>` + `<li>` for the grid is the a11y default — a list of people. Each card is the `<li>`'s only child, so the `<li>` carries `list-style: none` and the card owns layout.

### 2.2 Page hero (compact, NOT the homepage Hero)

- `padding: 4rem 2rem 1.5rem` (no `min-height: 100vh` — leaves room for the grid above the fold).
- `.members-title` — same scale as the homepage hero `H1`: `font-size: clamp(2.25rem, 5vw, 3.5rem)`, `font-weight: 800`, `letter-spacing: -1px`, `color: var(--color-text)`, `margin: 0`.
- `.members-subtitle` — `font-size: clamp(1rem, 2vw, 1.125rem)`, `color: var(--color-text-muted)`, `margin: 0.5rem 0 0`. Count is `members.length` (after validation, before filter). Hide subtitle if `members.length === 0` (the empty state already says it).
- No `--gradient-hero` background here — the page is a roster, not a marquee. Gradient appears in initials avatars + band chip active states, which is enough theme presence.

### 2.3 Layout container + spacing

- Page max-width: `1200px`, `margin-inline: auto`, `padding-inline: 2rem` desktop / `1.25rem` mobile.
- Sections stack vertically with `gap: 2rem` (or `margin-block` if not using `display: flex; flex-direction: column;`).
- Footer sits below `<main>` (already global from Phase 1's `App.jsx`).

### 2.4 Grid

- `display: grid`, `gap: 1.5rem`, `list-style: none`, `padding: 0`, `margin: 0`.
- Columns: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.
  - This naturally yields 3 columns at ≥980px container width, 2 at ~600-980px, 1 below 600px.
  - Explicit breakpoint overrides (§9) clamp it to {3 desktop, 2 tablet, 1 mobile} so the visual cadence is predictable.
- Sort: alphabetical by `name` using `localeCompare(undefined, { sensitivity: 'base' })` so CJK and Latin names interleave deterministically. Sort happens once per render, on the *post-filter* array.
- Stable: ties broken by `id` (already unique).

---

## 3. MemberCard spec

### 3.1 Visual

```
+---------------------------------------------------+
|                                       [ribbon]    |  ← coverBand floating top-right
|                                                   |
|   +--------+   西瓜 (she/her)                       |
|   |        |   [organizer]   Bay Area, CA          |
|   | avatar |                                        |
|   |        |   Oshi: Roselia · 湊友希那              |
|   +--------+                                        |
|                                                   |
|   Concert organizer for NA meetups. Roselia       |
|   stan since 2019.                                 |
|                                                   |
|   [tw]  [ig]  [bili]                                |
+---------------------------------------------------+
```

- Container: `<article class="member-card">`, `padding: 1.5rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 14px`, `position: relative`, `overflow: hidden`, `display: grid`, `grid-template-columns: 88px 1fr`, `gap: 1rem 1.25rem`, `align-items: start`.
- Inner row layout: avatar in column 1 spans rows 1-2; name+meta in column 2 row 1; bio + socials below across both columns (the bio block uses `grid-column: 1 / -1`).

### 3.2 Avatar

- 88×88px, `border-radius: 12px`, `flex-shrink: 0`, `overflow: hidden`.
- `<img>` with `loading="lazy"`, `decoding="async"`, `alt="{name}"`, `width=88 height=88` (intrinsic sizing prevents layout shift), `object-fit: cover`.
- Fallback (no `avatar` OR image `onError`):
  - `<div class="member-avatar member-avatar--initials">` with `background: var(--gradient-hero)`, `display: flex`, `align-items: center`, `justify-content: center`, `color: var(--color-text)`, `font-weight: 700`, `font-size: 1.75rem`, `letter-spacing: 0.5px`, `text-transform: uppercase`.
  - Initials computation (Developer logic):
    - Trim, split on whitespace.
    - Two parts → first char of first + first char of last (`西 瓜 → 西瓜` becomes `西瓜`; `Su Hang → SH`).
    - Single part of length ≥ 2 → first two chars (`Hang → HA`; `西瓜 → 西瓜`).
    - Single char → that char twice (`西 → 西西`).
    - Empty after trim → fallback to `?` (validation should catch this earlier, but the renderer is defensive).
  - For CJK, `text-transform: uppercase` is a no-op — fine.
- Onerror handoff: if `<img>` errors after mount, swap to the initials variant. State machine — Architect can decide a simple `useState('img'|'initials')`.

### 3.3 Name + meta block

- `.member-name` — `<h3>`, `font-size: 1.125rem`, `font-weight: 700`, `color: var(--color-text)`, `margin: 0`, `line-height: 1.3`.
  - Long-name truncation: `max-width: 100%`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`. Apply at 40-char visual cutoff via CSS only (don't pre-truncate in JS — accessibility wants the full name in the DOM for the `title` attribute and screen readers).
  - Set `title="{name}"` on the `h3` so hovering shows the full string when truncated.
- `.member-pronouns` — inline span after name, `font-size: 0.875rem`, `font-weight: 400`, `color: var(--color-text-muted)`, `margin-left: 0.5rem`. Rendered as `(she/her)` literal — parentheses included.
  - Hidden when `pronouns` is absent/empty.
- `.member-meta-row` — flex row directly below name, `gap: 0.5rem 0.75rem`, `flex-wrap: wrap`, `align-items: center`, `margin-top: 0.375rem`.
  - Contains: role badge (always) → location (if present).
- `.member-location` — `font-size: 0.8125rem`, `color: var(--color-text-muted)`. Optional small pin glyph (geometry, not an icon-font dep) prefixed: `<svg width=12 height=12 ... aria-hidden>`.
- `.member-oshi` — `<p>` below the meta row, `font-size: 0.8125rem`, `color: var(--color-text-muted)`, `margin: 0.5rem 0 0`. Format: `Oshi: {band}` or `Oshi: {band} · {character}` (middle dot separator). Entire line hidden if `oshi.band` is empty.

### 3.4 Role badge

Pill, sits in the meta row.

| Role | Background | Text | Notes |
|---|---|---|---|
| `member` | `transparent` | `var(--color-text-muted)` | `border: 1px solid var(--color-border)`. Quiet — most cards are this. |
| `organizer` | `var(--color-primary)` | `#ffffff` | Loud — drives community attention. |
| `performer` | `var(--color-accent)` | `#0f0f19` (dark text on light accent) | See contrast note below. |
| `alumnus` | `transparent` | `var(--color-text-muted)` | `border: 1px dashed var(--color-border)`. Mirrors the dashed-border idiom from `ComingSoonCard` so "past" reads visually. |

- Shape: `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `padding: 0.25rem 0.625rem`, `border-radius: 999px`, `white-space: nowrap`. Same dimensions as `ComingSoonCard`'s phase badge.
- Label: capitalized full word — "Member", "Organizer", "Performer", "Alumnus". Plural variants (`Alumnae` etc.) are not differentiated — fan-club scale doesn't need it.
- `aria-label="Role: {label}"` on the badge.
- **Contrast note for `performer`**: `--color-accent` varies per theme. Most accents are light (yellow, mint, gold, pink) and pair fine with dark text `#0f0f19`. Roselia accent is `#d4af37` (gold) → contrast with `#0f0f19` ≈ 12:1 (AAA). Afterglow accent `#ff9999` (pink) → ≈ 8.4:1 on `#0f0f19` (AAA). All seven accents are bright enough that dark text wins. Don't switch dark/light text per theme — keep `#0f0f19` everywhere. **Open issue for Architect**: if a future theme accent is dark, this rule needs revisiting (re-derive a per-theme `--color-on-accent`).

### 3.5 Bio block

- `<p class="member-bio">`, `font-size: 0.9375rem`, `color: var(--color-text-muted)`, `line-height: 1.5`, `margin: 1rem 0 0`.
- 2-line clamp: `display: -webkit-box`, `-webkit-line-clamp: 2`, `-webkit-box-orient: vertical`, `overflow: hidden`.
- Empty/missing → render nothing (no fallback copy).
- **Markdown subset**: bio MAY contain `[link](url)` and `*emphasis*`. For Phase 3, Designer recommends rendering bio as **plain text** (no markdown parsing) — keeps the dependency graph minimal and avoids `dangerouslySetInnerHTML`. Architect can revisit if content authors find plain text limiting.

### 3.6 Cover band ribbon

Floating badge, top-right corner of the card.

- Position: `position: absolute`, `top: 12px`, `right: 12px`, `z-index: 1`.
- Shape: `padding: 0.3125rem 0.75rem`, `border-radius: 8px`, `background: var(--color-accent)`, `color: var(--color-bg)` (max contrast against the accent — `--color-bg` is near-black across all themes), `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `white-space: nowrap`, `box-shadow: 0 4px 12px rgba(0,0,0,0.25)`.
- Label: `Cover: {coverBand.name} · {coverBand.role}` — but if either side is too long the whole label exceeds the card width. Truncate to `max-width: calc(100% - 24px)` with `overflow: hidden; text-overflow: ellipsis;` so the ribbon never escapes the card.
- Tooltip (`title` attribute): full label + `since {coverBand.since}` when present.
- Why `--color-accent` and not `--color-primary`: per task spec, "fan club is all-band-friendly" — the cover-band marker is a cross-band signal, the accent token reads as decorative rather than role-defining.
- **Mobile reposition**: at `<480px`, ribbon moves to `bottom: 12px; right: 12px`, `top: auto`. Reasoning: at 1-column width the avatar block dominates the top-right area visually (the card grid collapses — see §9), and a top-right ribbon would overlap the name. Bottom-right keeps it visible without competing with primary content.

### 3.7 Socials row

- Container: `<ul class="member-socials">`, `display: flex`, `gap: 0.5rem`, `flex-wrap: wrap`, `list-style: none`, `padding: 0`, `margin: 1rem 0 0`.
- Each item: `<li><a class="member-social" href={url} target="_blank" rel="noopener noreferrer" aria-label="{platform} {handle}">[icon]</a></li>`.
- Link: `width: 32px`, `height: 32px`, `border-radius: 8px`, `display: inline-flex`, `align-items: center`, `justify-content: center`, `color: var(--color-text-muted)`, `background: transparent`, `border: 1px solid var(--color-border)`, `transition: color 150ms ease, border-color 150ms ease, background 150ms ease`.
- Hover: `color: var(--color-text)`, `border-color: var(--color-primary)`, `background: var(--color-bg-card)` (no — already that bg; use a slightly lighter overlay via `rgba(255,255,255,0.04)`).
- Focus-visible: `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`.
- Icons: 16×16 inline `<svg>`, `currentColor`, `stroke-width: 1.75`, no fill (or solid fill for platform glyphs that need it — case by case).
- Platform → icon mapping (Developer embeds inline SVG for each, no icon-font dep — same approach as `DiscordIcon`):
  - `twitter` — bird/X glyph (use the X glyph since the brand renamed; community still says "twitter")
  - `instagram` — camera-square outline
  - `youtube` — rounded rectangle play
  - `tiktok` — music note
  - `bilibili` — TV-with-ears glyph (community-recognizable)
  - `weibo` — eye glyph
- Unknown `platform` → render a generic globe icon, do not skip the link.
- Empty `socials` array → render nothing (no `<ul>`, no spacer).

### 3.8 States

#### 3.8.1 Resting

- Card: `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, no shadow.

#### 3.8.2 Hover

- Lift + glow, mirrors the Phase 1 portfolio card hover idiom (referenced in design.md §4 and Hero):
  - `transform: translateY(-2px)`
  - `border-color: var(--color-primary)`
  - `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--color-primary)` (the second layer doubles as a subtle inner ring on dark themes where the outer drop-shadow is hard to see)
  - `transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease, box-shadow 200ms ease`
- Hover applies to `.member-card:hover`, NOT to nested social-link hovers (they have their own).
- `prefers-reduced-motion: reduce` → drop the `translateY` (border + shadow still change to convey hover). Transition durations collapse to 0.

#### 3.8.3 Alumnus

- Adds class `.member-card--alumnus` on the article.
- Filter desaturation: `filter: grayscale(0.4) opacity(0.85)`. The avatar reads softer, role badge dashed-bordered (already covered in §3.4).
- Top strip: `<div class="member-card-strip" aria-hidden="true">Past Member</div>` — a small horizontal band absolutely positioned at the top of the card.
  - `position: absolute`, `top: 0`, `left: 0`, `right: 0`, `padding: 0.25rem 1.5rem`, `background: var(--color-border)`, `color: var(--color-text-muted)`, `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `text-align: center`.
  - Push card content down `padding-top: 2.25rem` when alumnus to clear the strip (use a `.member-card--alumnus` modifier on the padding).
- A11y: the strip text is rendered visibly, but for non-sighted users the role badge already says "Alumnus" — no extra aria needed. Strip is `aria-hidden="true"` to avoid duplication.

#### 3.8.4 Focus

- The card itself is NOT focusable by default — there is no primary link target ("clicking a card" doesn't lead anywhere in Phase 3; deep-link routes aren't built yet). Per task spec: "card focus: full card focusable as group with tabIndex=0 if there's a primary link, otherwise just focus the social links". Phase 3 takes the second branch: socials are the only focus stops inside a card.
- If a future phase adds a member detail page, the card becomes a `<a>`-wrapped landmark and gets a focus ring identical to the hover treatment.

---

## 4. FilterBar interactions

Single component, three sub-controls in a horizontal row (wraps on mobile).

### 4.1 Layout

- `<form class="members-filterbar" role="search" onSubmit={(e)=>e.preventDefault()}>` — `role="search"` is the semantic landmark for filter regions; preventing submit is required because pressing Enter in a search input would otherwise submit the form and reload the SPA.
- Three horizontal blocks with `gap: 1.5rem`, `flex-wrap: wrap`, `align-items: flex-end`:
  1. Search input (`flex: 1 1 220px`, min-width to keep typable)
  2. Role select (single-select group)
  3. Band chips (multi-select group, `flex: 0 1 auto`)
- Visual: blocks separated by whitespace, no dividers. Each block has its own `<label>` / `<legend>` above.

### 4.2 Search input

- `<label for="members-search" class="filter-label">Search</label>`
- `<input id="members-search" type="search" placeholder="Name or bio…" class="filter-search" />`
- `type="search"` (per task spec) — gives the user the native "clear" affordance in WebKit/Blink.
- Style: `padding: 0.625rem 0.875rem`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `color: var(--color-text)`, `font-size: 0.9375rem`, `width: 100%`.
- Focus: `outline: 2px solid var(--color-primary)`, `outline-offset: 0`, `border-color: transparent` (the outline replaces the border visually).
- Behavior: **debounced 200ms** before applying to the filter. Implementation hint for Architect: keep `query` state on the FilterBar (immediate, so the input feels live), publish `debouncedQuery` upward via a `useEffect` + `setTimeout(200)` cleanup pattern. Don't debounce the input value itself — user typing must always show in the field instantly.
- Edge case: leading/trailing whitespace is trimmed before matching but preserved in the input.

### 4.3 Role select

- `<fieldset class="filter-role">` + `<legend class="filter-label">Role</legend>` (visible legend, not screen-reader-only).
- Four radio buttons in a row: `All`, `Members`, `Organizers`, `Performers`, `Alumni`. (Five — "All" plus four roles. Per task spec the radio is "single select including All".)
  - Plural labels for the role filter, singular for the card badge — natural English convention.
  - "All" maps to `null` filter (no role constraint).
- Visual: each radio is a styled pill (the radio input itself is `position: absolute; opacity: 0;`, styled label is the visible target).
  - Label resting: `padding: 0.4375rem 0.875rem`, `border-radius: 999px`, `border: 1px solid var(--color-border)`, `color: var(--color-text-muted)`, `background: transparent`, `font-size: 0.875rem`, `cursor: pointer`.
  - Label `:has(input:checked)` (or the `.is-active` class fallback): `border-color: var(--color-primary)`, `color: var(--color-text)`, `background: rgba(255,255,255,0.04)`.
  - Focus-visible (input focus → label outline): `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`.
- Wraps on mobile (`flex-wrap: wrap`, `gap: 0.5rem`).

### 4.4 Band chips (multi-select)

- `<fieldset class="filter-bands">` + `<legend class="filter-label">Oshi band</legend>`.
- Eight chips: 7 bands + an `All` chip. **`All` is a special chip that, when active, deselects all band chips** (i.e., it is "no filter"). Clicking a band chip from `All` switches off `All` and on that band; clicking `All` again clears all band chips. This is a common pattern for multi-select facets and avoids the awkward "all checkboxes" alternative.
- Each chip is a `<input type="checkbox">` + styled `<label>`. Checkbox is `position: absolute; opacity: 0;`.
- Resting:
  - `padding: 0.4375rem 0.875rem`, `border-radius: 999px`, `border: 1px solid var(--color-border)`, `color: var(--color-text-muted)`, `background: transparent`, `font-size: 0.875rem`, `display: inline-flex`, `align-items: center`, `gap: 0.5rem`, `cursor: pointer`.
  - Optional 12×12 swatch dot (the band's `--color-primary`) inside the chip, left of the label. Architect can defer this if it complicates theming (the chip would need to look up the band's primary, which means importing `themes.js` into FilterBar).
- Active (`:has(input:checked)`):
  - `border-color: var(--color-primary)`, `box-shadow: 0 0 0 2px var(--color-primary)`, `color: var(--color-text)`, `background: rgba(255,255,255,0.04)`.
  - The `box-shadow: 0 0 0 2px var(--color-primary)` is the "ring" called out in the task spec — sits outside the border, theme-tinted by the *currently active page theme*, not the chip's own band. This keeps the chip ring consistent with the rest of the page chrome.
- Focus-visible: `outline: 2px solid var(--color-primary)`, `outline-offset: 3px`.
- Wraps to two rows below 768px.

### 4.5 Filter combination semantics

- Search is AND-ed with role and band: a member must satisfy **all** active filters.
- Within band chips, multiple checked bands are OR-ed: a member matches if their `oshi.band` is any of the checked bands.
- Search match: case-insensitive substring on `name` OR `bio`. No fuzzy/typo tolerance.
- Members without `oshi` are excluded the moment any band chip is active. (Otherwise: shown if no band chips are active or `All` is active.) — Document this so Reviewer can verify.

### 4.6 Reset

- Optional small "Clear filters" button below the FilterBar, visible only when ≥1 filter is non-default. Sits aligned to the right.
  - `font-size: 0.8125rem`, `color: var(--color-text-muted)`, `background: transparent`, `border: none`, `padding: 0.25rem 0.5rem`, `text-decoration: underline`, `cursor: pointer`.
  - Click → `setQuery('')`, `setRole(null)`, `setBands([])`. Returns focus to the search input (a11y: "where did the page go" is mitigated).
- This is a Designer-recommended addition; not in the original task spec. Architect can drop if it complicates the wireframe.

---

## 5. Search behavior (definitive)

```
matches(member, query) {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  const name = member.name.toLowerCase()
  const bio  = (member.bio || '').toLowerCase()
  return name.includes(q) || bio.includes(q)
}
```

- Case-insensitive: lowercase both sides.
- Substring (not word-prefix, not fuzzy).
- Empty/whitespace query → all members pass (no filter).
- Non-ASCII: JavaScript `toLowerCase()` is locale-insensitive but works for CJK (which has no case) and Latin scripts. No `Intl.Collator` needed for substring inclusion. Edge test: `query = "西"` → matches `name = "西瓜"`.
- No regex, no markdown stripping (the bio is rendered as plain text per §3.5, and the search happens before render).

---

## 6. Cover band ribbon — design rationale (recap)

Already specified in §3.6. Why it's separate from the role badge:

- A member can be `member` role AND have a `coverBand` (e.g. someone who plays in a fan cover band but isn't a paid organizer). The two metadata are orthogonal.
- The ribbon is decorative (event-flavored), the role badge is informational (organizational). Keeping them visually distinct prevents confusion.
- `--color-accent` choice is per task spec — neutral across themes (most accents are bright/secondary), reads as "fun fact" not "primary identity". A band-specific theme on the ribbon would over-claim — the cover band is a loose creative project, not a tier-1 community signal.

---

## 7. Empty states

Two variants, both rendered inline where the grid would be (centered, vertical padding ~6rem to fill the visual space).

### 7.1 No-roster — `members.length === 0` (after validation)

```
<div class="members-empty members-empty--no-roster" role="status">
  <div class="members-empty-icon" aria-hidden="true">[users-outline svg, 56x56]</div>
  <h2 class="members-empty-title">Members coming soon</h2>
  <p class="members-empty-body">
    Be the first to join via Discord — we'll feature community members here.
  </p>
  <div class="members-empty-cta">
    <DiscordCTA size="md" />
  </div>
</div>
```

- Icon: 56×56 outline SVG, `color: var(--color-text-muted)`. Same drawing language as `ComingSoonCard` icons.
- Title: same scale as Card H3 (`1.25rem`, weight 700, `color: var(--color-text)`).
- Body: `color: var(--color-text-muted)`, `max-width: 400px`, `text-align: center`, `margin-inline: auto`.
- CTA: reuses Phase 1 `<DiscordCTA size="md" />` — disabled or active depending on `site.json`.
- `role="status"` makes screen readers announce the empty state on first render.

### 7.2 No-results — `members.length > 0 && filtered.length === 0`

```
<div class="members-empty members-empty--no-results" role="status">
  <div class="members-empty-icon" aria-hidden="true">[search-x svg, 56x56]</div>
  <h2 class="members-empty-title">No members match</h2>
  <p class="members-empty-body">Try clearing filters or searching a different name.</p>
  <button type="button" class="members-empty-clear">Clear filters</button>
</div>
```

- The "Clear filters" button calls the same reset handler as §4.6.
- Button styling matches §4.6 underline-text style; or upgrade to a small outlined button if the bare-link feels too quiet — Developer's discretion.

### 7.3 Loading state

Phase 3 reads `members.json` synchronously via ES module import. There is no loading state — the data is already in the bundle when the page mounts. **No skeleton needed**. (If Phase 4 admin moves members to fetched data, a skeleton list will be a Phase 4 concern.)

---

## 8. Edge cases for Developer (consolidated)

| Edge case | Behavior |
|---|---|
| Missing `avatar` | Initials fallback (§3.2) using gradient. |
| Broken `avatar` URL (404 / network) | `<img onError>` swaps to initials. |
| Missing `oshi` | Hide oshi line entirely. |
| `oshi.band` empty string | Hide oshi line entirely (treat as missing). |
| Missing `oshi.character` | Render `Oshi: {band}` only — no trailing separator/dot. |
| Missing `bio` | Don't render the `<p>` block. |
| `bio` is one word, very long (no spaces) | Two-line clamp + `overflow-wrap: anywhere` so it doesn't horizontally overflow the card. |
| Missing `socials` | Hide social row. |
| Empty `socials: []` | Hide social row (same as missing). |
| Unknown `platform` | Render generic globe icon, keep the link. Don't drop. |
| Very long `name` (>40 chars visually) | Single-line ellipsis truncation (CSS only); full name preserved in DOM + `title`. |
| Single-name member (no whitespace in `name`) | Initials = first 2 chars of the name (`Hang → HA`; `西瓜 → 西瓜`). |
| Single-character name | Initials = char × 2. |
| Non-ASCII / CJK name | Initials work as-is (`西瓜 → 西瓜`); no `text-transform` impact. |
| `name` is empty after trim | Validator drops the row. If somehow it renders, initials = `?`. |
| `coverBand.name` very long | Ribbon truncates with ellipsis (§3.6), `title` carries full text. |
| `coverBand` present but missing `name` or `role` | Don't render ribbon. (Validator should flag.) |
| `coverBand.since` invalid date | Render ribbon without the `since` portion of the tooltip. |
| `pronouns` empty string | Hide pronouns span (treat as missing). |
| Filter matches zero members but roster is non-empty | Show §7.2 no-results state. |
| Roster is empty | Show §7.1 no-roster state. |
| Search query with regex special chars | Substring match handles them as literals (no regex). No escaping needed. |
| Search debounce while typing fast | Only the latest 200ms-stable value applies; intermediate values dropped. |

---

## 9. Mobile breakpoints

Tracking design.md §2 conventions where they apply. Four breakpoints matter for Members:

### 9.1 Desktop (≥980px)

- Page padding `2rem` left/right, max-width `1200px`.
- Grid: 3 columns (`grid-template-columns: repeat(3, 1fr)` enforced via media query so it doesn't sometimes flex to 4 at very wide widths).
- FilterBar: single row, all three blocks side-by-side.
- MemberCard: avatar 88×88 left of name+meta column.

### 9.2 Tablet (768px–979px)

- Page padding `1.5rem`.
- Grid: 2 columns (`grid-template-columns: repeat(2, 1fr)`).
- FilterBar: search + role + bands wrap as needed; bands often go to a second row.
- MemberCard: same layout as desktop.

### 9.3 Mobile (480px–767px)

- Page padding `1.25rem`.
- Grid: 1 column.
- FilterBar: stacks — search on top (full width), role row, bands row.
- MemberCard: same horizontal layout (avatar left, content right) — at column width ~440px the avatar still fits comfortably.

### 9.4 Narrow mobile (<480px)

- Page padding `1rem`.
- Grid: 1 column.
- MemberCard layout **changes to vertical stack** (per task spec):
  - Avatar centers at the top, 96×96 (slightly larger than desktop 88×88 — when it's the focal element it can breathe).
  - Name + meta stacks below avatar, `text-align: left` (NOT centered — keeps reading rhythm).
  - Bio + socials below as before.
  - Ribbon repositions to `bottom: 12px; right: 12px` (per §3.6 mobile reposition).
- MemberCard `padding: 1.25rem`.

### 9.5 `prefers-reduced-motion: reduce`

- Card hover `transform` removed.
- Empty-state CTA pulses (if any future addition) → static.
- FilterBar animations (chip ring fade-in) collapse to instant.

---

## 10. Accessibility checklist

- Page has one `<h1>` (`Members`). Each MemberCard's name is `<h3>` — there's no `<h2>` because the page has one section in the visual hierarchy. If Reviewer prefers a stricter heading tree, promote MemberCard names to `<h2>` (the cards are siblings of the FilterBar, both under the page H1).
- Grid is `<ul>` of `<li>` for screen-reader list semantics. Each card's article tag carries `aria-labelledby={nameElementId}` for a clear group label.
- Role badge `aria-label="Role: {label}"` (visible text repeated for the screen-reader because the abbreviated visual style might not register).
- Search input has visible `<label>` linked via `for/id`, `type="search"` (native clear button on browsers that support it).
- Filter chips group: `<fieldset>` + `<legend>` for both role and bands. Legends are visible (`color: var(--color-text-muted)`, small caps `font-size: 0.75rem`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `margin-bottom: 0.5rem`).
- Card focus: not focusable as a unit (no primary link). Socials are the focusable elements within. Tab order: search → role radios → band chips → clear-filters → first card's first social → ... → footer.
- Color contrast (every theme):
  - `--color-text-muted` on `--color-bg-card` is the most-used pairing (bio, oshi, location). Phase 1 design.md §1 verified all themes ≥ 3:1 on `--color-bg`; `--color-bg-card` is *slightly lighter*, so the contrast is marginally lower but still passes AA-large. Reviewer should spot-check on Roselia (highest-saturation card bg).
  - Role badge `performer` (dark text on `--color-accent`) — see §3.4 contrast note. AAA across all 7 themes.
  - Cover ribbon (`--color-bg` text on `--color-accent`) — `--color-bg` is near-black (luminance < 0.05) in all themes; against any of the bright accents this is AAA.
- `prefers-reduced-motion`: see §9.5. All transitions ≥ 100ms must short-circuit.
- Focus visible: every interactive element (search, radio labels, chip labels, social links, clear-filters button) gets `outline: 2px solid var(--color-primary); outline-offset: 2-3px;`. Don't suppress with `outline: none` unless replaced.
- Keyboard:
  - Tab/Shift+Tab moves through focusables in the natural reading order.
  - Space/Enter activates radios, checkboxes, and buttons (browser default).
  - Arrow keys within a radiogroup are browser default (works without JS when using native `<input type="radio">` with shared `name`).

---

## 11. Open issues for Architect / Developer

1. **Schema validation lives where**: Designer recommends a `src/data/validateMember.js` util called once at module-load time. Architect: confirm and decide whether failures `console.warn` (Designer's preference) or hard-throw in dev only.
2. **Theme-key lookup helper**: `member.oshi.band` is a label string; the band chips need theme-tinted swatch dots. A single helper `bandLabelToThemeKey(label)` should live in `src/theme/themes.js` to avoid duplicated lookup logic in FilterBar and (hypothetically) MemberCard.
3. **`<FilterBar />` reuse with Phase 2 (Events)**: Phase 2 has its own filters (event type, date range). Designer recommends each phase ships its own FilterBar — they share *visual* idioms (chip pill style, search input style) which can live in `theme.css` or a shared `filters.css` partial. Architect to decide co-location.
4. **Markdown in bio**: deferred to plain text (§3.5). If/when the user requests inline links in bios, evaluate a tiny markdown subset parser (~50-line regex) over `react-markdown` (~30KB).
5. **Member detail route**: not in Phase 3 scope. Card stays non-clickable. When added (Phase 4 likely), the card becomes a `<a>` and the focus-as-group rule activates (§3.8.4).
6. **Cover ribbon i18n**: "Cover: {name} as {role}" — task spec uses `as`. Designer chose `· {role}` (middle dot) for compactness. Either reads cleanly; Reviewer call.
7. **Sort by name with mixed scripts**: `localeCompare(undefined, { sensitivity: 'base' })` interleaves CJK + Latin by Unicode codepoint, which generally puts CJK after `Z`. If the user prefers CJK-first ordering, swap to `'zh'` locale or add a leading-script bucket sort. Phase 3 default: codepoint-stable.
8. **Future: pagination / virtualization**: at <50 members the unpaginated grid is fine. If the roster grows past ~200, evaluate virtual scrolling. Out of scope now.
9. **Avatar image format**: free-form (jpg/png/webp). If the user wants a single canonical format, document it in `docs/p3-design.md` later. Optimal: 256×256 source → `<img>` displays at 88px/96px, browser scales down crisply.
10. **Live region for filter result count**: optional UX upgrade. Add `<div role="status" aria-live="polite">{filtered.length} members shown</div>` near the FilterBar so screen-reader users hear the count update as they type. Designer's recommendation: include it; cost is one element.

---

## 12. Reviewer acceptance checklist

- [ ] `members.json` is array; valid empty-array case shows §7.1 empty state.
- [ ] One sample row missing each optional field renders without console errors (avatar, oshi, bio, pronouns, location, socials, coverBand).
- [ ] Avatar fallback initials follow §3.2 logic for Latin two-name, single-name, single-char, CJK.
- [ ] Role badges render in the correct color across all 8 themes (manual cycle).
- [ ] Cover band ribbon: present only when `coverBand` set; truncates long labels; tooltip shows full label.
- [ ] Alumnus card: dashed badge border, top strip, desaturation, `padding-top` clears strip.
- [ ] Hover on card: lift + glow (or static under `prefers-reduced-motion`).
- [ ] FilterBar:
  - [ ] Search debounced 200ms (typing 5 chars rapidly fires only one filter pass).
  - [ ] Role radio changes filter; "All" is `null`/no-filter.
  - [ ] Band chips multi-select; "All" chip clears all.
  - [ ] Active band chip has primary-color ring.
- [ ] Search matches `name` and `bio` case-insensitively, supports CJK queries.
- [ ] Empty filter result shows §7.2 with working "Clear filters".
- [ ] Mobile breakpoints:
  - [ ] 320px: 1-col grid, vertical card layout, bottom-right ribbon.
  - [ ] 480px: 1-col grid, horizontal card layout, top-right ribbon.
  - [ ] 768px: 2-col grid.
  - [ ] 1280px: 3-col grid.
- [ ] No horizontal scroll at 320px width.
- [ ] Keyboard nav reaches every interactive element; focus rings visible across all themes.
- [ ] No console errors / warnings on initial render, theme switch, filter change.

---

**Cross-references**:
- Plan: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md` (Phase 3 outline)
- Phase 1 design: `docs/design.md` (theme tokens §1, typography §6, accessibility §7)
- Phase 1 architecture: `docs/architecture.md` (file tree §8, test framework §10)
- Phase 1 components for visual reference: `src/components/Hero/`, `src/components/DiscordCTA/`, `src/components/ComingSoonCard/`

**Designer status**: complete. P3 Architect (task #6) is unblocked.
