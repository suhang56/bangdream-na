# bangdream-na — Phase 2 Events Page Design Spec

Single-source design reference for the Events page (`/events`).
Audience: P2 Architect (data shape + component contracts), P2 Developer (DOM + CSS + edge cases), P2 Reviewer (acceptance criteria).

**Theme tokens are LOCKED.** Phase 1 owns the eight-theme palette (`docs/design.md`). This page consumes those tokens unchanged — no new `--color-*` is added. All band-tinted visuals are produced by composing existing tokens and `--gradient-hero`.

**Aesthetic anchor**: same dark-glass + theme-tinted gradient hero, same `clamp()` typography scale, same `system-ui` stack as Phase 1. EventCard hover mirrors the lift+glow pattern from `portfolio/src/components/Projects.css:17-21` (translateY -4px, border tint to `--color-primary`, soft shadow).

---

## 1. Data schema — `src/data/events.json`

Shape: top-level array of `Event` objects. Empty array (`[]`) is a valid file (renders the empty state).

### 1.1 `Event` field contract

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable unique ID, e.g. `"ax-2026-poppinparty"`. Used as React `key` and for deeplinks (Phase 4 admin). MUST NOT change once shipped — hashes a deep link. |
| `title` | string | yes | Plain text, no markdown. Max ~80 visible chars; longer wraps. |
| `date` | string (ISO 8601) | yes | Either date-only (`"2026-07-04"`, treated as 00:00 local-to-venue) or full datetime with offset (`"2026-07-04T19:00:00-07:00"`). Past/upcoming partition uses the parsed Date. See §1.3 timezone rules. |
| `endDate` | string (ISO 8601) | no | Optional event end (multi-day cons). When present and `> now`, event remains "upcoming" until `endDate` passes. |
| `location` | object | yes | See §1.2. |
| `type` | enum | yes | `"concert" \| "fanmeet" \| "con" \| "online"` |
| `description` | string | no | Markdown allowed (single paragraph or two). Stored as one string; renderer trims and applies a minimal sanitizer (see §1.4). Empty/missing → no description rendered. |
| `links` | array | no | `[{ label: string, url: string }, ...]`. Empty array == missing == no links. The first entry is treated as the primary CTA target on whole-card click. |
| `image` | string (path) | no | Path under `public/` (e.g. `"/events/ax-2026.jpg"`) or absolute https URL. Missing → letter-avatar fallback (§3.4). |
| `bands` | array of strings | no | Subset of canonical band names: `["Roselia", "Poppin'Party", "MyGO!!!!!", "Morfonica", "Afterglow", "Pastel*Palettes", "Hello, Happy, World!", "RAISE A SUILEN"]`. Order = display order on the card. Empty/missing → no band tags rendered. RAISE A SUILEN is included even though it has no Phase 1 theme — surfaces in tags only. |
| `ticketUrl` | string (https URL) | no | Convenience field. If present and `links` is empty, rendered as a single "Get tickets" button. If both `ticketUrl` and `links` are present, `ticketUrl` is appended as the **last** link with label `"Tickets"`. Never rendered twice. |

### 1.2 `location` sub-object

| Field | Type | Required | Notes |
|---|---|---|---|
| `city` | string | yes | e.g. `"Los Angeles"`. |
| `state` | string | no | US/CA state or province abbrev, e.g. `"CA"`. Display: `"Los Angeles, CA"`. Missing → omit comma (`"Tokyo"`). |
| `country` | string | yes | ISO country name or shortcode, e.g. `"USA"`, `"Canada"`, `"Japan"`. Used for the "international" qualifier and for online events display. |
| `venue` | string | no | e.g. `"Crypto.com Arena"`. When present, displayed as line 1; city/state on line 2. When missing, only the city/state/country line is shown. |

### 1.3 Timezone & "now" rules

- Comparing past vs. upcoming uses `new Date(event.date) <= new Date()` against the **client's clock**. No server time involved — page is static.
- ISO strings without offset (date-only or `T19:00:00`) are interpreted by the browser as local time. **Acceptable drift**: a US-based event displayed to a Tokyo visitor may flip past/upcoming a few hours early. Documented; not blocking.
- Display formatting uses `Intl.DateTimeFormat(undefined, { … })` so the user sees their own locale.
- For `online` events, `location.country` MAY be `"Online"` or `"Worldwide"` — treated as a free-form string by the renderer.

