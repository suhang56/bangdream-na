# `bangdream-na` Phase 2 — Events Page Architecture

**Status**: APPROVED for Developer dispatch (Architect deliverable for task #2 in team `bangdream-na-phase23`).

**Scope**: replace the placeholder `/events` page with a real, data-driven Events page. Additive only — no Phase 1 stack/test/coverage decisions are reopened.

**Inherited from Phase 1** (do not change):
- Stack: React 19 + Vite 8 + react-router-dom 7 + Vitest 3 + jsdom (`docs/architecture.md` §1)
- Coverage gate: 80% lines/functions/branches/statements globally (`vite.config.js`)
- Test conventions: co-located `.test.jsx`, `renderWithProviders` from `src/test/utils.jsx`
- Theme tokens: `var(--color-*)` and `var(--gradient-hero)` only — never hard-coded hex
- Lint config, ESLint flat config, `globals: true` Vitest setup, jsdom env
- ThemeProvider wraps the app; BrowserRouter inside; routes already mounted in `src/App.jsx`

**Cross-references**:
- Plan: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md` §"Phase 2 — Events page"
- Phase 1 architecture: `docs/architecture.md`
- Phase 1 design (theme tokens, typography scale): `docs/design.md`
- Phase 2 design (visual values, exact CSS, layout): **`docs/p2-design.md`** — produced by P2 Designer (task #1, parallel). Developer reads both this file and `p2-design.md` together.

---

## 1. Replace the placeholder Events page

Current state in `src/pages/Events.jsx` (existing tree):

```jsx
// EXISTING — to be fully replaced
import ComingSoonCard from '../components/ComingSoonCard/ComingSoonCard.jsx'

export default function Events() {
  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Events</h1>
        <p className="section-subtitle">…coming with Phase 2.</p>
        <div className="coming-soon-grid">
          <ComingSoonCard title="Concert Calendar" eta="Phase 2" … />
          <ComingSoonCard title="Convention Map" eta="Phase 2" … />
        </div>
      </div>
    </main>
  )
}
```

**Action**: rewrite `src/pages/Events.jsx` from scratch. Remove the `ComingSoonCard` import. Remove the `coming-soon-grid` div. Keep the outer `<main className="section">` + `<div className="section-inner">` shell so global section spacing still applies.

**No change to `src/App.jsx`** — `<Route path="/events" element={<Events />} />` already exists; Phase 2 just swaps the implementation behind that route.

**No change to `src/components/ComingSoonCard/`** — keep the component (Phase 3 still uses it on the Members placeholder, and Phase 1's Home page composes it).

---

## 2. New file inventory

### 2.1 Components (each in its own folder, co-located CSS + test)

```
src/components/
├── EventCard/
│   ├── EventCard.jsx
│   ├── EventCard.css
│   └── EventCard.test.jsx
├── EventList/
│   ├── EventList.jsx
│   ├── EventList.css
│   └── EventList.test.jsx
├── EventFilter/
│   ├── EventFilter.jsx
│   ├── EventFilter.css
│   └── EventFilter.test.jsx
└── TypeBadge/
    ├── TypeBadge.jsx
    ├── TypeBadge.css
    └── TypeBadge.test.jsx
