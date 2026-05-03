# `bangdream-na` Phase 3 — Architecture Specification (Members)

**Status**: APPROVED for Developer dispatch (Architect deliverable for task #6 in team `bangdream-na-phase23`).

**Scope**: Members roster page (`/members`). Replace the Phase 1 placeholder with a real, filterable, searchable roster backed by a JSON data file. Phase 1 stack/conventions are reused verbatim — Members is purely additive.

**What does NOT change**: `package.json`, `vite.config.js`, `eslint.config.js`, `vercel.json`, `.gitignore`, `index.html`, `src/main.jsx`, `src/App.jsx`'s route table, `src/theme/**`, all Phase 1 components in `src/components/{Navbar,Footer,Hero,DiscordCTA,ThemeSwitcher,ComingSoonCard}/`. If a Developer thinks they need to touch any of these, that's a signal to stop and re-check.

**What changes**: `src/pages/Members.jsx` is replaced; `src/pages/pages.test.jsx` is updated (the placeholder assertion `expect(screen.getAllByRole('article').length).toBeGreaterThan(0)` no longer holds — `<article>` was the role on `<ComingSoonCard>`, and the new Members page does not render those). New files added under `src/components/MemberCard/`, `src/components/MemberGrid/`, `src/components/MemberFilter/`, `src/components/RoleBadge/`, `src/lib/`, `src/data/members.json`. Optional: `src/pages/Members.css` for page-level layout (small).

---

## 1. Final directory delta

```
src/
├── components/
│   ├── MemberCard/                         # new
│   │   ├── MemberCard.jsx
│   │   ├── MemberCard.css
│   │   └── MemberCard.test.jsx
│   ├── MemberGrid/                         # new
│   │   ├── MemberGrid.jsx
│   │   ├── MemberGrid.css
│   │   └── MemberGrid.test.jsx
│   ├── MemberFilter/                       # new
│   │   ├── MemberFilter.jsx
│   │   ├── MemberFilter.css
│   │   └── MemberFilter.test.jsx
│   └── RoleBadge/                          # new — separate, mirrors P2 TypeBadge if it ships
│       ├── RoleBadge.jsx
│       ├── RoleBadge.css
│       └── RoleBadge.test.jsx
├── data/
│   └── members.json                        # new — starts as []
├── lib/                                    # new dir
│   ├── members.js                          # filterMembers, sortMembersByName, getInitials
│   └── members.test.js
├── pages/
│   ├── Members.jsx                         # REPLACED — real implementation
│   ├── Members.css                         # new (optional; small page-level layout)
│   ├── Members.test.jsx                    # new — page-level integration test
│   └── pages.test.jsx                      # UPDATED — Members assertion changes (see §11)
```

**No** `src/components/RoleBadge/RoleBadge.jsx` is absorbed into MemberCard. Decision: **keep RoleBadge separate** (open issue #2 in task description). Reasoning: (a) it has its own visual variants per role (organizer / member / alumnus / cover-band-lead — Designer finalizes), (b) Phase 2 ships a `TypeBadge` for events using the same chip pattern; symmetry across phases makes Phase 4 admin work easier, (c) tests are simpler when the badge is a unit. Cost is one extra component file — negligible.

**Why `src/lib/`** rather than co-locating helpers in MemberCard: pure functions live next to their nearest sibling test file, but they're shared by Members.jsx + MemberFilter + MemberGrid. A page-level component owning a helper that another page-level component imports creates a circular ownership smell. `src/lib/` is the natural home for pure utilities; Phase 2 will likely add `src/lib/events.js` for the same reason. Coverage gate applies to `src/lib/**` (Vite config already includes `src/**/*.{js,jsx}`).

---

## 2. Data schema — `src/data/members.json`

**Initial contents**: `[]` (empty array — page must render empty-state without crashing).

**Schema** (single member object — every field listed; `?` marks optional):

```jsonc
{
  "id": "string",                    // stable unique key, e.g. "kanade-2024" or a uuid; required
  "name": "string",                  // display name; required; can be CJK or single-name
  "role": "organizer" | "member" | "alumnus" | "cover-band-lead",
                                     // required; restricted to this enum
  "oshiBand": "string?",             // theme key (one of themes.js keys) OR a free band name string
                                     // Recommendation: free-string; do not couple to theme keys
  "oshiCharacter": "string?",        // e.g. "Kasumi Toyama"
  "coverBand": "string?",            // if member is in a cover band, name of band; e.g. "After Sunset"
  "coverBandRole": "string?",        // e.g. "Vocal", "Guitar"
  "city": "string?",                 // e.g. "Los Angeles, CA"
  "bio": "string?",                  // 1-3 sentences; long bios are tested
  "avatar": "string?",               // public URL or relative `/avatars/foo.jpg`; component handles missing
  "socials": {                       // optional map; missing object treated as no socials
    "twitter": "string?",            // handle WITHOUT '@'
    "bilibili": "string?",           // user id or url tail
    "instagram": "string?",
    "discord": "string?"             // username (Discord user tag), display only — not a link
  },
  "joinedAt": "string?",             // ISO date "YYYY-MM-DD"; not displayed unless Designer adds it
  "alumnus": "boolean?"              // optional — true if member has stepped away.
                                     // Independent of role:"alumnus" so a former-organizer can be tagged.
                                     // If role === "alumnus" then alumnus IS implicitly true.
}
```

**Schema documented in JSDoc at the top of `MemberCard.jsx`** (per task description):

```jsx
/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} name
 * @property {'organizer'|'member'|'alumnus'|'cover-band-lead'} role
 * @property {string} [oshiBand]
 * @property {string} [oshiCharacter]
 * @property {string} [coverBand]
 * @property {string} [coverBandRole]
 * @property {string} [city]
 * @property {string} [bio]
 * @property {string} [avatar]
 * @property {Object<string,string>} [socials]
 * @property {string} [joinedAt]
 * @property {boolean} [alumnus]
 *
 * Schema reference: docs/p3-design.md §"Member data shape".
 */
```

The reference to `docs/p3-design.md` resolves once Designer's deliverable lands. If the design doc is unmerged at Developer-dispatch time, Developer adds the JSDoc anyway and the link becomes valid post-merge — no rebase coupling.

**Validation**: no runtime schema validator (zod, ajv) for Phase 3. Members data is curated by hand by the user via Phase 4's admin (deferred). The components must be **defensive** — every field except `id`, `name`, `role` may be missing or empty, and the UI must render gracefully. This is enforced by edge tests, not by a runtime guard.

---

## 3. Utility module — `src/lib/members.js`

All pure, no mutation (memory `principles.md` immutability rule). No external dependencies. ESM exports.

### 3.1 `filterMembers(members, filters)`

```jsx
/**
 * @param {Member[]} members
 * @param {{ bands?: string[], role?: string|null, search?: string }} filters
 * @returns {Member[]} new array; input never mutated
 *
 * - `bands`: array of oshiBand strings; empty array OR undefined → no band filter applied
 *   Match: case-insensitive equality on member.oshiBand. Members with no oshiBand
 *   are EXCLUDED when bands is non-empty (this is the user-friendly default — the
 *   chip says "show me Roselia oshis" and an unset member should not surface).
 * - `role`: single role string; null/undefined/'' → no role filter applied
 *   Match: exact (case-sensitive) on member.role.
 * - `search`: free-text search; null/undefined/'' → no search filter applied
 *   Match: case-insensitive substring against name + city + bio + oshiCharacter
 *          + coverBand. Whitespace trimmed. CJK substring matching is what the
 *          built-in String.includes already does (it works on UTF-16 code units),
 *          so no extra normalization needed for Phase 3. Diacritic folding is NOT
 *          applied (open issue §13.4).
 */
```

Implementation pattern (Developer reference, NOT to be copied verbatim — they own the implementation):

```js
export function filterMembers(members, { bands = [], role = null, search = '' } = {}) {
  const bandSet = new Set((bands ?? []).map(b => b.toLowerCase()))
  const q = (search ?? '').trim().toLowerCase()
  const roleKey = role || null
  return members.filter(m => {
    if (bandSet.size > 0) {
      if (!m.oshiBand || !bandSet.has(m.oshiBand.toLowerCase())) return false
    }
    if (roleKey && m.role !== roleKey) return false
    if (q) {
      const hay = [m.name, m.city, m.bio, m.oshiCharacter, m.coverBand]
        .filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
```

**Memory rule `feedback_normalize_inside_helper.md`** applies — all callers may pass `null`, `undefined`, or an empty string for any filter; the helper normalizes internally. Test cases below assert this.

### 3.2 `sortMembersByName(members)`

```jsx
/**
 * @param {Member[]} members
 * @returns {Member[]} new array, sorted by `name` ascending using
 *   `localeCompare(undefined, { sensitivity: 'base' })` so:
 *     - case-insensitive
 *     - accent-insensitive
 *     - CJK ordering follows host locale (browser-dependent but stable for a
 *       given user — acceptable for this use case)
 *   Original array is NOT mutated.
 */
```

Reference:

```js
export function sortMembersByName(members) {
  return [...members].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
}
```

`[...members]` clones first so `.sort()` (which mutates) operates on the copy. Memory rule `principles.md` "Immutability — Create new objects, never mutate."

### 3.3 `getInitials(name)`

```jsx
/**
 * @param {string} name
 * @returns {string} 1 or 2 characters, uppercased.
 *   - Multi-word ASCII: first letter of first two words → "John Smith" → "JS"
 *   - Single ASCII word: first letter only → "Madonna" → "M"
 *   - CJK: first character (CJK is logographic; one char = one initial),
 *     and if there's a recognizable space-separated second token, append its
 *     first char too → "宇治川 七海" → "宇七"; "燈" → "燈"
 *   - Empty/whitespace string → "" (caller renders fallback)
 *   - Tokens are split on Unicode whitespace; punctuation is NOT a separator.
 */
```

Reference:

```js
export function getInitials(name) {
  if (!name || typeof name !== 'string') return ''
  const trimmed = name.trim()
  if (!trimmed) return ''
  const tokens = trimmed.split(/\s+/u).filter(Boolean)
  const isCJKLeading = /^[　-鿿가-힯]/.test(tokens[0])
  if (tokens.length === 1) {
    return isCJKLeading
      ? tokens[0][0]                           // single CJK char
      : tokens[0][0].toUpperCase()             // single ASCII initial
  }
  const a = tokens[0][0]
  const b = tokens[1][0]
  return isCJKLeading ? `${a}${b}` : `${a}${b}`.toUpperCase()
}
```

The Unicode range `[　-鿿]` covers CJK Symbols + CJK Unified Ideographs (the most common Japanese/Chinese characters). Hangul `[가-힯]` covered for completeness; hiragana/katakana fall in the CJK range. Edge cases tested: empty string, single ASCII, single CJK, multi-word ASCII, multi-word CJK, mixed.

### 3.4 Tests for `members.js`

`src/lib/members.test.js` covers:

| # | Function | Case | Expected |
|---|---|---|---|
| 1 | `filterMembers` | `[]` input, no filters | `[]` |
| 2 | `filterMembers` | non-empty input, no filters | identity (deep equal, but new array reference) |
| 3 | `filterMembers` | bands=`['roselia']` | only members with `oshiBand: 'roselia'` (case-insensitive) |
| 4 | `filterMembers` | bands=`['Roselia']` (capitalized) | matches `'roselia'` member (case-insensitive) |
| 5 | `filterMembers` | bands=`[]` | identity (empty bands = no filter) |
| 6 | `filterMembers` | bands=`['x']` and one member has `oshiBand: undefined` | undefined-band member excluded |
| 7 | `filterMembers` | role=`'organizer'` | only organizers |
| 8 | `filterMembers` | role=`null` | identity |
| 9 | `filterMembers` | role=`''` | identity (empty string treated as null) |
| 10 | `filterMembers` | search=`'kanade'` against bio="Kanade-loving fan" | matches (case-insensitive) |
| 11 | `filterMembers` | search=`'  kanade  '` (whitespace) | matches (trimmed) |
| 12 | `filterMembers` | search=`'香澄'` (CJK) against name=`'戸山香澄'` | matches |
| 13 | `filterMembers` | combined: bands+role+search, all match one | correct intersection |
| 14 | `filterMembers` | combined: filters with no overlap | `[]` |
| 15 | `filterMembers` | does NOT mutate input | `JSON.stringify(input)` unchanged after call |
| 16 | `sortMembersByName` | `[]` | `[]` |
| 17 | `sortMembersByName` | single member | identity |
| 18 | `sortMembersByName` | mixed-case `['bob', 'Alice']` | `['Alice', 'bob']` (case-insensitive) |
| 19 | `sortMembersByName` | accents `['é', 'a', 'b']` | `['a', 'b', 'é']` (accent-insensitive — `é` ≈ `e` after `b`? — actual order is locale-dependent; assert relative stability not absolute) |
| 20 | `sortMembersByName` | CJK names alongside ASCII | does not throw; returns full array |
| 21 | `sortMembersByName` | does NOT mutate input | input array reference order preserved |
| 22 | `getInitials` | `''` | `''` |
| 23 | `getInitials` | `'   '` (whitespace only) | `''` |
| 24 | `getInitials` | `'Madonna'` | `'M'` |
| 25 | `getInitials` | `'John Smith'` | `'JS'` |
| 26 | `getInitials` | `'john smith'` | `'JS'` (uppercase) |
| 27 | `getInitials` | `'戸山香澄'` (single CJK token) | `'戸'` |
| 28 | `getInitials` | `'戸山 香澄'` (two CJK tokens) | `'戸香'` |
| 29 | `getInitials` | `'Sakuya 朔夜'` (mixed) | `'S朔'` |
| 30 | `getInitials` | non-string input (e.g. `null`, `undefined`, `123`) | `''` (no throw) |

**Coverage target on `src/lib/members.js`**: lines/branches/functions all 100%; the file is small (≤ 60 lines) and pure, so every branch is reachable in tests. The vite.config 80% threshold is the floor; 100% is achievable cheaply here.

---

## 4. `<MemberCard />` — `src/components/MemberCard/`

Visual + content spec lives in `docs/p3-design.md` (Designer). Architect contract for this component:

### 4.1 Props

```jsx
/**
 * @param {Member} member — required; rendering on missing member is undefined behavior (caller's bug)
 * @returns ReactElement
 */
function MemberCard({ member }) { ... }
```

No other props. The card does NOT take a click handler in Phase 3 (cards are non-interactive — they don't link anywhere). If Phase 4 adds a member detail page, `onClick` or wrapping `<Link>` lands then.

### 4.2 DOM contract

The Reviewer + tests assert this DOM structure exists (exact tags / class names may shift; roles + accessible names MUST hold):

```
<article class="member-card" aria-label="{member.name}">
  <div class="member-card-avatar">
    {member.avatar
      ? <img src={member.avatar} alt={member.name} loading="lazy" onError={fallbackToInitials}/>
      : <div class="member-card-initials" aria-hidden="true">{getInitials(member.name)}</div>}
  </div>
  <div class="member-card-body">
    <h3 class="member-card-name">{member.name}</h3>
    <div class="member-card-meta">
      <RoleBadge role={member.role} alumnus={member.alumnus}/>
      {member.city && <span class="member-card-city">{member.city}</span>}
    </div>
    {member.oshiBand && (
      <div class="member-card-oshi">
        <span class="member-card-oshi-label">Oshi</span>
        <span class="member-card-oshi-value">
          {member.oshiBand}{member.oshiCharacter && ` · ${member.oshiCharacter}`}
        </span>
      </div>
    )}
    {member.coverBand && (
      <div class="member-card-cover-ribbon" aria-label={`Cover band: ${member.coverBand}`}>
        <span class="member-card-cover-band">{member.coverBand}</span>
        {member.coverBandRole && (
          <span class="member-card-cover-role">{member.coverBandRole}</span>
        )}
      </div>
    )}
    {member.bio && <p class="member-card-bio">{member.bio}</p>}
    {member.socials && Object.keys(member.socials).length > 0 && (
      <ul class="member-card-socials" aria-label="Social links">
        {/* one <li> per non-empty social key — see §4.3 */}
      </ul>
    )}
  </div>
</article>
```

### 4.3 Socials rendering

For each non-empty entry in `member.socials`:

| Key | Rendered as | href format |
|---|---|---|
| `twitter` | `@{handle}` | `https://twitter.com/{handle}` |
| `bilibili` | `bilibili` text + handle | `https://space.bilibili.com/{handle}` |
| `instagram` | `@{handle}` | `https://instagram.com/{handle}` |
| `discord` | `{username}` | NO link — display-only span (Discord usernames don't have stable URLs) |

All `<a>` tags: `target="_blank"`, `rel="noopener noreferrer"`. Text-only Discord uses a `<span>` with title="Discord username".

Empty-string values (e.g. `socials: { twitter: "" }`) → that entry is **not rendered**. Test: a member with `socials: { twitter: "", bilibili: "abc" }` shows only the bilibili link.

### 4.4 Cover band ribbon

Open issue from task description (#1): "should it link anywhere?" — **Recommendation: NO**. Rationale:

- Phase 3 has no per-band detail page.
- A cover band ribbon that links to nothing is worse than a static badge.
- If Phase 5 ever adds cover-band detail pages, swap the `<div>` for `<Link>` then; the visual treatment doesn't change.

Visual is purely a marker — Designer specifies whether it's a top-corner ribbon, a footer chip, or an inline tag. Architect does not constrain.

### 4.5 Avatar fallback

If `member.avatar` is empty/missing → render `<div class="member-card-initials">{getInitials(name)}</div>` instead of `<img>`. This is decided **at render time**, not via runtime image-load failure. The `onError` handler shown above is a **second-line defense** for the case where `avatar` is set but the URL 404s; it swaps to initials lazily.

Test approach for `onError`: render with `avatar="bad-url.jpg"`, fire `error` event on the `<img>` element, assert `<div class="member-card-initials">` is now in the DOM and `<img>` is gone.

If both `name` is empty AND avatar is missing — render `<div class="member-card-initials" aria-hidden="true"></div>` (empty content). Page-level filter prevents nameless members from being passed (test asserts), but the component itself does not throw.

### 4.6 Accessibility

- `<article>` is the semantic wrapper (replaces ComingSoonCard's `<div role="article">` — using the real `<article>` element is preferred).
- `aria-label="{member.name}"` on the article so screen-reader users hear the name when the article gets focus.
- `<h3>` for member name (page H1 is "Members"; H2s are filter section headings; cards live at H3).
- Image `alt={member.name}` (avatar IS the visual representation of the person; `alt=""` would be wrong — sighted users see the face, screen-reader users get the name).
- Initials fallback marked `aria-hidden="true"` because the `<h3>` already announces the name; double-announcing is noise.
- Social links: `aria-label="{platform} for {member.name}"` so multiple cards' social lists don't say "Twitter Twitter Twitter" in a row.

### 4.7 Tests for `MemberCard.test.jsx`

| # | Case | Edge |
|---|---|---|
| 1 | All fields present | full render |
| 2 | Only required fields (`id`, `name`, `role`) | no oshi block, no city, no bio, no socials, no cover ribbon — initials shown |
| 3 | `avatar` set, valid URL | `<img>` rendered with `alt=name` |
| 4 | `avatar` set, fires `error` event | swaps to initials |
| 5 | `avatar` empty string | initials shown immediately (no `<img>`) |
| 6 | `bio` very long (500+ chars) | renders without truncation; CSS handles overflow (test asserts presence, not visual) |
| 7 | `name` single word "Madonna" | initials = "M" |
| 8 | `name` CJK "戸山香澄" | initials = "戸" |
| 9 | `name` very long (60 chars) | renders; no overflow throw |
| 10 | `socials` with all 4 platforms | 4 list items; correct hrefs; Discord is a span not an anchor |
| 11 | `socials` with empty-string values mixed in | empty values skipped |
| 12 | `socials` is `undefined` | no `<ul>` rendered |
| 13 | `socials` is empty object `{}` | no `<ul>` rendered |
| 14 | `coverBand` present, `coverBandRole` missing | ribbon shows band name only |
| 15 | `coverBand` present, full | ribbon shows both |
| 16 | `coverBand` missing | no ribbon |
| 17 | `alumnus: true` | RoleBadge shows alumnus state (RoleBadge handles visual) |
| 18 | `role: 'alumnus'` | RoleBadge shows alumnus state even when `alumnus` field missing |
| 19 | `oshiBand` present, `oshiCharacter` missing | shows band only ("Oshi: Roselia") |
| 20 | `oshiBand` missing, `oshiCharacter` present | block NOT rendered (oshi block requires band) — confirmed: only render if `oshiBand` truthy |
| 21 | non-ASCII name and CJK city | renders without encoding issues |

**Coverage target on `src/components/MemberCard/**`**: ≥80% per axis (Vite floor). Target 100% lines for the JSX (small file). Branches will be 80%+ once the conditional renders are exercised.

---

## 5. `<RoleBadge />` — `src/components/RoleBadge/`

Tiny component, mirrors P2's `<TypeBadge />` if it exists.

### 5.1 Props + rendering

```jsx
function RoleBadge({ role, alumnus = false }) { ... }
```

Visual states (Designer decides exact colors / shapes — Architect specifies labels + state mapping):

| Effective state | When | Rendered label |
|---|---|---|
| `organizer` | `role === 'organizer' && !alumnus` | `Organizer` |
| `member` | `role === 'member' && !alumnus` | `Member` |
| `alumnus` | `role === 'alumnus' \|\| alumnus === true` | `Alumnus` |
| `cover-band-lead` | `role === 'cover-band-lead' && !alumnus` | `Cover Band Lead` |
| `unknown` | `role` is anything else | `role` rendered as-is, lowercase, in a default style |

The component is `<span>`-level — never block. Class name pattern: `role-badge role-badge-{effectiveState}`. Aria-label not strictly needed (text content is the label); Designer may add for visual-only badges.

Decision: **`alumnus` flag wins over `role`** when both indicate non-alumnus state. Reasoning: a stepped-away former-organizer keeps `role: 'organizer'` for historical context but should display as `Alumnus`. If Phase 4 admin disagrees, swap the precedence (one-liner change).

### 5.2 Tests for `RoleBadge.test.jsx`

| # | Case | Expected |
|---|---|---|
| 1 | role="organizer", alumnus=false | text "Organizer", class includes "organizer" |
| 2 | role="member" | "Member" |
| 3 | role="alumnus" | "Alumnus" |
| 4 | role="cover-band-lead" | "Cover Band Lead" |
| 5 | role="organizer", alumnus=true | "Alumnus" (alumnus wins) |
| 6 | role="anything-weird" | renders "anything-weird" as fallback, class includes "unknown" |
| 7 | role omitted | renders "" or "unknown" — DECIDE: render empty string and `unknown` class; do NOT throw |
| 8 | alumnus=undefined | treated as false |

Coverage: 100% of branches reachable trivially.

---

## 6. `<MemberFilter />` — `src/components/MemberFilter/`

### 6.1 Props (controlled component)

```jsx
function MemberFilter({
  bands,                  // string[] — list of band keys/names available, e.g. ['roselia', 'mygo', ...]
  selectedBands,          // string[] — currently active band chips
  onBandsChange,          // (next: string[]) => void
  selectedRole,           // string|null
  onRoleChange,           // (next: string|null) => void
  searchValue,            // string — current input value (Members.jsx owns the debounced derived value)
  onSearchChange,         // (next: string) => void — fires on every keystroke; debounce upstream
}) { ... }
```

The component is **fully controlled** — Members.jsx is the source of truth. This pattern matches P2's filter approach (per task description "if Phase 2 is merging in parallel, look at Phase 2's filter pattern... and reuse"). If Phase 2 ships a different shape, P3 Developer mirrors it on merge — but Architect chooses controlled-component as the safe default since Phase 2 is parallel and unobservable here.

### 6.2 DOM contract

```
<form class="member-filter" role="search" onSubmit={preventDefault}>
  <fieldset class="member-filter-bands">
    <legend>Filter by band</legend>
    <div class="member-filter-chip-group" role="group">
      {bands.map(b =>
        <button type="button"
                class="chip"
                aria-pressed={selectedBands.includes(b)}
                onClick={() => toggleBand(b)}>{prettyBandName(b)}</button>
      )}
    </div>
  </fieldset>
  <fieldset class="member-filter-roles">
    <legend>Role</legend>
    <div class="member-filter-radio-group" role="radiogroup">
      <label><input type="radio" name="role" checked={selectedRole === null} value="" onChange={...}/> All</label>
      <label><input type="radio" name="role" checked={selectedRole === 'organizer'} value="organizer" onChange={...}/> Organizers</label>
      <label><input type="radio" name="role" checked={selectedRole === 'member'} value="member" onChange={...}/> Members</label>
      <label><input type="radio" name="role" checked={selectedRole === 'alumnus'} value="alumnus" onChange={...}/> Alumni</label>
      <label><input type="radio" name="role" checked={selectedRole === 'cover-band-lead'} value="cover-band-lead" onChange={...}/> Cover Bands</label>
    </div>
  </fieldset>
  <div class="member-filter-search">
    <label for="member-search">Search</label>
    <input id="member-search"
           type="search"
           inputMode="search"
           value={searchValue}
           onChange={e => onSearchChange(e.target.value)}
           placeholder="Search by name, city, oshi…"/>
  </div>
</form>
```

**Why `<fieldset>` + `<legend>`**: required for semantic groupings; screen-reader users hear "Filter by band, group" before the chip list. Memory rule: fieldset/legend visual styling needs reset (no native border) — Designer handles `.member-filter fieldset { border: none; padding: 0; margin: 0 }`.

**Why `role="search"` on the form**: it's a search landmark, navigable by AT users via `<role>=search` shortcut.

**`onSubmit={preventDefault}`**: pressing Enter in the search input must not navigate (no server endpoint). Without prevention the form would submit a GET to the same URL, triggering a full reload.

### 6.3 `prettyBandName(key)` helper

Lives **inside** MemberFilter (not in `src/lib/members.js` — it's UI-only). Maps theme keys to human labels:

```js
const BAND_LABELS = {
  roselia: 'Roselia',
  popipa: "Poppin'Party",
  mygo: 'MyGO!!!!!',
  morfonica: 'Morfonica',
  afterglow: 'Afterglow',
  pastel: 'Pastel*Palettes',
  hhw: 'Hello, Happy, World!',
}
function prettyBandName(key) {
  return BAND_LABELS[key] ?? key
}
```

If a member's `oshiBand` is a free string (e.g. `"Roselia"` not `"roselia"`), the filter chip will pass through to `filterMembers` which lowercases on both sides (§3.1). The chip set (`bands` prop) is sourced from the union of `oshiBand` values present in `members.json` (Members.jsx computes), so chips are data-driven, not theme-driven. **Designer may revisit** if a curated chip order is desired.

### 6.4 Tests for `MemberFilter.test.jsx`

| # | Case | Expected |
|---|---|---|
| 1 | renders chips for each band passed in `bands` prop | one button per band |
| 2 | clicking unselected chip → `onBandsChange` called with `[band]` | toggle on |
| 3 | clicking selected chip → `onBandsChange` called with `[]` | toggle off |
| 4 | `aria-pressed="true"` on selected chips, `false` on others | visual+a11y |
| 5 | clicking radio "Organizers" → `onRoleChange('organizer')` | role change |
| 6 | clicking radio "All" → `onRoleChange(null)` | reset |
| 7 | typing in search input fires `onSearchChange` with current value | every keystroke |
| 8 | pressing Enter in search input does NOT reload (preventDefault) | use `userEvent.keyboard('{Enter}')`, assert no nav |
| 9 | empty `bands` array → no chips, fieldset still renders with legend | renders legend |
| 10 | label text is associated with the search input via `for`/`id` | `getByLabelText('Search')` works |

**Debounce is NOT tested here** — debounce lives in `Members.jsx` (the page owns it). This component is a pure controlled view.

---

## 7. `<MemberGrid />` — `src/components/MemberGrid/`

### 7.1 Props

```jsx
function MemberGrid({ members, emptyMessage = 'No members match your filters.' }) { ... }
```

### 7.2 DOM contract

```
{members.length === 0
  ? <p class="member-grid-empty" role="status">{emptyMessage}</p>
  : <ul class="member-grid">
      {members.map(m => <li key={m.id}><MemberCard member={m}/></li>)}
    </ul>}
```

### 7.3 Why `<ul>` + `<li>` wrapping

A roster IS a list. AT users get "list with N items" announcement. Visual styling resets the bullet (`list-style: none; margin: 0; padding: 0`). Each card is wrapped in `<li>`; the `<article>` semantic is preserved inside.

### 7.4 Empty-state

`role="status"` makes the empty message a live region — screen readers announce "No members match your filters." after a filter narrows the list to zero. Without the role, the change would be silent.

### 7.5 Tests for `MemberGrid.test.jsx`

| # | Case | Expected |
|---|---|---|
| 1 | empty array | renders empty message with `role="status"`; no `<ul>` |
| 2 | empty array + custom `emptyMessage` | custom text rendered |
| 3 | one member | renders `<ul>` with 1 `<li>` containing MemberCard |
| 4 | multiple members | renders correct count of `<li>`; keys use `member.id` |
| 5 | members with duplicate ids | NOT a tested behavior — caller is responsible (assert in dev console only via React's key warning; no test) |

---

## 8. `<Members />` — `src/pages/Members.jsx`

Page-level orchestration. Owns filter state + debounce.

### 8.1 Structure

```jsx
import { useState, useEffect, useMemo } from 'react'
import membersData from '../data/members.json'
import MemberFilter from '../components/MemberFilter/MemberFilter.jsx'
import MemberGrid from '../components/MemberGrid/MemberGrid.jsx'
import { filterMembers, sortMembersByName } from '../lib/members.js'
import './Members.css'  // optional

const SEARCH_DEBOUNCE_MS = 200

export default function Members() {
  const [selectedBands, setSelectedBands] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const availableBands = useMemo(
    () => Array.from(new Set(membersData.map(m => m.oshiBand).filter(Boolean))).sort(),
    []
  )
  const visibleMembers = useMemo(
    () => sortMembersByName(filterMembers(membersData, {
      bands: selectedBands,
      role: selectedRole,
      search: debouncedSearch,
    })),
    [selectedBands, selectedRole, debouncedSearch]
  )

  return (
    <main className="section">
      <div className="section-inner">
        <h1 className="section-title">Members</h1>
        <p className="section-subtitle">
          Organizers, members, and cover bands across the BanG Dream! NA community.
        </p>
        <MemberFilter
          bands={availableBands}
          selectedBands={selectedBands}
          onBandsChange={setSelectedBands}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
        />
        <MemberGrid members={visibleMembers}/>
      </div>
    </main>
  )
}
```

### 8.2 Debounce — design notes

- `searchInput` is the **immediate** state bound to the input value (controlled — re-renders on every keystroke).
- `debouncedSearch` is the value passed to `filterMembers`. It updates `SEARCH_DEBOUNCE_MS` after the last keystroke.
- `clearTimeout(t)` in the effect cleanup cancels stale timers — a user typing "kanade" fires 6 effects, but only the last one's timer survives.
- 200ms is a reasonable default; under <100ms feels too eager (filter flickers per char), >300ms feels laggy.
- **NO lodash** (per task description). Vanilla `setTimeout` + `clearTimeout` is the idiom.
- **No `useRef` for the timer**: the cleanup pattern works because each render captures `t` in the closure. `useRef` would be needed if the timer ID had to persist across renders for some other reason (it doesn't).
- **Testing the debounce**: use `vi.useFakeTimers()` + `vi.advanceTimersByTime(200)` in the page test. Assert that immediate input change does NOT update grid; after `advanceTimersByTime(200)` it does.

### 8.3 `useMemo` rationale

- `availableBands`: derived from static `membersData` once. Without `useMemo`, `Array.from(new Set(...))` would produce a new array reference every render → MemberFilter would re-render even when its prop content hasn't changed.
- `visibleMembers`: depends on `[selectedBands, selectedRole, debouncedSearch]`. Without memoization, `filterMembers` runs every keystroke even when only `searchInput` (not `debouncedSearch`) changed. Memoization here is correctness-adjacent (cheap correctness; not strictly needed for small N).
- For Phase 3 with `members.json: []` initially and likely <50 members at scale, performance is not a concern. The memo is for cleanliness, not speed.

### 8.4 Page CSS — `Members.css`

Optional, small. If not added, page-level layout uses existing `.section`, `.section-inner`, `.section-title`, `.section-subtitle` from `App.css` (already proven by current placeholder). Recommended: add only the layout that connects MemberFilter + MemberGrid (margin/spacing). Component-internal styles live in their own component CSS files. Keep ≤20 lines; if it grows, that's a smell.

### 8.5 Tests for `Members.test.jsx`

| # | Case | Expected |
|---|---|---|
| 1 | empty `members.json` (mocked via `vi.mock`) | filter renders, grid shows empty state |
| 2 | members.json with 3 members across 2 bands | both chips render; default view shows all 3 |
| 3 | clicking Roselia chip filters to only Roselia oshis | grid count drops |
| 4 | clicking Organizer radio filters | grid count drops |
| 5 | typing in search updates input immediately, but grid only after debounce (`vi.useFakeTimers`) | tests both sides of the debounce |
| 6 | typing then clearing search before debounce fires → no flicker | debounce cleanup works |
| 7 | combined: chip + role + search all narrow correctly | intersection |
| 8 | filter that produces zero results | empty state shows with `role="status"` |
| 9 | page H1 "Members" present | accessibility |

**Mock strategy** for `members.json`: use `vi.mock('../data/members.json', () => ({ default: [...] }))` at the top of the test file. This is the standard Vitest pattern; works because the data is imported as a module.

**Coverage target on `src/pages/Members.jsx`**: ≥80% (Vite floor). The conditional inside `useMemo` for `availableBands` is hit by case 2; debounce branches by case 5 + 6; filter combinations by 3 + 4 + 7.

---

## 9. Reuse from Phase 2 (if available)

Per task description, "if Phase 2 is merging in parallel, look at Phase 2's filter pattern (chip group, type radio) and reuse". Phase 3 worktree does not contain Phase 2 work; both branches will merge to `main` separately.

**Architect decision**: design Members standalone using the controlled-filter pattern in §6. **Post-merge convergence is the Developer's responsibility**, scoped to:

1. If Phase 2 ships a `<TypeBadge />` and the visual styling is portable to roles, P3 Developer extracts the shared chip/badge CSS to `src/components/RoleBadge/RoleBadge.css` with class names matching P2's. **No shared component file** in either phase — the convergence is at the CSS level only, post-merge. Cross-phase imports would couple the worktrees and defeat parallel work.
2. If Phase 2 ships a `<TypeFilter />` with the same controlled-component shape (`selectedTypes` + `onTypesChange` + `searchValue` + `onSearchChange`), P3's `<MemberFilter />` API will already match (designed deliberately to match the pattern). No code change needed.
3. If Phase 2 diverged structurally (e.g. uses `useReducer` instead of two `useState`s for filter state), P3 does NOT retrofit. Both work; both are local to their page; cleanup is a Phase 4+ task.

**Self-contained baseline**: every file P3 needs is created in P3's worktree. P3 imports nothing from P2.

---

## 10. Routing

Already mounted by Phase 1 in `src/App.jsx:17`:

```jsx
<Route path="/members" element={<Members />} />
```

**No routing changes** in Phase 3. Developer ONLY replaces the import target by overwriting `src/pages/Members.jsx`. The `App.jsx` import path stays `./pages/Members.jsx`. The current placeholder file is overwritten in place.

**SPA rewrite**: `vercel.json` (Phase 1) handles `/members` direct-URL access via the catch-all rewrite — no changes.

---

## 11. Updates to existing tests

### 11.1 `src/pages/pages.test.jsx`

Current assertion at line 27:
```jsx
expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
```
This assumed `<ComingSoonCard role="article">` was present on Members. After the rewrite, Members no longer renders ComingSoonCards.

**Updated assertion** (Developer makes this change):
```jsx
it('Members page renders title via /members route', () => {
  renderWithProviders(<RoutesUnderTest />, { route: '/members' })
  expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
})
```

The "at least one article" check is irrelevant once the empty-state path is the default (members.json starts as `[]`). The page-level test in `Members.test.jsx` (§8.5) covers article presence with non-empty data.

### 11.2 No other Phase 1 tests change

`Home.test.jsx`, `App.test.jsx`, `themes.test.js`, `ThemeContext.test.jsx`, all component tests in `Navbar/`, `Footer/`, `Hero/`, `DiscordCTA/`, `ThemeSwitcher/`, `ComingSoonCard/` — untouched.

---

## 12. Coverage gates

`vite.config.js` already enforces `lines/functions/branches/statements ≥ 80%` per file (Phase 1 §2). No threshold changes for Phase 3.

**Required to clear the gate** (per task #6 description point 8):

| Path | Floor | Target |
|---|---|---|
| `src/lib/members.js` | 80% | 100% (achievable; small + pure) |
| `src/components/MemberCard/**` | 80% | 95%+ |
| `src/components/MemberFilter/**` | 80% | 90%+ |
| `src/components/MemberGrid/**` | 80% | 100% |
| `src/components/RoleBadge/**` | 80% | 100% |
| `src/pages/Members.jsx` | 80% | 85%+ |

**Coverage exclude** (already in vite.config): `src/data/**`, so `members.json` does not count against coverage. `src/lib/**` is **not** excluded — covered by `members.test.js`.

**Edge tests required** (memory `feedback_edge_testing_soul.md`):

- `members.js`: empty array, undefined filters, mutation check (§3.4 #1, #15, #21)
- `MemberCard`: missing avatar, missing bio, missing oshi, alumnus state, single-name CJK, very long name (§4.7 #2, #6, #7-9)
- `MemberFilter`: empty bands array, search Enter doesn't reload (§6.4 #8, #9)
- `MemberGrid`: empty members → status role (§7.5 #1)
- `Members.jsx`: zero results, debounce cleanup (§8.5 #6, #8)

Each edge case maps to a test row above. Reviewer cross-checks the table when verifying APPROVED.

---

## 13. Open issues for Developer

Architect-decided unilaterally. Developer adopts unless Reviewer flags.

1. **Cover band ribbon link** — NO (§4.4). Static visual marker; revisit if Phase 5 adds detail pages.
2. **RoleBadge separate vs absorbed** — SEPARATE (§5). Mirrors P2's TypeBadge if P2 ships it; symmetry simplifies Phase 4 admin.
3. **Avatar fallback strategy** — render-time check (`!member.avatar` → initials) PLUS `onError` second-line defense for broken URLs (§4.5). Both code paths tested.
4. **Diacritic folding in search** — NOT applied. `'cafe'` does NOT match `'café'` in Phase 3. Adding `String.prototype.normalize('NFKD')` + `.replace(/\p{Diacritic}/gu, '')` is a single-line change if Reviewer flags. Decision deferred to keep the helper pure and avoid debating which Unicode normalization form to use.
5. **CJK collation in `sortMembersByName`** — relies on `localeCompare` host locale. Browsers differ slightly (e.g. Firefox sorts `あ` before `戸`; Chrome may differ). Acceptable — for a community of 50 members this is invisible. Adding `Intl.Collator('ja-JP-u-co-unihan')` is option for Phase 4.
6. **`oshiBand` storage format** — stored as **free string** (e.g. `"Roselia"` or `"roselia"` — case-insensitive comparison in `filterMembers`). Recommendation to user: pick one casing convention in `members.json` and stick with it. Phase 4 admin UI will normalize.
7. **`socials.discord` not a link** — display-only span (§4.3). Discord usernames don't have stable URLs (they used to with discriminators; the new `@username` system doesn't expose direct URLs). Test asserts span, not anchor.
8. **`Members.css` adoption** — optional. If page-level styles are <10 lines, prefer adding to `App.css` next to existing `.section` / `.coming-soon-grid`. Otherwise create the file. Developer's call.
9. **`bands` prop ordering in MemberFilter** — derived from `members.json` data (Members.jsx computes via `Set`). The order is alphabetical (`.sort()` on the deduped list — see §8.1). If Designer wants a curated order matching themes.js, swap to `themeOrder` filter (one-line change in Members.jsx).
10. **Initial state from URL params** — NO. The filter state is local to the page and not synced to the URL. Sharing a filtered roster URL is a Phase 4 feature. Adding it now requires `useSearchParams` and would expand the test surface significantly.
11. **No empty-row rendering for missing required fields** — if `members.json` contains a row missing `id` or `name` or `role`, the page WILL render with broken UI. Validation belongs in Phase 4 admin save flow, not at runtime in the read path.
12. **No pagination / virtualization** — Phase 3 expects ≤50 members. Adding `react-window` would be premature.
13. **`useTheme` integration** — Members page does NOT call `useTheme()`. CSS uses `var(--color-*)` tokens which are set on `:root` by `<ThemeProvider>` (Phase 1). The roster therefore re-skins automatically when the user picks a theme; no explicit subscribe needed.
14. **`alumnus` flag precedence** — alumnus wins over role (§5.1). A former-organizer with `alumnus: true` shows "Alumnus" badge; `role: 'organizer'` is preserved in data for admin UI.

---

## 14. Iteration Contract for Developer dispatch

Per memory `feedback_iteration_contract_needs_explicit_ack.md`, Developer (task #7) does NOT begin until team-lead SendMessages explicit "approved — proceed to P3 Developer dispatch" after both Designer (task #5) and Architect (task #6) deliverables land.

**Pre-dispatch checklist** for team-lead:

- [ ] `docs/p3-design.md` committed (Designer task #5 done)
- [ ] `docs/p3-architecture.md` committed (this file — Architect task #6 done)
- [ ] Designer's color/typography/visual decisions reconciled with Architect's DOM/component decisions (no contradictions on `RoleBadge` shape, MemberCard layout, etc.)
- [ ] If contradictions exist, team-lead flags to user and pauses; do NOT auto-resolve

**Post-dispatch contract for Developer**:

- TDD: write `members.test.js` before `members.js`. Same for each component.
- Conventional commits, no Co-Authored-By, no `.claude/` (memory rules).
- Push after each commit (Hard Rule #4).
- Coverage check before final commit: `npm run test:coverage` must show all 4 axes ≥80% on every Phase 3 file (Reviewer will re-verify on-device).
- DONE signal: SendMessage team-lead with summary + green coverage report.

**Reviewer (task #8) gate** (binding):

```bash
npm install  # (already installed; no-op for an existing worktree)
npm run lint
npm run test:coverage
npm run build
npm run dev   # manual on-device: /members route, filter chips, role radios, search debounce, empty state
```

Reviewer saves verdict to `.claude/code-reviews.md` per memory `feedback_code_review_log.md`.

---

## 15. Cross-references

- **Plan**: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md` (Phase 3 outline at lines 388-394)
- **Phase 1 architecture**: `docs/architecture.md` (this worktree)
- **Phase 1 design**: `docs/design.md` (this worktree)
- **Phase 3 design**: `docs/p3-design.md` (Designer task #5 — pending merge from Designer's worktree)
- **Memory rules** (load-bearing for this spec):
  - `feedback_edge_testing_soul.md` — 80% coverage + edge tests non-negotiable
  - `feedback_normalize_inside_helper.md` — `filterMembers` accepts null/undefined/empty filters
  - `feedback_no_claude_on_github.md` — `.claude/` stays out
  - `feedback_no_coauthor.md` — no Co-Authored-By on commits
  - `feedback_iteration_contract_needs_explicit_ack.md` — explicit team-lead handoff between phases
  - `feedback_pipeline_is_five_agents_strict.md` — 5 distinct agents for Phase 3 (Planner→Designer→Architect→Developer→Reviewer)
  - `feedback_team_lead_self_verify_not_reviewer.md` — Reviewer is a separate dispatch
  - `principles.md` (Immutability) — `filterMembers` and `sortMembersByName` return new arrays

---

**Architect status**: complete. Developer (task #7) is unblocked once Designer (task #5) commits `docs/p3-design.md` and team-lead issues explicit dispatch acknowledgement.
