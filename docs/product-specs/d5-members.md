# Feature: D5 — Members

## Product Context

Sub-PR D5 of 7 for the bangdream-na Claude Design redesign. Depends on D1 (merged at ef396e7), which provides design tokens, LayoutShell, bf-* CSS namespace, and all shell components.

This PR replaces the existing desktop/mobile split Members implementation with a single responsive component matching the Bandori.fans design: a flat monospace name grid with a page-hero header. The filter/search/band-chip UI is REMOVED — the new design shows a flat alphabetical roster only.

Data continues to come from the worker API (`/api/members`). No static file is introduced.

## User Stories

- As a visitor I want to see all community members in a compact monospace grid so I can quickly scan who is in the group.
- As a visitor I want to see a count badge ("共 N+ 名同好") so I know the approximate group size.
- As a mobile user I want the grid to show 2 columns so names remain readable on small screens.
- As a developer I want a single Members.jsx (no desktop/mobile split) so the codebase is simpler.

## Acceptance Criteria

### Page Hero (`bf-page-hd`)
- [ ] Members.jsx renders a `div.bf-page-hd` above the main content area (Members owns its own hero since LayoutShell children slot does not include a page-hero)
- [ ] Inside bf-page-hd: `span.ph-tag` containing `// 成员` and `h1` containing `成员`
- [ ] Right side: `span.ph-meta` containing `组织者、成员、翻奏乐队 — 北美 BanG Dream 一览`
- [ ] bf-page-hd styles: `padding: 36px 0 24px; border-bottom: 1px solid var(--rule); background: var(--paper)`
- [ ] ph-tag styles: mono font, 10.5px, `letter-spacing: .16em`, `color: var(--ink-3)`, uppercase, `display: block; margin-bottom: 6px`
- [ ] h1 styles: display font, weight 600, 38px, `letter-spacing: -.005em`, `line-height: 1.1`
- [ ] ph-meta styles: mono font, 11px, `color: var(--ink-3)`

### Helper block (`bf-helper`)
- [ ] Below the hero, inside `main.bf-page-body > div.bf-container`, a `div.bf-helper` renders
- [ ] Helper contains `span.bf-helper-tag` with `// 组织者、成员、翻奏乐队`
- [ ] Helper contains a paragraph: `北美 BanG Dream 同好一览。共 <strong>{total}+</strong> 名同好（节选）。如需修改自己的显示名或地区标签，请在 QQ 群联系管理员。`
- [ ] `{total}` is the actual count of members returned by the API (not hardcoded)