```

### 2.2 Utility module

```
src/lib/
├── events.js
└── events.test.js
```

`src/lib/` is a new directory in this codebase (Phase 1 had no shared utilities outside `src/theme/`). Convention: pure-functions live here, named after the domain.

### 2.3 Data

```
src/data/events.json   # ships as []
```

### 2.4 Page (replace existing file in place)

```
src/pages/Events.jsx
src/pages/Events.test.jsx   # NEW — page-level integration test
```

`Home.test.jsx` and `pages.test.jsx` both already exist; Events page tests live in their own file `Events.test.jsx` for clarity (the existing `pages.test.jsx` only covers route-rendering smoke).

### 2.5 Files NOT created

- No `src/lib/index.js` barrel — direct imports only (matches existing `src/theme/` style which avoids barrel re-exports for React Refresh boundaries).
- No new test setup files; `src/test/setup.js` already imports `@testing-library/jest-dom`.
- No new vite/eslint config.

---

## 3. Data schema — `src/data/events.json`

**Initial contents**: `[]` (empty array, valid JSON, ships unblocked).

**Schema** (every entry, when added later, must conform):

```jsonc
{
  "id":          "string",         // required, stable, kebab-case (e.g. "ras-tour-la-2026")
  "title":       "string",         // required, free text, 1-120 chars typical
  "date":        "string",         // required, ISO 8601 with timezone, e.g. "2026-06-15T19:00:00-07:00"
  "location":    "string",         // required, "City, ST" or "Venue Name, City"
  "type":        "concert"
               | "fanmeet"
               | "con",            // required, enum, controls TypeBadge color
  "description": "string",         // required, 1-500 chars typical
  "links":       [                 // optional; default to empty array if absent
    { "label": "string", "url": "string" }
  ],
  "image":       "string"          // optional; absolute or /-prefixed asset URL; falls back to gradient
}
```

**Schema documentation lives ALSO** as a JSDoc-style comment block at the top of `src/components/EventCard/EventCard.jsx`:

```jsx
/**
 * @typedef {Object} EventLink
 * @property {string} label
 * @property {string} url
 *
 * @typedef {Object} EventEntry
 * @property {string} id
 * @property {string} title
 * @property {string} date     - ISO 8601 with timezone
 * @property {string} location
 * @property {'concert'|'fanmeet'|'con'} type
 * @property {string} description
 * @property {EventLink[]} [links]
 * @property {string} [image]  - URL; falls back to gradient placeholder
 *
 * Visual treatment + spacing: see docs/p2-design.md (single source of truth).
 * Schema details: see docs/p2-architecture.md §3.
 */
```

This satisfies task instruction #4 (JSDoc at top of `EventCard.jsx` referencing `docs/p2-design.md`).

**Schema validation**: NO runtime validator (no `zod`, no JSON schema lib). Reasoning: data is hand-curated by the user, ships in-tree, validated at PR-review time. A runtime validator adds dependency surface for zero new safety. Phase 4 (admin panel) will revisit when external write-paths exist.

**Date format hard rule**: every `date` MUST be ISO 8601 **with explicit timezone offset** (e.g. `-07:00`, `+09:00`, or `Z`). Bare `2026-06-15` is **not** acceptable — `new Date('2026-06-15')` parses as UTC midnight in some engines and local midnight in others. Tests assert this with `Number.isNaN(new Date(date).getTime()) === false` AND a regex check for the offset suffix.

---

## 4. Utility module — `src/lib/events.js`

All functions: pure, immutable input, return new arrays/objects (memory rule `principles.md` "Immutability — Create new objects, never mutate").

### 4.1 Exported function signatures

```js
// src/lib/events.js

/**
 * Parses an event's `date` field. Returns `null` for malformed input.
 * @param {string} dateStr - ISO 8601
 * @returns {Date|null}
 */
export function parseEventDate(dateStr) { /* ... */ }

/**
 * Splits events into upcoming + past relative to `now`.
 * Pure: input array NOT mutated. Each output array is a new array.
 * Events with malformed `date` are dropped (do NOT silently fall into either bucket).
 *
 * @param {EventEntry[]} events
 * @param {Date} [now=new Date()]
 * @returns {{ upcoming: EventEntry[], past: EventEntry[] }}
 */
export function groupEventsByTime(events, now = new Date()) { /* ... */ }

/**
 * Filters events. Returns a new array.
 *
 * filterState shape:
 *   { types: Set<'concert'|'fanmeet'|'con'> }
 *     - empty Set means "show all" (treat as no filter)
 *
 * @param {EventEntry[]} events
 * @param {{ types: Set<string> }} filterState
 * @returns {EventEntry[]}
 */
export function filterEvents(events, filterState) { /* ... */ }

/**
 * Returns a new sorted array (does not mutate input).
 * dir: 'asc' = chronological (earliest first), 'desc' = reverse (newest first).
 * Default: 'asc'.
 * Events with malformed `date` sort to the END regardless of dir (so the UI doesn't crash).
 *
 * @param {EventEntry[]} events
 * @param {'asc'|'desc'} [dir='asc']
 * @returns {EventEntry[]}
 */
