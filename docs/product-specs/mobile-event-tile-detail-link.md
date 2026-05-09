# Mobile Event Tile — Detail Link

## Problem

On mobile, event tiles with an external link (`event.links[0].url`) render as `<article>` (non-interactive). The tile needs to become a tappable link that opens the event detail URL.

## Acceptance criteria

- Tiles with a link navigate to the event detail URL on tap.
- Tiles without a link remain inert `<article>` elements — no visual change.
- Full card is the tap target (no "tap here" sub-element).
- No layout shift between linked and unlinked variants.
- Focus ring visible on both light and dark themes.
- Active/pressed state visible on touch (not hover-only).

## Open questions (from Planner)

1. Should `.events-mobile__tile--link` class stay on the new element, or fold into base `.events-mobile__tile`? → **Answered in Designer notes below.**

---

## Designer notes

**Decision on `--link` modifier class:** Keep `.events-mobile__tile--link` as a modifier on the wrapping `<a>` / `<Link>` element. The base `.events-mobile__tile` already carries all layout, background, border, border-radius, and shadow rules that are shared by both variants. The modifier is the correct seam for the `:active` transform + `border-color` affordance that only applies when the tile is interactive. Folding it into the base class would add a pressed animation to inert article tiles — incorrect. No CSS changes needed; existing rules are already correct.

**Layout and hit area:**
- `.events-mobile__tile` is already `display: grid; height: 88px; box-sizing: border-box` — the `<a>` or `<Link>` rendered as a block fills the full `<li>` width, so hit area equals full card with no extra CSS.
- `text-decoration: none; color: inherit` already on base class — no underline bleed.
- No `pointer-events` tweak needed; the `<a>` naturally captures the full box.

**Focus ring spec (matches site convention):**
- Rule: `.events-mobile__tile--link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; border-radius: 14px; }`
- Use `outline-offset: 3px` (matches `.news-mobile-card__link` card-link precedent, not the tighter 2px button precedent) so the ring clears the card's `border-radius: 14px` corner visually.
- `var(--color-primary)` resolves correctly on both light and dark themes — no hardcoded hex.
- This rule is **missing from the current CSS** and must be added by Developer.

**Active/pressed state (touch affordance):**
- Existing `.events-mobile__tile--link:active { transform: translate(-1px, -1px); border-color: var(--color-primary); }` is already present — this is a CSS property transition, fires on `touchstart`/`mousedown`, so it works on touch without hover dependency. No change needed.
- Transition `border-color 150ms ease, transform 150ms ease` already on base — smooth on release.

**No layout shift:**
- Both variants share identical grid/height/padding rules from base class. The only structural difference is element tag (`<a>` vs `<article>`). No class-conditional margin, padding, or display override. Zero layout shift guaranteed.

**No new design tokens:** All rules use existing `--color-primary`, `--color-border`, `--shadow-sticker-rest`. No new colors, shadows, or elevations introduced.

**Summary of CSS delta required (Developer action):**
- Add one rule to `Events.mobile.css`:
  ```css
  .events-mobile__tile--link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }
  ```
- All other existing CSS rules are correct as-is.

---

## Architect integration check

### Route confirmation

- `src/App.jsx:28` declares `<Route path="/events/:slug" element={<EventDetail />} />`. Param name is `slug`.
- `src/pages/EventDetail.jsx:42` reads `const { slug } = useParams()` — name matches.
- `src/pages/EventDetail.jsx:43-49` wraps `decodeURIComponent(slug)` in try/catch and falls back to raw `slug` on malformed encoding (defensive — good).
- `src/pages/EventDetail.jsx:59` calls `fetchEventBySlug(decodedSlug)`; `src/lib/api.js:377` re-encodes via `encodeURIComponent(slug)` when constructing `/api/events/${...}`. Round-trip: `link → encodeURIComponent → URL → useParams (router decodes once) → decodeURIComponent → backend re-encode` — correct for ASCII, slashes, spaces, CJK.
- Existing precedent: `src/components/EventCard/EventCard.jsx:68` already uses the exact same shape: `event.id ? \`/events/${encodeURIComponent(event.id)}\` : null`. Mobile MUST use the same expression for parity.

### Test scaffolding answer (Planner's open question)

Mobile test file does NOT currently wrap with a Router. Adding a `<Link>` to `EventTile` will cause every existing test that renders `<EventsMobile>` with linked tiles to throw `useHref() may be used only in the context of a <Router>`.

**Required wrapper pattern** (mirrors `src/pages/Events.desktop.test.jsx:4-9` and `src/components/EventCard/EventCard.test.jsx:2-8`):

```jsx
import { render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

function render(ui, options) {
  return rtlRender(ui, { wrapper: MemoryRouter, ...options })
}
```

Replace the existing `import { render, screen } from '@testing-library/react'` in `src/pages/Events.mobile.test.jsx:2` with the pattern above. Every existing `render(<EventsMobile ... />)` call site stays unchanged.

`src/test/utils.jsx` already exports `renderWithRouter` and `renderWithProviders` — either is acceptable, but the local-`render`-shadow pattern matches the desktop sibling exactly and minimises diff churn. Use the local-shadow form for consistency with `Events.desktop.test.jsx`.

### Other consumers of EventTile / tileHref

- `EventTile`: defined and used only in `src/pages/Events.mobile.jsx:40,213`. No external imports. Grep confirmed.
- `tileHref`: defined and used only in `src/pages/Events.mobile.jsx:30,41`. No external imports.
- Conclusion: scope is fully contained to `Events.mobile.jsx`. No regression surface elsewhere.