### Members grid (`bf-members-grid`)
- [ ] `div.bf-members-grid` renders inside `div.bf-container` after the helper
- [ ] CSS: `display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 2px`
- [ ] Each member renders as `div.bf-member` containing the member's display name (text only)
- [ ] bf-member CSS: `font-family: var(--mono); font-size: 12px; padding: 6px 8px; background: var(--paper); border: 1px solid var(--rule); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- [ ] Members are sorted by pinyin collation via `sortMembersByName()` from `src/lib/members.js`

### Mobile breakpoint
- [ ] At `≤700px`: bf-members-grid switches to `grid-template-columns: repeat(2, 1fr)`
- [ ] Media query uses `max-width: 700px` to match D1 breakpoint system

### Data source
- [ ] `fetchMembers()` from `src/lib/api.js` is used — unchanged
- [ ] `adaptMemberList()` from `src/lib/apiAdapter.js` is used — unchanged
- [ ] `sortMembersByName()` from `src/lib/members.js` is applied to the adapted list
- [ ] NO `src/data/members.json` file is created
- [ ] NO filter state, no search state, no band-chip state in the new component

### Loading and error states
- [ ] While fetching: `<LoadingState className="members-loading" />` is rendered (full-page replacement)
- [ ] On fetch error: `<ErrorState className="members-error" onRetry={retry} />` is rendered

### File deletions
- [ ] `src/pages/Members.desktop.jsx` deleted
- [ ] `src/pages/Members.desktop.css` deleted
- [ ] `src/pages/Members.desktop.test.jsx` deleted
- [ ] `src/pages/Members.mobile.jsx` deleted
- [ ] `src/pages/Members.mobile.css` deleted
- [ ] `src/pages/Members.mobile.test.jsx` deleted
- [ ] `src/pages/Members.shell.test.jsx` deleted
- [ ] `src/components/MemberGrid/` directory deleted (MemberGrid.jsx, MemberGrid.css, MemberGrid.test.jsx)
- [ ] `src/components/MemberCard/` directory deleted (MemberCard.jsx, MemberCard.css, MemberCard.test.jsx)
- [ ] `src/components/MemberFilter/` directory deleted (MemberFilter.jsx, MemberFilter.css, MemberFilter.test.jsx)

### Files created/modified
- [ ] `src/pages/Members.jsx` — rewritten as single responsive component
- [ ] `src/pages/Members.css` — new CSS file with bf-page-hd, bf-members-grid, bf-member, bf-helper overrides
- [ ] `src/pages/Members.test.jsx` — rewritten tests (TDD: red first)
- [ ] `src/lib/members.js` — UNCHANGED
- [ ] `src/lib/members.test.js` — UNCHANGED

## Edge Test Coverage

- [ ] **Empty list**: API returns 0 members → helper shows "共 0+" and grid renders no bf-member tiles
- [ ] **Long name**: member with name >40 characters → renders without breaking layout (text-overflow ellipsis; no horizontal overflow)
- [ ] **Special characters**: member with name containing emojis, CJK, brackets `[]【】「」`, slashes — renders without throwing
- [ ] **Null/undefined name**: member object with `name: null` or `name: undefined` — item is skipped or renders empty string gracefully (no crash)
- [ ] **Loading state**: before API resolves → `LoadingState` element is present in DOM
- [ ] **Error state**: API rejects → `ErrorState` element with retry button is present; clicking retry triggers re-fetch
- [ ] **Single member**: API returns exactly 1 member → exactly 1 bf-member tile renders
- [ ] **Sort order**: API returns members in reverse-alphabetical order → rendered order is pinyin-sorted ascending (assert index of earlier-pinyin name < later-pinyin name)

## Files to Create / Modify / Delete

### Create
- `src/pages/Members.css`
- `src/pages/Members.test.jsx` (TDD red phase first)

### Modify
- `src/pages/Members.jsx` (full rewrite)

### Delete
- `src/pages/Members.desktop.jsx`
- `src/pages/Members.desktop.css`
- `src/pages/Members.desktop.test.jsx`
- `src/pages/Members.mobile.jsx`
- `src/pages/Members.mobile.css`
- `src/pages/Members.mobile.test.jsx`
- `src/pages/Members.shell.test.jsx`
- `src/components/MemberGrid/MemberGrid.jsx`
- `src/components/MemberGrid/MemberGrid.css`
- `src/components/MemberGrid/MemberGrid.test.jsx`
- `src/components/MemberCard/MemberCard.jsx`
- `src/components/MemberCard/MemberCard.css`
- `src/components/MemberCard/MemberCard.test.jsx`
- `src/components/MemberFilter/MemberFilter.jsx`
- `src/components/MemberFilter/MemberFilter.css`
- `src/components/MemberFilter/MemberFilter.test.jsx`

### Unchanged
- `src/lib/members.js`
- `src/lib/members.test.js`
- `src/lib/api.js`
- `src/lib/apiAdapter.js`
- Worker files (no worker changes)

## Architect Integration Check

### App.jsx route — no changes needed
- `src/App.jsx` line 7: `import Members from './pages/Members.jsx'`
- `src/App.jsx` line 27: `<Route path="/members" element={<Members />} />`
- The route already exists and imports Members.jsx correctly. No App.jsx changes required.
- LayoutShell already wraps `/members` as a child route (confirmed in D1 LayoutShell).

### Existing file inventory — files to DELETE
The following files test or implement the old desktop/mobile split and must be deleted:
```
src/pages/Members.desktop.jsx        — old desktop track (pure presentational)
src/pages/Members.desktop.css        — old desktop CSS
src/pages/Members.desktop.test.jsx   — tests old desktop track
src/pages/Members.mobile.jsx         — old mobile track
src/pages/Members.mobile.css         — old mobile CSS  
src/pages/Members.mobile.test.jsx    — tests old mobile track
src/pages/Members.shell.test.jsx     — tests old breakpoint-routing shell
src/components/MemberGrid/           — replaced by bf-members-grid CSS
src/components/MemberCard/           — replaced by bf-member CSS
src/components/MemberFilter/         — filter UI removed in new design
```

### Data flow (unchanged)
```
/api/members (worker)
  → fetchMembers() [src/lib/api.js]
  → adaptMemberList() [src/lib/apiAdapter.js:128]
  → sortMembersByName() [src/lib/members.js]
  → Members.jsx state (members array)
  → {members.map(m => <div className="bf-member">{m.name}</div>)}