export function sortEventsByDate(events, dir = 'asc') { /* ... */ }
```

### 4.2 Implementation notes (Developer reads, doesn't paste)

- `groupEventsByTime`: classify "upcoming" as `eventDate >= now` (events occurring exactly now count as upcoming). Boundary: a day-of-event display reads as upcoming all day even though the kickoff time has passed — accepted; the page is informational, not a calendar.
- `filterEvents`: if `filterState.types.size === 0`, return a shallow copy of `events` (still a new array — immutability rule). If non-empty, return entries whose `event.type` is in the Set.
- `sortEventsByDate`: use `[...events].sort(...)`; never call `.sort()` directly on the input.
- Reject mutation in tests: every utility test must include an assertion that the input array (and one input object inside it) is reference-equal before and after the call (`Object.isFrozen` not required — reference identity check suffices).

### 4.3 Why a separate module (vs. inline in `Events.jsx`)

- Pure functions trivially unit-testable; if logic stays inline in the page, every test routes through `<MemoryRouter>` + `<ThemeProvider>` for no reason.
- Phase 3 (Members) MAY reuse `sortEvents`-style logic — but we do NOT pre-generalize. If Phase 3 needs sort-by-date, it gets its own function. Memory rule: don't design for hypothetical future requirements.

---

## 5. Component contracts

### 5.1 `<TypeBadge type="concert" />`

**Purpose**: a small pill rendering the event type with a color cue per type.

**Props**:
- `type: 'concert' | 'fanmeet' | 'con'` — required.

**Output (DOM shape)**:
```jsx
<span
  className={`type-badge type-badge--${type}`}
  data-type={type}
>
  {labelFor(type)}
</span>
```

Where `labelFor`:
- `'concert'` → `'Concert'`
- `'fanmeet'` → `'Fan Meet'`
- `'con'` → `'Convention'`

**Edge case**: unknown `type` (defensive, e.g. malformed JSON later). Render `<span className="type-badge type-badge--unknown">{type}</span>` — show the raw value rather than crash. Test asserts this.

**Theming**: each modifier class (`type-badge--concert`, `--fanmeet`, `--con`) sets background/color from `var(--color-*)` tokens — exact mapping in `docs/p2-design.md`. Component file does NOT bake hex values.

### 5.2 `<EventCard event={...} now={...} />`

**Purpose**: render a single event as a card.

**Props**:
- `event: EventEntry` — required, conforms to schema in §3.
- `now?: Date` — optional, default `new Date()`. Lets tests inject a deterministic clock for "is past" styling. Pass-through from parent (the page provides one shared `now` so the entire list is internally consistent).

**Output (DOM shape, semantic)**:
```jsx
<article className={`event-card ${isPast ? 'event-card--past' : ''}`} aria-label={`${event.title}, ${formattedDate}`}>
  <div className="event-card__image" /* style backgroundImage if event.image, else gradient */ aria-hidden="true">
    {/* if no image: empty div fallback styled with var(--gradient-hero) */}
  </div>
  <div className="event-card__body">
    <div className="event-card__meta">
      <TypeBadge type={event.type} />
      <time className="event-card__date" dateTime={event.date}>{formattedDate}</time>
    </div>
    <h3 className="event-card__title">{event.title}</h3>
    <p className="event-card__location">{event.location}</p>
    <p className="event-card__description">{event.description}</p>
    {event.links?.length > 0 && (
      <ul className="event-card__links">
        {event.links.map(({ label, url }) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
          </li>
        ))}
      </ul>
    )}
  </div>