### Decision: delete `tileHref` helper

**Confirmed: delete it.** Rationale:
- After the fix, the link target is `/events/${encodeURIComponent(event.id)}`, computed inline (one line) — no helper needed.
- The old `tileHref(event)` returned `event.links[0].url` (the external "tickets" URL). That semantic is being replaced entirely by the internal detail route. Keeping the helper would invite future regressions (someone re-wires it back to external links, or two link sources diverge).
- `event.id` presence check is trivial enough to inline. If a future tile variant needs more elaborate href logic, reintroduce the helper then. YAGNI.

### Edge tests Developer MUST add

All in `src/pages/Events.mobile.test.jsx`. Use the new `render` helper that wraps with `MemoryRouter`. Replace the existing `'tile with first link renders <a href> to that link'` test (line 119) — its assertion (`href = 'https://example.com/tickets'`) is now wrong. Update existing `'tile without links renders non-interactive <article>'`, `'handles event with empty links array'`, `'skips link when first link missing url'` tests — their premise (no-link → article) must change to **no-id → article** since detail link no longer depends on `event.links`.

New + updated test cases (each one assertion-focused, names exact):

1. **`'tile with id renders <Link> to /events/<encoded id> (replaces external link target)'`** — fixture `{id:'up-1', title:'X', date:..., links:[{url:'https://example.com/tickets'}]}`. Assert `screen.getByRole('link',{name:/X/i})` has `href = '/events/up-1'`. Assert link does NOT have `target='_blank'` and does NOT have `rel='noopener noreferrer'` (internal nav).
2. **`'tile id is encoded in href (URL-special chars)'`** — fixture `{id:'roselia/la 2025', title:'Y', date:...}`. Assert `href = '/events/roselia%2Fla%202025'`. Confirms `encodeURIComponent` parity with EventCard.
3. **`'tile without id renders non-interactive <article>, not <a> (edge)'`** — fixture omits `id` (or `id:''`). Assert `container.querySelector('a.events-mobile__tile')` is `null`, `container.querySelector('article.events-mobile__tile')` is non-null.
4. **`'tile with empty-string id renders <article> (edge)'`** — fixture `{id:'', title:'Z', date:...}`. Same assertion as above. Distinct from the "missing id" case to lock the falsy-string branch.
5. **`'aria-label preserved on linked tile'`** — fixture with `id`, `title`, `date`. Assert the `<a>` element has `aria-label` containing both title and the formatted date string. Mirrors existing aria-label test but on the link branch.
6. **`'aria-label preserved on inert tile'`** — fixture with no `id`. Assert the `<article>` element has `aria-label` containing title.
7. **Update existing `'does not crash with malformed event missing title (edge)'`** (line 227) — broken fixture has `id:'broken'` so it will now render as a `<Link>`. The non-throw assertion still holds; just verify the test still passes after the link change (no code change needed unless title-missing path crashes Link rendering — won't, since title is just child text).
8. **Keyboard navigation test** — defer to integration / not unit-testable here. React Router's `<Link>` renders a real `<a href>`; default browser Enter-key activation works at the DOM level. Vitest+jsdom does not navigate, so `userEvent.keyboard('{Enter}')` would only fire the click event. Acceptable to skip; document in PR description that keyboard activation is covered by `<Link>` semantics + DOM `<a>` defaults. **Not a blocker.**

Edge coverage tier (per standing rule):
- Happy path: linked tile with id (test 1).
- Encoding edges: URL-special chars (test 2).
- Falsy-id branches: missing key (test 3), empty string (test 4) — these are the equivalent of Planner's "no-link → no-`<a>`" inert path under the new semantics.
- Accessibility: aria-label both branches (tests 5, 6).
- Robustness: malformed event still doesn't crash (test 7).

### Files to change (Developer)

1. `src/pages/Events.mobile.jsx`
   - Add `import { Link } from 'react-router-dom'` at top.
   - Delete `tileHref` function (lines 30-38).
   - In `EventTile`: replace `const href = tileHref(event)` with `const detailHref = event.id ? \`/events/${encodeURIComponent(event.id)}\` : null`.
   - Replace the `<a href target rel>` branch (lines 67-77) with `<Link to={detailHref} className="events-mobile__tile events-mobile__tile--link" aria-label={ariaLabel}>{inner}</Link>`. No `target`, no `rel` (internal route).
   - Inert `<article>` branch unchanged (lines 79-83).

2. `src/pages/Events.mobile.css`
   - Add the focus-visible rule from Designer notes (one new block).

3. `src/pages/Events.mobile.test.jsx`
   - Add `import { MemoryRouter } from 'react-router-dom'` and shadow the imported `render` per the wrapper pattern above.
   - Update existing assertions for `'tile with first link...'`, `'tile without links...'`, `'handles event with empty links array'`, `'skips link when first link missing url'` per Developer's judgement to align with id-based href semantics (these are now outdated).
   - Add 7 new/updated tests (1-7 above).

### Worker touchpoints

None. This PR is pure frontend (React component + CSS + frontend test). No `worker/` files affected, so the no-CI-for-worker rule is not engaged. Reviewer still needs `npx vitest run` locally for the frontend test file changes.

### Go / no-go

**GO for Developer.** No spec ambiguity. No conflicting prior decisions. No breakage risk outside `Events.mobile.{jsx,css,test.jsx}`. `tileHref` deletion is safe (single-file scope confirmed). MemoryRouter wrapper precedent already exists in two sibling files — not a new pattern.