```

### Test infrastructure
- `Members.test.jsx` uses `renderWithProviders` from `src/test/utils.jsx` (includes MemoryRouter via `route` option)
- Members page does NOT use react-router hooks (no `useParams`, no `useNavigate`), so MemoryRouter wrapper is optional but safe to include via `renderWithProviders()`
- `vi.mock('../lib/api.js')` pattern for mocking fetchMembers (established in current Members.test.jsx)

### Import cleanup after deletions
- After deleting MemberGrid, MemberCard, MemberFilter — search for any remaining imports across the codebase and remove them
- Expected locations: only Members.desktop.jsx and Members.mobile.jsx import these (both being deleted anyway)

### adaptMemberList output shape (for test fixtures)
```js
// API row shape:
{ id, external_id, display_name, city, oshi_character, oshi_band, avatar_url, expedition_member }
// Adapted shape (what Members.jsx receives in `members` state):
{ id, name, city, oshiCharacter, oshiBand, avatarUrl, isExpeditionMember }
```
Tests should use API-row shape for mock return values (adaptMemberList converts them).

## Designer Notes

### CSS class reuse from D1 (tokens.css)

The following D1 classes are used directly — do NOT redefine them in Members.css:

- `bf-helper` — already in tokens.css:137 (`background: var(--paper); border: 1px solid var(--rule); border-left: 3px solid var(--accent); padding: 14px 18px; margin: 24px 0 0`)
- `bf-helper-tag` — already in tokens.css:144 (mono, 10.5px, 0.14em spacing, ink-3, uppercase)
- `bf-container` — defined in tokens.css (max-width centered container)
- `bf-section` — defined in tokens.css (56px vertical padding, collapses to 36px at 700px)

### New classes in Members.css (D5-specific)

- `bf-page-hd` — subpage hero header (new; not in D1 tokens.css; define in Members.css)
- `bf-page-body` — main content wrapper below hero (new; define in Members.css)
- `bf-members-grid` — CSS grid for name tiles (new; define in Members.css)
- `bf-member` — individual name tile (new; define in Members.css)

### Mobile breakpoint

- Use `max-width: 700px` to match D1 breakpoint system throughout
- Desktop: bf-members-grid = `repeat(auto-fill, minmax(180px, 1fr))`
- Mobile (≤700px): bf-members-grid = `repeat(2, 1fr)`
- ph-meta on mobile: stack below h1 or hide (flex-wrap handles this naturally via the flex layout)

### Typography decisions

- bf-member name: JetBrains Mono via `var(--mono)` — matches design's monospace name list aesthetic
- Page hero h1: Futura/Avenir/Noto via `var(--display)` — matches all other subpage headers
- bf-helper-tag and ph-tag: both use `var(--mono)` — consistent code-comment aesthetic

### Visual integration with LayoutShell

- LayoutShell renders: UtilityBar → Masthead → PrimaryNav → {children} → Footer
- Members.jsx renders as a child: it owns its bf-page-hd hero + bf-page-body content
- This matches the design's subpage.html pattern where each page renders its own bf-page-hd
- No changes needed to LayoutShell

## Out of Scope

- Filter/search/band-chip UI (removed in new design)
- Worker API changes (`/api/members` endpoint unchanged)
- `src/data/members.json` (must NOT be created)
- i18n changes (no new translation keys needed)
- D1 token or shell changes (if needed, surface to top-level sub-lead)
- Admin panel (`/admin/*`) — untouched