### 1.4 Description markdown subset

Allowed: bold (`**…**`), italic (`*…*`), inline links (`[label](url)`), line breaks. Lists/headings/images are NOT supported in Phase 2 — strip with the renderer or render literally.

**Architect decides**: bring a tiny markdown renderer (e.g. `marked` ~30 KB, or `micromark` lighter), OR pre-render to a small "rich text node array" via a 30-line custom parser. The Designer's recommendation is the **30-line custom parser** to avoid a dependency for ~6 events. Either is acceptable; Reviewer audits the chosen approach for XSS (no raw `innerHTML` of unsanitized URLs).

### 1.5 Validation expectations (build-time, not runtime)

A small `validateEvents(events)` util (Architect places) runs in tests and at module import in dev mode only. Asserts:

- Every event has the required fields above.
- `id` is unique within the file.
- `type` is one of the four enum values.
- `date` (and `endDate` if present) parses as a valid Date.
- `bands` entries are within the canonical set.
- `links[*].url` and `ticketUrl` start with `https://` or `http://`.
- `image` either starts with `/` (relative public asset) or `https://`.

In production, validator is no-op (avoids bundling). Bad data falls through to the lenient renderer (§4 edge cases).

### 1.6 Initial seed content

Developer ships 4–6 placeholder events covering all four `type` values, mixed past/upcoming, mixed missing-image / present-image, mixed band-tag count (0, 1, 3) so every visual permutation renders without curating live data. Real curated events arrive via Phase 4 admin or a manual user PR.

---

## 2. Page layout — `<Events />`

```
<main class="events-page">
  <section class="events-hero">                ← compact hero (NOT full-viewport like Home)
    <h1>Events</h1>
    <p class="events-subtitle">Concerts, fan meets, and conventions across North America.</p>
    <EventFilter ... />                        ← chip row + sort
  </section>

  <section class="events-list" aria-label="Upcoming events">
    <h2>Upcoming</h2>
    <EventList events={upcoming} ... />        ← or empty-state inline
  </section>

  <section class="events-list" aria-label="Past events">
    <h2>Past</h2>
    <EventList events={past} ... />
  </section>
</main>
```

Both Upcoming and Past sections render unconditionally — but render an inline empty-state row when the partition is empty (e.g. "No upcoming events match — try clearing filters"). This keeps section anchors stable and avoids layout flicker as filters toggle.

### 2.1 Hero treatment