</article>
```

**Date formatting**:
- Absolute: `new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)`
- Optionally also a relative-time accent for upcoming events within 30 days: use `Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })`. Display rule: if event is upcoming AND within 30 days, show `"in 3 days"` style. Otherwise, omit the relative line.
- Both Intl APIs are spec-shipped in all evergreen browsers; no polyfill, no dep.
- Inside `<time dateTime={event.date}>` — always the raw ISO for screen readers; visible content is the formatted version.

**`isPast` logic**: `parseEventDate(event.date) < now`. If the date is malformed (`null`), treat as **not past** (renders as if upcoming with no relative-time accent). This keeps the card usable even with a bad date string while still flagging it visually as "today/upcoming-ish" — Architect's call: no special "broken date" state in v1; data integrity is enforced at PR review.

**Image fallback**: if `event.image` is falsy or empty string, the `event-card__image` div renders with `background: var(--gradient-hero)` (no `<img>` element). Avoids broken-image icon and fallback image fetch.

**Edge cases tested**:
- All required fields present → renders all parts
- `image` missing → gradient div appears, no `<img>`
- `image` empty string → gradient div appears, no `<img>`
- `links` missing OR empty array → no `<ul>` rendered
- `event.type` unknown → TypeBadge fallback path
- Past event → `event-card--past` class present
- Upcoming event within 30 days → relative line present
- Upcoming event > 30 days → relative line absent
- Very long description (e.g. 1000 chars) → renders without overflow crash
- Malformed `date` → no crash; `isPast=false` path

### 5.3 `<EventFilter filterState={...} onChange={...} sortDir={...} onSortChange={...} />`

**Purpose**: controlled UI for type filter chips + asc/desc sort toggle. Owns no state; page owns it.

**Props**:
- `filterState: { types: Set<string> }` — required.
- `onChange: (newFilterState) => void` — required.
- `sortDir: 'asc' | 'desc'` — required.
- `onSortChange: (newDir) => void` — required.

**DOM shape**:
```jsx
<div className="event-filter">
  <fieldset className="event-filter__types">
    <legend className="visually-hidden">Filter by type</legend>
    {/* one button per known type */}
    <button
      type="button"
      className={`event-filter__chip ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={toggleType('concert')}
    >Concerts</button>
    <button … >Fan Meets</button>
    <button … >Conventions</button>
  </fieldset>

  <fieldset className="event-filter__sort" role="radiogroup" aria-label="Sort by date">
    <legend className="visually-hidden">Sort order</legend>
    <label>
      <input type="radio" name="event-sort" value="asc" checked={sortDir === 'asc'} onChange={…} />
      <span>Earliest first</span>
    </label>
    <label>
      <input type="radio" name="event-sort" value="desc" checked={sortDir === 'desc'} onChange={…} />
      <span>Latest first</span>
    </label>
  </fieldset>
</div>
```

**`toggleType(type)` helper** (inline in component):
```js
const newTypes = new Set(filterState.types)  // immutability — new Set, never mutate the prop
if (newTypes.has(type)) newTypes.delete(type)
else newTypes.add(type)
onChange({ types: newTypes })
```

**Edge cases tested**:
- Click chip when not active → `onChange` called with new Set containing it
- Click chip when active → `onChange` called with new Set excluding it
- Click sort radio → `onSortChange` called with the new value
- Active chips have `aria-pressed="true"`; inactive `"false"`
- Sort radio `checked` matches `sortDir` prop
- Component does NOT mutate the input `Set` (assert reference identity preserved)

### 5.4 `<EventList events={...} now={...} />`

**Purpose**: split events into upcoming + past sections, render two `<section>` blocks each containing an `<ul>` of `<EventCard>` items.

**Props**:
- `events: EventEntry[]` — already-filtered, already-sorted by the page.
- `now?: Date` — same pass-through as EventCard.

**Logic**: calls `groupEventsByTime(events, now)` from `src/lib/events.js`. Renders:

```jsx
<div className="event-list">
  {upcoming.length > 0 && (
    <section className="event-list__group event-list__group--upcoming" aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading" className="event-list__heading">Upcoming</h2>
      <ul className="event-list__items">
        {upcoming.map(e => <li key={e.id}><EventCard event={e} now={now} /></li>)}
      </ul>
    </section>
  )}
  {past.length > 0 && (
    <section className="event-list__group event-list__group--past" aria-labelledby="past-heading">
      <h2 id="past-heading" className="event-list__heading">Past</h2>
      <ul className="event-list__items">
        {past.map(e => <li key={e.id}><EventCard event={e} now={now} /></li>)}
      </ul>
    </section>
  )}
  {upcoming.length === 0 && past.length === 0 && (
    <p
      className="event-list__empty"
      role="status"
      aria-live="polite"
    >
      No events match the current filter.
    </p>
  )}
</div>
```

**Empty state**: `aria-live="polite"` so screen readers announce when filter changes leave the list empty (per task instruction #7).

**Why sort BEFORE list, not inside list**: page is the controller (owns `sortDir`); list groups by time-bucket only. Within each bucket, items already arrive in the page's chosen order. `groupEventsByTime` preserves array order within each bucket (don't re-sort).

**Edge cases tested**:
- Empty events array → empty-state element with `aria-live="polite"`
- All upcoming → only Upcoming section rendered
- All past → only Past section rendered
- Single event upcoming → one section, one item
- Single event past → one section, one item
- Mixed → both sections, correct grouping
- Events with malformed dates → dropped (not rendered in either section); confirms `groupEventsByTime` filters them out

### 5.5 Updated `<Events />` page

**State held by page**:
```js
const [filterState, setFilterState] = useState({ types: new Set() })
const [sortDir, setSortDir]         = useState('asc')
const now = useMemo(() => new Date(), [])  // stable across re-renders within same page mount
```

**Page render shape**:
```jsx
<main className="section">
  <div className="section-inner">
    <h1 className="section-title">Events</h1>
    <p className="section-subtitle">Concerts, fan meets, and conventions across North America.</p>

    <EventFilter
      filterState={filterState}
      onChange={setFilterState}
      sortDir={sortDir}
      onSortChange={setSortDir}
    />

    <EventList
      events={sortEventsByDate(filterEvents(events, filterState), sortDir)}
      now={now}
    />
  </div>
</main>
```

`events` is imported from `src/data/events.json` at the top of the file. Vite resolves JSON imports natively — no loader config required (already used by Phase 1's `site.json`).

**Why `useMemo` on `now`**: avoids `now` being re-instantiated on every render, which would re-trigger child memoization downstream and (more importantly) cause flickering relative-time strings if a user holds the page open across a minute boundary. We accept that opening the page at 11:59 PM and a click at 12:01 AM still uses the stale `now`; the page is informational, not a live clock.

**Why no React Query / SWR / fetch**: events ship in-tree as JSON. No network, no async, no loading state, no error state. Phase 4 (admin) may add a fetch layer — out of scope.

**Why no URL-state sync (`?type=concert&sort=asc`)**: not in plan; deferred. Page-local React state is sufficient for v1.

---

## 6. Routing

**No change**. From `src/App.jsx` (existing):

```jsx
<Route path="/events" element={<Events />} />
```

Same import path `./pages/Events.jsx` — Phase 2 only edits the file at that path; the import line in `App.jsx` is untouched.

---

## 7. Testing strategy

### 7.1 Test layout (co-located, matches Phase 1)

```
src/lib/events.test.js                                       — pure utility unit tests
src/components/TypeBadge/TypeBadge.test.jsx                  — badge variants + unknown
src/components/EventCard/EventCard.test.jsx                  — full render matrix
src/components/EventFilter/EventFilter.test.jsx              — interaction tests (user-event)
src/components/EventList/EventList.test.jsx                  — grouping + empty state
src/pages/Events.test.jsx                                    — page integration
```

### 7.2 Coverage gate

Global `vite.config.js` already enforces 80% across the project. Phase 2 must additionally pass per-file 80% on:

- `src/lib/events.js`
- `src/components/EventCard/EventCard.jsx`

Reviewer verifies via `npm run test:coverage` and inspects `coverage/coverage-summary.json` for those two paths. If global passes but either of these is < 80%, Reviewer rejects.

### 7.3 Test framework re-use (no new deps)

Confirmed against `package.json` (already in tree from Phase 1):
- `vitest`, `@vitest/coverage-v8` — present
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — present
- `jsdom` — present

**Yes**, `@testing-library/user-event` 14.x is required for the EventFilter chip click + sort radio change tests. Already in `devDependencies` from Phase 1; no install needed. Use `userEvent.setup()` in each test file (per RTL 14.x guidance).

### 7.4 Fixtures

Each test file declares its fixtures inline (memory rule: don't pre-generalize a `fixtures/` directory until 3+ files share data). Suggested skeleton:

```js
const FIXED_NOW = new Date('2026-06-01T12:00:00-07:00')

const sampleConcert = {
  id: 'roselia-tour-la',
  title: 'Roselia Tour 2026 LA',
  date: '2026-07-15T19:00:00-07:00',
  location: 'The Wiltern, Los Angeles, CA',
  type: 'concert',
  description: 'Roselia North America tour finale.',
  links: [{ label: 'Tickets', url: 'https://example.com/tickets' }],
  image: 'https://example.com/roselia.jpg',
}

const sampleFanmeet = { … type: 'fanmeet', date: '2026-05-01T…' (PAST relative to FIXED_NOW) … }
const sampleCon     = { … type: 'con', … }
```

### 7.5 Edge tests (mandatory per `feedback_edge_testing_soul.md`)

Every test file MUST include the following edges. This is the contract the Reviewer audits:

**`events.test.js`**:
- empty array input → `groupEventsByTime` returns `{ upcoming: [], past: [] }`; `filterEvents` returns `[]`; `sortEventsByDate` returns `[]`
- single event in array
- all events upcoming
- all events past
- filter producing zero matches
- filter with empty Set → returns full set (not zero)
- malformed date string (`'not-a-date'`, `''`, `null`, `undefined`) → utility returns `null` from `parseEventDate`; `groupEventsByTime` drops these; `sortEventsByDate` puts these last
- input array reference not mutated by any function
- input objects within array not mutated

**`TypeBadge.test.jsx`**:
- each known type renders correct label
- unknown type renders raw value, no crash
- modifier class matches type

**`EventCard.test.jsx`**:
- all fields present → all sub-elements render
- missing image → gradient fallback, no `<img>` element queryable
- empty image string → same fallback
- past event → `event-card--past` class present, no relative-time line
- upcoming within 30 days → relative-time line present
- upcoming > 30 days → relative-time line absent
- malformed date → does not throw; renders without crash
- empty `links` array → no `<ul>` rendered
- missing `links` → no `<ul>` rendered
- very long description (1000 chars) → renders, no error
- `<time>` element has `dateTime={event.date}` attribute

**`EventFilter.test.jsx`**:
- chip toggle ON: starts inactive, click → `onChange` called with Set containing the type
- chip toggle OFF: starts active, click → `onChange` called with Set without the type
- sort radio change: click 'desc' → `onSortChange('desc')` called
- aria-pressed reflects active state
- input Set NOT mutated (reference equality on `filterState.types` before/after)
- keyboard interaction: tab to chip + Enter → `onChange` fires

**`EventList.test.jsx`**:
- empty array → empty-state `<p role="status" aria-live="polite">` with "No events match" copy
- all upcoming → only Upcoming section, headed correctly
- all past → only Past section
- mixed → both sections
- single event upcoming → exactly one item, in upcoming section
- malformed-date events not rendered (dropped by `groupEventsByTime`)
- correct event count per section

**`Events.test.jsx`** (page-level integration):
- page renders filter + list (presence assertions)
- empty `events.json` (test imports a stub or mocks the JSON import) → empty state visible
- click chip → list narrows (smoke check via fixture-stubbed data)
- change sort → order in DOM matches new direction
- chip toggling correctly updates `aria-pressed`
- if events.json ships as `[]` (production path), page mounts cleanly with empty state — assert this with the **real** import (no mock)

### 7.6 Mocking the JSON import for the page test

Vitest `vi.mock` of the JSON path:

```js
vi.mock('../data/events.json', () => ({
  default: [/* fixtures */],
}))
```

…in tests that need non-empty data. The "production path" test imports the real (empty-array) file. Two test files would be cleanest, but a single file with a mocked + unmocked split using `vi.doMock` + dynamic import is acceptable. Developer's choice; either approach satisfies the contract.

### 7.7 What we do NOT test in Phase 2

- CSS values (no computed-style assertions on color tokens). The Phase 1 ThemeContext tests already cover that `var(--color-*)` is set on `:root`. Components only use `var(...)`, so theme correctness is transitive.
- Visual regression (no Playwright, no Percy). Reviewer verifies on-device per CLAUDE.md.
- Network behavior (no network).
- `Intl.DateTimeFormat` output exact string (locale-dependent). Tests assert presence of a `<time>` element with the right `dateTime` attribute, NOT the formatted text content. Snapshot would lock to a CI locale; we don't.

---

## 8. Accessibility checklist (binding for Reviewer)

Per task instruction #7:

- **EventCard**:
  - `<h3>` for the event title (heading hierarchy: page `<h1>` → list `<h2>` → card `<h3>`)
  - `<time dateTime={event.date}>` for the date (machine-readable + screen-reader friendly)
  - External links are real `<a>` elements with `target="_blank"` AND `rel="noopener noreferrer"` (memory + Phase 1 pattern from DiscordCTA)
  - Image fallback div is `aria-hidden="true"` (decorative)
  - Card has `aria-label` combining title + formatted date so screen readers get a one-line summary
- **EventFilter**:
  - Type chips wrapped in `<fieldset>` + visually-hidden `<legend>` "Filter by type"
  - Each chip is a `<button type="button">` with `aria-pressed={active}`
  - Sort wrapped in `<fieldset role="radiogroup" aria-label="Sort by date">` with `<input type="radio">` + visible `<label>`
- **EventList**:
  - Each group section is `<section aria-labelledby="...">` linking to its `<h2>`
  - Items wrapped in `<ul>`/`<li>` (semantic list)
  - Empty state is `<p role="status" aria-live="polite">` so filter-zero is announced
- **Focus**: no custom outline overrides — Phase 1 global focus ring (`outline: 2px solid var(--color-primary)`) applies. Designer confirms in `p2-design.md`.
- **Reduced motion**: any hover scale on cards must be wrapped in `@media (prefers-reduced-motion: no-preference)` (or short-circuited with `@media (prefers-reduced-motion: reduce)`). Designer specifies; Architect's contract: respect it.

A `.visually-hidden` class for legends — if not already in `index.css` (Phase 1), Developer adds the standard pattern:
```css
.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```

Add to `src/index.css` (single file change in shared CSS, not duplicated per component).

---

## 9. Date formatting & i18n

Per task instruction #8:

- **Absolute date**: `new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })`. `undefined` locale → user's browser locale. No deps.
- **Relative date**: `new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })`. Convert `(eventDate - now)` to the largest unit ≥ 1 (days for ≤ 30 days, drop relative line for further out).
- Format helper lives **inside `EventCard.jsx`** (not exported from `events.js`) — UI concern, not data concern. If Phase 3 needs the same formatter, refactor at that point.
- Both APIs are universally available in evergreen browsers (Chrome ≥ 71, Safari ≥ 14, Firefox ≥ 65) and in Node 20+ (jsdom test env relies on Node's Intl).

**Test impact**: tests assert `<time>` `dateTime` attribute (raw ISO) and presence of relative line, NOT the exact rendered string. CI locale could be anything.

---

## 10. CSS architecture

Same conventions as Phase 1:

- One `.css` file per component, co-located, imported at the top of the `.jsx`.
- Theme tokens via `var(--color-*)` and `var(--gradient-hero)` only — never literal hex.
- BEM-ish modifier classes (`event-card--past`, `type-badge--concert`).
- No CSS modules, no styled-components, no Tailwind — matches Phase 1.
- New `.visually-hidden` utility lands in `src/index.css` (single source).

Exact CSS values (paddings, sizes, breakpoints, gradients, type colors) come from `docs/p2-design.md` — Architect does NOT prescribe them.

---

## 11. Open questions for Developer

These are decisions Architect made by reasoned default. Developer adopts unless Reviewer flags otherwise:

1. **Do we need `@testing-library/user-event` for filter chips?** **Yes** — already in `devDependencies` from Phase 1 (verified `package.json:24`), no install. Use `userEvent.setup()` per test file (RTL 14.x guidance), not the deprecated direct `userEvent.click`.

2. **Empty events array in production**: ships as `[]`. The page mounts cleanly and shows the empty state. **Recommended copy**: `"No events match the current filter."` This works for both "no data at all" (no filter applied, but list is empty) and "filter narrowed to zero". The string is identical in both cases — no need to branch. Designer may refine wording in `p2-design.md`; Developer follows.

3. **Relative-time horizon**: 30 days. Beyond 30 days, suppress relative line entirely. Reasoning: "in 4 months" is less useful than the absolute date for far-future events; close-in events benefit from the urgency cue. Adjustable post-launch if user feedback differs.

4. **Sort default**: `'asc'` (earliest first). Matches event-calendar UX expectation. Reviewer can flip if they prefer.

5. **Type ordering in chip group**: `concert`, `fanmeet`, `con` (mirrors typical fan event prioritization — main shows first, smaller meets, then conventions). Designer may reorder; Developer follows `p2-design.md`.

6. **Image asset hosting for actual events (post-Phase 2)**: out of scope. Schema accepts a string URL; whether that points at a local `/public/events/foo.jpg` or external CDN is data-author's choice. No image processing pipeline.

7. **Accessibility audit tooling**: none added to Phase 2 (no `axe-core` test runner). Reviewer does manual screen reader pass per `feedback_team_lead_self_verify_not_reviewer.md`.

8. **Commit granularity** (suggested):
   - `feat(events): add events.js utilities and tests`
   - `feat(events): add TypeBadge component`
   - `feat(events): add EventCard component`
   - `feat(events): add EventFilter component`
   - `feat(events): add EventList component`
   - `feat(events): wire Events page with filter + sort + list`
   - `chore(events): seed empty events.json`
   - `feat(a11y): add .visually-hidden utility`

9. **`.visually-hidden` placement**: `src/index.css`, additive (one CSS rule, ~7 lines). NOT a new component; NOT a new CSS module.

10. **Iteration Contract (memory `feedback_iteration_contract_needs_explicit_ack.md`)**: P2 Designer (task #1) + P2 Architect (this doc) must both land before Developer begins. Developer dispatch is gated on team-lead's explicit "approved" SendMessage, not on an implicit timeout.

---

## 12. Reviewer acceptance checklist

For task #4. Reviewer runs locally and checks each item:

```bash
npm run lint
npm run test:coverage
npm run build
npm run preview   # smoke at http://localhost:4173/events
```

- [ ] `/events` route renders without console errors at default state (empty `events.json`)
- [ ] Empty-state element is present, `role="status"`, `aria-live="polite"`
- [ ] After temporarily seeding `events.json` with ≥ 3 mixed-type entries (one past, two upcoming), Reviewer confirms:
  - [ ] Upcoming + Past sections both render with proper `<h2>` headings
  - [ ] Past events have `event-card--past` styling (visually distinct per `p2-design.md`)
  - [ ] TypeBadge shows correct label + color per type
  - [ ] Date renders via `<time dateTime="..." >` with localized text
  - [ ] Relative-time accent appears for ≤30-day-out events; absent otherwise
  - [ ] Image fallback gradient appears when entry omits `image`
  - [ ] External links render with `target="_blank"` and `rel="noopener noreferrer"`
- [ ] Filter chips toggle correctly; `aria-pressed` reflects state
- [ ] Sort radio change reorders the visible list
- [ ] Filter producing zero matches shows the empty state with `aria-live` announcement
- [ ] Mobile (<768px) layout: filter chips wrap, list stacks single column
- [ ] All theme switches recolor TypeBadge + card without hex pinning anywhere in computed style
- [ ] Coverage report shows ≥ 80% on `src/lib/events.js` AND `src/components/EventCard/**`
- [ ] Global coverage gate (80% lines/functions/branches/statements) passes
- [ ] Lint passes
- [ ] Build passes
- [ ] **Restore `events.json` to `[]` before Reviewer commits / opens PR** — seed data was for verification only.
- [ ] Page test (`Events.test.jsx`) covers both the real-empty path and the mocked-non-empty path
- [ ] No new dependencies added to `package.json` (Phase 2 should add zero deps)
- [ ] Phase 1 tests still pass (no regression in theme, Discord, Home, Members placeholder)

---

## 13. Cross-references

- **Plan**: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md` (Phase 2 outline at end of file)
- **Phase 1 architecture (inherited)**: `docs/architecture.md`
- **Phase 1 design**: `docs/design.md` (typography, theme tokens, visually-hidden conventions)
- **Phase 2 design (sibling deliverable)**: `docs/p2-design.md` — visual values, exact CSS, layout. Read together with this file.
- **CLAUDE.md Hard Rules** (binding):
  - 5-agent pipeline; Reviewer separate dispatch
  - 80% coverage minimum; edge tests mandatory
  - Conventional commits; no `Co-Authored-By`; `.claude/` never pushed
  - Push to GitHub after each commit; PR opened, NEVER auto-merged to default branch
- **Memory rules (load-bearing)**:
  - `principles.md` — Immutability (every utility returns new array/object)
  - `feedback_edge_testing_soul.md` — edge tests non-negotiable
  - `feedback_normalize_inside_helper.md` — `renderWithProviders` already exists; reuse, don't duplicate wrapper logic in tests
  - `feedback_no_smart_quotes.md` — ASCII quotes only in source (TS/JSX)
  - `feedback_never_autonomous_merge_to_default_branch.md` — PR + user approval before merge
  - `feedback_iteration_contract_needs_explicit_ack.md` — explicit SendMessage handoff to Developer

---

**Architect status**: complete. Developer (task #3) is unblocked once P2 Designer (task #1) commits final visual values to `docs/p2-design.md` AND team-lead explicitly approves both deliverables.