- NOT full-viewport. `min-height` ≈ 240px, padding `4rem 2rem 1.5rem`.
- Background: same `--gradient-hero` overlay at **0.08 opacity** (lower than Home's 0.12 — events page should be content-first, not landing-grand).
- `<h1>Events</h1>` — `font-size: clamp(2rem, 5vw, 3.5rem)`, `font-weight: 800`, same `letter-spacing: -1px`, `color: var(--color-text)`, `margin: 0 0 0.5rem`.
- `events-subtitle` — `clamp(0.9375rem, 2vw, 1.125rem)`, `color: var(--color-text-muted)`, `margin: 0 0 2rem`, `max-width: 640px`.
- `<EventFilter />` sits inside the hero, immediately under the subtitle, full-width up to `max-width: 1024px`.

### 2.2 Section title (`<h2>Upcoming|Past</h2>`)

- Spec from Phase 1 typography (§6): `clamp(1.75rem, 4vw, 2.5rem)`, weight 800, letter-spacing -0.5px.
- `color: var(--color-text)`.
- Below the title, a 1px hairline `border-bottom: 1px solid var(--color-border)`, `padding-bottom: 0.75rem`, `margin-bottom: 1.5rem`.
- Past section: title `opacity: 0.85` to subtly visually downrank against Upcoming.

### 2.3 List container

- `display: grid`, `grid-template-columns: 1fr` (one column — events are wide cards, not tile grid).
- `gap: 1rem`.
- `max-width: 1024px`, centered.
- A two-column grid at >=1280px is **out of scope for Phase 2** (recommendation §8.2). Single column scales fine.

### 2.4 Page outer padding

- Desktop: `padding: 0 2rem 4rem` (no top — hero owns top spacing).
- Tablet (≤768px): `padding: 0 1.25rem 3rem`.
- Phone (≤480px): `padding: 0 0.75rem 2.5rem`.

---

## 3. EventCard component

Renders one event. Owns its own internal layout decisions; receives only an `event` prop (the schema object from §1).

### 3.1 Variants & state

- **Upcoming** (`event.date >= now`, or `endDate` present and not yet past): full color, full opacity.
- **Past**: outer container `opacity: 0.6`, hover lifts opacity to `0.85` (so users can still read details). NO transform on past cards (lift-on-hover signals "actionable" — past events are reference-only). Past cards still navigate on click if `links[0]` exists.
- **No links / no ticketUrl**: card is non-interactive. `cursor: default`, no hover lift, no focus ring on the card root (interior link buttons remain focusable).

### 3.2 Layout (desktop, ≥769px)

```
+--------------------------------------------------------------+
| [image  ]  TITLE                              [type-badge]  |
| [16:9   ]  📅 Date · 📍 Venue, City, ST                     |
| [240×135]  Description preview (max 2 lines, ellipsis).     |
| [       ]  [Roselia] [Poppin'Party]   [Tickets ↗] [More ↗]  |
+--------------------------------------------------------------+
```

- Outer: `display: grid`, `grid-template-columns: 240px 1fr`, `gap: 1.25rem`, `padding: 1.25rem`, `border-radius: 14px`, `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`.
- Image cell: `aspect-ratio: 16/9`, `border-radius: 10px`, `overflow: hidden`, `background: var(--color-border)` (placeholder before image loads).
- Image element: `<img>` with `loading="lazy"`, `decoding="async"`, `alt={event.title}`, `width: 100%`, `height: 100%`, `object-fit: cover`.
- Content cell: `display: flex`, `flex-direction: column`, `gap: 0.625rem`, `min-width: 0` (allows truncation).

### 3.3 Content rows

**Top row** — flex row with `justify-content: space-between`, `align-items: flex-start`, `gap: 1rem`.

- **Title** — `<h3>`, `font-size: 1.25rem` (matches ComingSoonCard), `font-weight: 700`, `color: var(--color-text)`, `margin: 0`, `line-height: 1.3`. `min-width: 0` on parent enables ellipsis if added later (Phase 2 wraps freely).
- **Type badge** — pill (§5 below). `flex-shrink: 0`. Top-right anchor.

**Meta row** — `display: flex`, `flex-wrap: wrap`, `gap: 0.5rem 1rem` (row-gap for wrap, col-gap between items), `font-size: 0.875rem`, `color: var(--color-text-muted)`.

- Date piece: `📅 {formattedDate}`. Format: `Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })` for date-only; append time `, h:mm a` if the ISO string had a time component. Examples: `Sat, Jul 4, 2026` or `Sat, Jul 4, 2026, 7:00 PM`.
- Venue/location piece: `📍 {venue ? venue + " · " : ""}{city}{state ? ", " + state : ""}{country !== "USA" ? " · " + country : ""}`. Examples: `Crypto.com Arena · Los Angeles, CA` or `Tokyo · Japan`. International qualifier (the country-tail) only for non-USA events.
- For `type: "online"`: replace 📍 with 💻 and use `location.country` directly (e.g. `💻 Online`).

> Emoji vs SVG — Designer choice: emoji glyphs above (📅 📍 💻) for fast iteration. Architect/Developer may swap to inline 16×16 SVGs (calendar / pin / monitor outlines, currentColor stroke 1.75) if emoji glyph rendering varies per OS. Either is acceptable; the visual weight target is "small muted icon paired with text". Test attribute hooks should target classnames, not the glyph.

**Description** — `<p>` rendered from the markdown subset (§1.4).

- `font-size: 0.9375rem`, `color: var(--color-text-muted)`, `line-height: 1.55`, `margin: 0`.
- Line clamp to 2 lines: `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;` (Phase 2 truncation; Phase 4 detail page can show full).
- Missing/empty description → don't render the `<p>` at all (no empty space reserved).

**Bottom row** — flex row with `justify-content: space-between`, `align-items: center`, `gap: 1rem`, `flex-wrap: wrap`, `margin-top: auto`.

- **Band tags** (left): inline list of pills (§5). Each tag: `padding: 0.25rem 0.625rem`, `border-radius: 999px`, `font-size: 0.75rem`, `background: var(--color-border)`, `color: var(--color-text)`. Hover (only when card is interactive): tag tints `background: var(--color-bg-card)`, `border: 1px solid var(--color-primary)`. Tags are NOT links (Phase 2 scope).
- **Action buttons** (right): each `link` and `ticketUrl` (deduped) renders as a small button. Style: `display: inline-flex`, `align-items: center`, `gap: 0.375rem`, `padding: 0.5rem 0.875rem`, `border-radius: 8px`, `border: 1px solid var(--color-border)`, `background: transparent`, `color: var(--color-text)`, `font-size: 0.875rem`, `font-weight: 600`, `text-decoration: none`. Hover: `border-color: var(--color-primary)`, `background: var(--color-bg-card)`. The first button (primary) gets a filled treatment: `background: var(--color-primary)`, `color: #fff`, `border-color: transparent`. External-link suffix: `↗` glyph after the label.
- If there are >3 actions, only the first 3 render; overflow is silently dropped in Phase 2 (rare; Phase 4 admin can reveal in a detail view).

### 3.4 Letter-avatar fallback (no `image`)

- Same dimensions as the image cell (aspect 16:9, 240×135 desktop).
- `background: var(--gradient-hero)` (theme-tinted, very on-brand).
- Centered `<span>`: first letter of `event.title` uppercased. `font-size: 3rem`, `font-weight: 800`, `color: rgba(255,255,255,0.9)`, `letter-spacing: -2px`, `text-shadow: 0 2px 8px rgba(0,0,0,0.4)`.
- For very short titles where `title[0]` is whitespace or punctuation, fall back to letter `?`. Validator (§1.5) flags titles starting non-alphanumeric.

### 3.5 Hover & interaction (upcoming, has links)

- Card root is rendered as `<article>` for past events, and as `<a>` for upcoming events with a primary link. Reasoning: the whole card is a click target, but the `<a>` semantics keep right-click + middle-click + cmd+click natural.
- When rendered as `<a>`: `target="_blank"`, `rel="noopener noreferrer"`, `text-decoration: none`, `color: inherit`. The interior buttons stop click propagation only when they have a *different* href (so users can right-click a tag pill without being yanked to the primary link). Practically: the action buttons in the bottom row are also `<a>` tags and should call `e.stopPropagation()` on click ONLY if they fire `target="_blank"` differently than the parent — Architect can simplify by always stopping propagation on inner anchors; the outer `<a>` still owns the whole-card click semantics.
- Hover (only when interactive):
  - `transform: translateY(-4px)`
  - `border-color: var(--color-primary)`
  - `box-shadow: 0 12px 32px -16px color-mix(in srgb, var(--color-primary) 35%, transparent)`
  - Transition: `transform 200ms, border-color 200ms, box-shadow 200ms`.
- `:focus-visible` on card root (when `<a>`): `outline: 2px solid var(--color-primary)`, `outline-offset: 3px`.
- `prefers-reduced-motion: reduce` → no transform on hover (border + shadow only).

### 3.6 Mobile (≤768px)

- Grid collapses to single column: `grid-template-columns: 1fr`.
- Image cell becomes full-width banner: `aspect-ratio: 16/9`, `width: 100%`, `border-radius: 10px 10px 0 0` (top-only round so it tucks into the card top).
- Card padding reduces to `1rem`. Image moves out of the padded area: card becomes `padding: 0`, image edge-to-edge inside the rounded card border, content gets its own inner `padding: 1rem`.
- Title row: type badge wraps onto its own line if title is long (`flex-wrap: wrap` on the top row).

### 3.7 Very small mobile (≤320px)

- **Image hidden entirely** (`display: none`). The 16:9 banner consumes too much real estate at this width.
- Letter-avatar fallback also hidden.
- Title font-size floor: `1.0625rem`.
- Action buttons: `width: 100%`, stacked vertically, full-bleed inside content padding. `flex-direction: column`, `align-items: stretch`.

---

## 4. EventFilter component

A horizontal toolbar inside the page hero. Three controls.

### 4.1 Controls

1. **Type chips** (multi-select, OR semantics):
   - Five chips: `All` / `Concerts` / `Fan Meets` / `Conventions` / `Online`.
   - `All` is mutually exclusive with the others. Clicking a specific type when `All` is active deactivates `All` and activates only that chip. Clicking `All` deactivates all others.
   - Other chips can be toggled on/off freely; deselecting the last one re-activates `All` (never an empty filter — empty == All).
2. **Past/Upcoming radio** (exclusive, but both sections always render):
   - Three states: `Both` (default) / `Upcoming only` / `Past only`. Implemented as a 3-way segmented control.
   - When `Upcoming only`: hide the entire `<section aria-label="Past events">`. When `Past only`: hide upcoming.
3. **Sort radio** (exclusive):
   - Two options: `Newest first` (default) / `Oldest first`. Sort applies within each section independently. "Newest first" puts soonest-upcoming and most-recent-past at the top of their respective lists.

State is local React state. **No URL hash sync in Phase 2** (matches plan recommendation). Reasoning: shareable filtered URLs require URL→state→render and state→URL writeback, which adds complexity without a clear user demand for v1. Phase 4 admin can revisit if events grow large.

### 4.2 Chip visual

- Element: `<button type="button">`.
- Resting: `padding: 0.5rem 0.875rem`, `border-radius: 999px`, `font-size: 0.875rem`, `font-weight: 600`, `background: transparent`, `color: var(--color-text-muted)`, `border: 1px solid var(--color-border)`, `cursor: pointer`.
- Hover: `border-color: var(--color-primary)`, `color: var(--color-text)`.
- Active (`aria-pressed="true"`): `background: var(--color-primary)`, `color: #fff` (white universal — see §5.4 for contrast notes per theme), `border-color: transparent`.
- Focus: `outline: 2px solid var(--color-primary)`, `outline-offset: 2px`.
- Transition: `background 150ms, border-color 150ms, color 150ms`.

### 4.3 Segmented control (past/upcoming)

- Container: `display: inline-flex`, `border: 1px solid var(--color-border)`, `border-radius: 8px`, `overflow: hidden`, `background: var(--color-bg-card)`.
- Each segment: `<button type="button" aria-pressed={isActive}>`. Padding `0.5rem 0.875rem`, no border (separator drawn by adjacent buttons), `font-size: 0.875rem`, `font-weight: 600`, `background: transparent`, `color: var(--color-text-muted)`. Active: `background: var(--color-primary)`, `color: #fff`. Adjacent buttons share a 1px `border-left: 1px solid var(--color-border)` (skipped on the active button so it visually merges).

### 4.4 Sort dropdown

- For Phase 2 simplicity: a `<select>` styled to match the segmented control. Two options. Custom-styled `<select>` (no third-party combobox).
- Style: same border + radius as segmented control, with a chevron `▾` background-image at right.
- This is a deliberate downgrade in visual consistency vs the chip/segmented pattern — users only see two options and a native `<select>` is keyboard-perfect with no a11y debt.

### 4.5 Layout

- Toolbar: `display: flex`, `flex-wrap: wrap`, `gap: 0.75rem 1rem`, `align-items: center`.
- Chips group ⟷ segmented group ⟷ sort group. On wrap, groups stay coherent.
- ≤480px: each group collapses to its own row; chip group is horizontally scrollable (`overflow-x: auto`, `-webkit-overflow-scrolling: touch`, scrollbar hidden, `padding-bottom: 0.25rem` for scrollbar room). Chips in a single row, never wrap on mobile.

### 4.6 Filter result count

- Below the toolbar (or in toolbar's last slot on desktop): a small text node `12 upcoming · 4 past` (font 0.8125rem, `var(--color-text-muted)`). Updates as filters change. When zero matches: `0 results`.

---

## 5. Type badges & band-tinted accents

### 5.1 Badge contract

Every event has exactly one `type`. The badge sits in the EventCard top-right.

| `type` | Label | Color source | Token | Notes |
|---|---|---|---|---|
| `concert` | "Concert" | Theme primary | `var(--color-primary)` | Strongest visual weight. |
| `fanmeet` | "Fan Meet" | Theme accent | `var(--color-accent)` | Softer, social. |
| `con` | "Convention" | Color-mix | `color-mix(in srgb, var(--color-primary) 50%, var(--color-accent) 50%)` | Mid-band tint. |
| `online` | "Online" | Muted | `var(--color-text-muted)` | Visually downranked — distance-mode. |

### 5.2 Badge style (all types)

- `display: inline-flex`, `padding: 0.25rem 0.625rem`, `border-radius: 999px`, `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `white-space: nowrap`, `flex-shrink: 0`.
- Foreground: see §5.3 contrast.
- Background: per type table above.

### 5.3 Contrast guarantee

Badge text MUST clear WCAG AA against the badge background on every theme.

- For `concert` / `fanmeet` / `con`: foreground is **`#ffffff`** white. This passes AA on every theme's `--color-primary` and `--color-accent` (verified via the contrast notes in `docs/design.md` §1) — the lowest-contrast pair is `morfonica` accent `#b896e8` on white at 2.6:1, which **fails**. **Mitigation**: use `color: rgba(0, 0, 0, 0.85)` (near-black) on light pastel/cool accent backgrounds. Implement via a small `pickReadable(bgHex)` util OR — simpler — hard-code per-theme override CSS:
  - Default (most themes): badge fg = `#fff`, bg = primary/accent/mix.
  - Light-leaning themes where `--color-accent` is pale (`pastel`, `morfonica`): override `--badge-fg-fanmeet` to dark.
  - **Recommendation**: a single CSS custom property the Architect adds to each theme — `--color-on-accent` defaulting to `#fff`, overridden to `rgba(0,0,0,0.85)` on `pastel`/`morfonica`. This keeps the contract local to theme tokens without per-component theme branching.
- `online` badge uses `var(--color-text-muted)` background with `var(--color-bg)` foreground — both already AA-verified pairs from Phase 1. Or use `var(--color-bg)` bg with `var(--color-text-muted)` fg + a 1px `border: 1px solid var(--color-border)`. **Designer prefers the bordered outline variant** for `online` — it visually says "less prominent" without consuming a paint slot.

### 5.4 Verification (Reviewer)

For each of the 8 themes, switch theme and verify:
1. Concert badge foreground passes AA on primary background.
2. Fan Meet badge foreground passes AA on accent background.
3. Convention badge foreground passes AA on the 50/50 mix.
4. Online badge readable as outlined pill.

If any single combination fails, escalate — does NOT block ship if the failure is `morfonica`/`pastel` `fanmeet` (already mitigated by `--color-on-accent` override). Other failures are blockers.

### 5.5 Band tags

Band-name pills in EventCard bottom row (§3.3) deliberately do NOT take theme color. Reason: an event listing "Roselia + Poppin'Party" should not require the user's theme to be either band. Tags are theme-neutral chips (`var(--color-border)` bg, `var(--color-text)` fg, theme-primary border on hover).

---

## 6. Empty states

### 6.1 No events at all (`events.json` is `[]`)

Replaces both Upcoming and Past sections with one centered card.

- Container: `max-width: 480px`, `margin: 4rem auto`, `padding: 2.5rem 2rem`, `text-align: center`, `border: 1px dashed var(--color-border)`, `border-radius: 14px`, `background: var(--color-bg-card)`.
- Icon (top): 48×48 calendar SVG outline, `color: var(--color-text-muted)`.
- Title: "No events yet", `font-size: 1.5rem`, `font-weight: 700`, `color: var(--color-text)`, `margin: 0.75rem 0 0.5rem`.
- Body: "Check back soon — concerts, fan meets, and conventions will be listed here as they're announced.", `color: var(--color-text-muted)`, `font-size: 0.9375rem`, `line-height: 1.6`, `margin: 0`.
- Filter bar still renders but every chip is disabled (`aria-disabled="true"`, `cursor: not-allowed`, opacity 0.5). Reasoning: zero data — nothing to filter. Avoid the user clicking and getting no feedback.

### 6.2 Filter yields zero results (data exists, filter excludes all)

Inline empty row inside the affected section.

- Renders inside `<EventList>` when its filtered `events` array is empty.
- `padding: 2rem`, `text-align: center`, `color: var(--color-text-muted)`, `font-size: 0.9375rem`.
- Text: `"No {sectionLabel} events match — try clearing filters."` (sectionLabel is `"upcoming"` or `"past"`).
- A small inline "Clear filters" `<button>` resets type chips to `All`, sort to default. Past/Upcoming exclusive remains as-is (the visible section is what the user explicitly chose).

### 6.3 Loading state

Per task brief: NOT NEEDED. JSON imports are synchronous bundling; events array is available on first render. Skipped.

### 6.4 Image load failure

`<img>` `onError`: swap to letter-avatar (§3.4). `onError` handler clears the `src` and toggles a `data-fallback="true"` attribute that the CSS uses to show the avatar layer beneath. NO console error logged.

---

## 7. Mobile breakpoints — summary table

| Width | Hero | Card layout | Image cell | Filter bar | Action buttons |
|---|---|---|---|---|---|
| ≥1280px | full | 240px image + content side-by-side | 240×135 | inline row | inline right |
| 769–1279px | full | same | same | same | same |
| 481–768px | smaller padding | image becomes full-width banner above content | full width 16:9 | groups wrap to multi-row | inline right, may wrap |
| 321–480px | compact | banner above content | full width 16:9 | chip group horizontally scrollable | full-width stacked |
| ≤320px | compact, no gradient bg | text-only (image hidden) | hidden | chip group scrollable, single column groups | full-width stacked |

The 320px bottom is matched to Phase 1 (`docs/design.md` §2). Below 320px is unsupported.

---

## 8. Open issues for Architect / Developer

1. **Markdown renderer choice** (§1.4). Recommendation: 30-line custom parser, no dependency. Architect may import `marked@13` if seed content needs richer formatting than expected. Reviewer audits XSS regardless.

2. **Detail page / route**. Recommendation: **NO**. Phase 2 is single-page list. Whole-card click goes to external `links[0].url` (vendor site, ticket page, etc.). A dedicated `/events/:id` page becomes valuable when description text grows long or when we want canonical SEO URLs — defer to Phase 4 alongside admin.

3. **Two-column grid at ≥1280px**. Recommendation: **NO** for Phase 2. Cards are wide and dense; two-up makes them feel cramped. Single column with generous max-width (1024px) preserves scannability. Reconsider if event count grows past ~30.

4. **`--color-on-accent` token** (§5.3). Architect adds this token to each theme in `src/theme/themes.js`:
   - All themes: `"--color-on-accent": "#ffffff"`
   - `pastel`, `morfonica` overrides: `"--color-on-accent": "rgba(0, 0, 0, 0.85)"`
   - `hhw` should be checked too — `--color-accent` is `#aa33cc` (passes white at ~5.4:1, OK). Roselia `--color-accent` `#d4af37` gold against white = ~1.7:1 (FAIL). **Override Roselia and Pastel and Morfonica**. HHW yellow `--color-primary` `#ffee22` against white = 1.1:1 (FAIL — but yellow is `--color-primary` not accent, so concert badges on HHW are the issue, not fanmeet). **HHW concert badge foreground also needs dark.** Add `--color-on-primary` token analogously, override to `rgba(0,0,0,0.85)` on `hhw`.
   - Final token contract additions:
     - `--color-on-primary` (default `#fff`, override `hhw`)
     - `--color-on-accent` (default `#fff`, override `roselia`, `pastel`, `morfonica`)
   This is the only theme-token surface change Phase 2 introduces. Phase 1 contract is preserved (existing tokens unchanged). Designer recommends Architect carry these into `themes.js` now even if Reviewer ends up tightening contrast targets later.

5. **Past event with future date** (data error). Per task brief: trust the date, render as upcoming. No data correction at runtime. The validator (§1.5) does not flag this case — it's a curation issue, not a schema issue.

6. **Whole-card link semantics** (§3.5). Architect decides whether to nest action `<a>` inside the card-root `<a>` or use a CSS-only "stretched link" pattern (the card is `<article>` and an absolutely-positioned overlay `<a>` covers the whole card). Designer prefers **stretched link**:
   - Avoids nested-anchor HTML invalidity.
   - Inner action buttons (`<a>` tags) sit on top with `position: relative`, `z-index: 2` and naturally get their own click without `stopPropagation()`.
   - Past events without `links[0]` simply omit the stretched-link overlay.
   The card root stays `<article>`. Implementation reference pattern is well-documented as "Bootstrap stretched link" / "BEM card pattern".

7. **Image asset storage**. Phase 2 stores event images in `public/events/{id}.jpg` (or .png/.webp). Filename matches `event.id`. Recommendation to **never** check >300KB images in — let admin Phase 4 add a Vercel-hosted blob path if curators want larger. For Phase 2, seed images may be Unsplash/Bushiroad press-kit stills sized 480×270 (2× the rendered 240×135).

8. **Date format for past events relative to "now"**. Far-past dates (>1 year) display year-prominent. Far-future dates (next year+) display year too. Within the current year, year is omitted: `Sat, Jul 4` (no year) feels less cluttered. **Implementation**: `if (event.year !== currentYear) include year`. Reviewer may decide always-show-year for clarity — Designer is fine with either.

9. **`bands` canonical normalization**. The validator should accept case-insensitive, whitespace-tolerant names but NORMALIZE to the canonical form for storage & display. e.g. `"poppinparty"` → `"Poppin'Party"`. Phase 4 admin should always write canonical; Phase 2 validator catches drift in seed data.

10. **EventCard size jitter on theme switch**. Hover shadow uses theme-primary color. When user switches theme while hovering, shadow recolors instantly (CSS transition is on `box-shadow`). Acceptable. Don't add per-theme card variants.

---

## 9. Reviewer acceptance checklist (Phase 2)

- [ ] `/events` route renders (already mounted in Phase 1 — verify content replaces placeholder).
- [ ] Hero shows "Events" title, subtitle, and filter bar; gradient bg at ~0.08 opacity is visible behind.
- [ ] Both `Upcoming` and `Past` `<h2>` sections render. Past is visually slightly muted.
- [ ] Seed `events.json` covers all four `type` values, mixed past/upcoming, mixed `image` present/absent, mixed `bands` count.
- [ ] EventCard renders all schema fields correctly. Missing fields (description, image, bands, links) gracefully omit their UI rather than rendering empty containers.
- [ ] Letter-avatar fallback fires when `image` missing, AND when image fails to load (test by putting a bad path in one seed event).
- [ ] Hover state on upcoming card: -4px lift, primary-tint border, soft shadow. Past cards: opacity lift only (no transform).
- [ ] Whole-card click navigates to `links[0].url` (target=_blank). Inner action buttons navigate to their own URLs without bubbling to the card link.
- [ ] Type badge color cycles correctly per type. Verify on at least 3 themes (`neutral`, `pastel`, `hhw`) that badge text remains readable (AA).
- [ ] Filter chips: clicking a specific type deactivates `All`; clicking `All` deactivates the others; deselecting the last specific chip re-activates `All`.
- [ ] Past/Upcoming segmented control hides the appropriate section.
- [ ] Sort radio reorders cards within both sections.
- [ ] Filter result count text updates live.
- [ ] Empty `events.json` (`[]`) → only the empty-state card shows; filter bar is disabled.
- [ ] Filter combo with zero matches → inline "No upcoming|past events match" with Clear filters button that works.
- [ ] Mobile (≤768px): EventCard stacks (image full-width banner above content). Filter bar groups wrap to multiple rows.
- [ ] Very small mobile (≤320px): image hidden, action buttons full-width stacked.
- [ ] Theme switch (cycle all 8 themes from Phase 1 ThemeSwitcher) on `/events`: gradient hero, badge colors, card hover shadow, filled buttons, chip active state ALL recolor live without page reload.
- [ ] Keyboard: Tab reaches every chip, segment, sort `<select>`, and every interactive card / inner button. Focus rings visible on all.
- [ ] No console errors on initial load, on filter changes, on theme switches, or when an image 404s (handled by fallback).
- [ ] Coverage ≥ 80% on `src/components/Event*` and any utility files (date format, validator, markdown parser).

---

## 10. Cross-references

- **Phase 1 design (LOCKED tokens + typography + accessibility baseline)**: `docs/design.md`
- **Phase 1 architecture (stack, test framework, file conventions)**: `docs/architecture.md`
- **Approved overall plan**: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md` (Phase 2 outline)
- **Aesthetic reference (hover lift + glow)**: `portfolio/src/components/Projects.css:17-21`
- **Existing components for visual consistency**: `src/components/Hero/Hero.{jsx,css}`, `src/components/DiscordCTA/DiscordCTA.css`, `src/components/ComingSoonCard/ComingSoonCard.{jsx,css}`

---

**Designer status**: complete. Architect (task #2, parallel) consumes §1 (data schema + validator) and §8.4 (token additions). Developer (task #3, blocks on Designer + Architect) consumes everything.
