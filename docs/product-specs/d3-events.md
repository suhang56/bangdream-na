# D3 — Events + EventDetail: Claude Design Port

**Branch:** `feat/d3-events`  
**Worktree:** `C:/Users/WaterMelon/bangdream-na-worktrees/d3-events`  
**Design source:** `C:/Users/WaterMelon/tmp/bangdream-snapshot/design/bandori-fans/project/`  
**Locked scope:** Events page + EventDetail page only. No shell, no tokens.css changes.

---

## 1. Goal

Replace the current desktop/mobile split Events page and the basic EventDetail with single-component bandori-fans subpage-style implementations that use the bf-* CSS namespace already shipped in D1.

---

## 2. Route inventory (no changes to App.jsx)

| Route | Component | Note |
|---|---|---|
| `/events` | `Events.jsx` | Replaces desktop+mobile split |
| `/events/:slug` | `EventDetail.jsx` | Uses slug param — PR #110 BLOCKER |

App.jsx already has `<Route path="/events/:slug" element={<EventDetail />} />`. Do NOT touch App.jsx.

---

## 3. API field map

Worker endpoints: `/api/events?scope=upcoming` and `/api/events?scope=past`

API row shape (snake_case from D1 apiAdapter.js):
```
{
  id, slug, title_zh, title_en, description_md,
  hero_image_url, start_at (unix seconds), end_at (unix seconds),
  venue, city, scope, ticket_url, band_theme
}
```

`adaptEventRow()` in `src/lib/apiAdapter.js` maps to:
```
{
  id (= slug),  title,   date (ISO),  endDate (ISO|null),
  type,         location (city · venue or city or venue),
  description,  links,   bands ([band_theme] or []),
  image,        ticketUrl
}
```

Events page fetches both scopes independently. EventDetail uses `fetchEventBySlug(slug)`.

---

## 4. Events page spec

### 4.1 Page-hero (`.bf-page-hd`)

D1 LayoutShell does NOT inject a page-hero automatically — each page owns it. Render inside `Events.jsx` above the table sections.

```
<section class="bf-page-hd">
  <div class="bf-container">
    <div>
      <span class="ph-tag">// 活动</span>
      <h1>活动</h1>
    </div>
    <span class="ph-meta">{N} 即将到来 · {M} 已结束</span>
  </div>
</section>
```

CSS is already in subpage.html inline styles in the design source:
```css
.bf-page-hd { padding: 36px 0 24px; border-bottom: 1px solid var(--rule); background: var(--paper); }
.bf-page-hd .bf-container { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.bf-page-hd .ph-tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; color: var(--ink-3); text-transform: uppercase; display: block; margin-bottom: 6px; }
.bf-page-hd h1 { font-family: var(--display); font-weight: 600; font-size: 38px; margin: 0; letter-spacing: -.005em; line-height: 1.1; }
.bf-page-hd .ph-meta { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
```

Include in `Events.css`.

### 4.2 Upcoming table (`.bf-tbl`)

Section header: `<SectionTitle jp="UPCOMING EVENTS" cn="即将到来" />` (reuse from D1 LayoutShell exports or inline it if not exported).

Table columns: 日期 | 活动名称 | 地点 | 票务

- 日期: `td-d` mono, white-space nowrap
- 活动名称: `td-title`, title as `<Link to="/events/:slug">` (slug from `item.id`), `<small>` for band tag if present
- 地点: `td-cat` hidden on mobile (`bf-hide-mobile`)
- 票务: `td-buy` link or dash, hidden on mobile

Empty state: simple `<p class="bf-events-counter">` "暂无即将到来的活动".

### 4.3 Past table (`.bf-tbl bf-tbl-muted`)

Section header: `<SectionTitle jp="PAST EVENTS" cn="往期活动" />`.

Same columns as upcoming but class `bf-tbl bf-tbl-muted`. No ticket column (past events have no buy action).

Empty state: "暂无往期活动".

### 4.4 Mobile breakpoint (≤700px)

Design tokens.css already has:
```css
.bf-tbl, .bf-tbl thead, ... { display: block; }
.bf-tbl thead { display: none; }
```
— inherited from D1. Each `<tr>` stacks as a card with date mono on top, title bold, sub-text for location. No custom logic needed; the table just reflows.

### 4.5 Loading + Error

Keep existing `<LoadingState>` and `<ErrorState>` pattern. No changes to those components.

### 4.6 Data fetching

Fetch both scopes in parallel (Promise.all). Split upcoming vs past by `scope` field on adapted rows OR by separate fetch results (current Events.jsx already does this correctly — preserve the pattern).

Adapted rows from `adaptEventRow()` do not carry `scope`. Use separate state:
```js
const [upcoming, setUpcoming] = useState([])
const [past, setPast] = useState([])
```

---

## 5. EventDetail spec

### 5.1 Route / slug handling

```jsx
const { slug } = useParams()  // /events/:slug
```

**PR #110 BLOCKER:** The route param is `:slug`. `fetchEventBySlug(slug)` must be called with the slug string, NOT numeric id. This is already correct in the existing EventDetail.jsx — preserve it exactly. The regression test MUST verify slug-based fetch.

### 5.2 Layout

```
<main class="event-detail bf-container">
  <Link to="/events">← 返回活动</Link>

  [large hero image if item.image]

  <h1 class="event-detail__title">{item.title}</h1>

  [bf-helper box: 时间 — date + optional endDate]
  [bf-helper box: 地点 — location if present]
  [bf-helper box: 票务 — ticket link if ticketUrl]
  [bf-helper box: 备注 — description body if present]
</main>
```

`.bf-helper` classes already in styles.css (D1 shipped):
```css
.bf-helper { background: var(--paper); border: 1px solid var(--rule); border-left: 3px solid var(--accent); padding: 14px 18px; margin: 24px 0 0; }
.bf-helper-tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; color: var(--ink-3); text-transform: uppercase; display: block; margin-bottom: 6px; }
```

Hero image: full-width above title, `loading="eager"`.

### 5.3 Not-found state

Keep existing not-found render with `<Link to="/events">` back button.

---

## 6. Files to create

```
src/pages/Events.jsx          (REWRITE — single component, no mobile/desktop split)
src/pages/Events.css          (NEW — bf-page-hd + event-specific overrides)
src/pages/Events.test.jsx     (REWRITE — new tests for bf-* DOM, slug links, split scope)
src/pages/EventDetail.jsx     (REWRITE — bf-helper layout, preserve slug logic)
src/pages/EventDetail.css     (UPDATE — trim old, add bf-helper specifics if any)
src/pages/EventDetail.test.jsx (REWRITE — new tests including PR#110 slug regression)
```

## 7. Files to DELETE

```
src/pages/Events.desktop.jsx
src/pages/Events.desktop.css
src/pages/Events.desktop.test.jsx
src/pages/Events.mobile.jsx
src/pages/Events.mobile.css
src/pages/Events.mobile.test.jsx
```

Components that become orphaned if Events no longer uses them:
```
src/components/EventCalendar/   — DELETE (calendar view removed)
src/components/EventFilterSheet/ — DELETE (filter sheet removed)
src/components/EventSidebar/    — DELETE (sidebar layout removed)
```

Components that are still used or may be used by other pages — KEEP:
```
src/components/EventCard/   — keep (may be referenced from Home)
src/components/EventList/   — keep (may be referenced from Home)
```

Verify before deleting: `grep -r "EventCalendar\|EventFilterSheet\|EventSidebar" src/` excluding the files being deleted.

---

## 8. Edge tests (mandatory — 6 minimum)

1. **Events page renders bf-page-hd h1 with text "活动"** — DOM selector `.bf-page-hd h1`
2. **Upcoming table renders items from /api/events?scope=upcoming** — event title in `.bf-tbl` (not `.bf-tbl-muted`)
3. **Past table renders items from /api/events?scope=past** — event title in `.bf-tbl.bf-tbl-muted`
4. **PR #110 slug regression: upcoming event row links to /events/:slug (not /events/:id)** — `<Link to="/events/roselia-la">` href must contain the slug string, not a numeric id
5. **EventDetail fetches by slug param from URL (not id)** — `fetchEventBySlug` called with `"roselia-la"` when route is `/events/roselia-la`
6. **EventDetail renders bf-helper box for ticket link when ticket_url present** — `.bf-helper` contains `<a>` with href=ticketUrl
7. **EventDetail renders bf-helper box for location** — `.bf-helper` contains location text
8. **Past events table renders with bf-tbl-muted class** — `.bf-tbl.bf-tbl-muted` in DOM
9. **Empty upcoming: renders "暂无即将到来的活动"** — text visible when upcoming API returns []
10. **Loading state shows while fetching** — `.loading-state` present before resolve

---

## 9. Constraints

- NO modification to `src/lib/api.js`, `src/lib/apiAdapter.js`, `src/App.jsx`, tokens.css, or LayoutShell
- NO worker code changes — STOP and DM team-lead if worker touchpoint needed
- Conventional commit: `feat(design): D3 events + event-detail — claude design port`
- No Co-Authored-By in commits
- Push after every commit
- `gh pr create --base main --head feat/d3-events` explicitly

## Designer notes

Reuse bf-* classes from D1 tokens + styles exactly:
- `.bf-page-hd` for page hero (add to Events.css since not in tokens.css)
- `.bf-tbl` for upcoming events table
- `.bf-tbl.bf-tbl-muted` for past events (muted text via `.bf-tbl-muted tr td { color: var(--ink-2); }`)
- `.bf-helper` + `.bf-helper-tag` for EventDetail info boxes
- `.bf-section-title` (or inline `<SectionTitle>` component) for section headers
- `.bf-events-counter` for empty state paragraph (already in styles.css)
- `.bf-cta` for ticket buy button on EventDetail
- Mobile table→card reflow is automatic via D1 `@media (max-width: 700px)` rules

No new CSS namespaces. No new color tokens. The bf-* system is complete for this scope.

## Architect integration check

App.jsx routes confirmed:
- `/events` → `Events.jsx` (line 24)
- `/events/:slug` → `EventDetail.jsx` (line 25)

Route uses `:slug` — EventDetail.jsx correctly calls `useParams().slug`. This is the PR #110 fix; do not change to `:id`.

EventDetail field map from adaptEventRow():
- `item.id` = slug string (use for Link href)
- `item.title` = title_zh
- `item.date` = ISO date from start_at unix seconds
- `item.endDate` = ISO date from end_at or null
- `item.location` = "city · venue" or city or venue
- `item.description` = description_md
- `item.image` = hero_image_url or null
- `item.ticketUrl` = ticket_url or ""
- `item.bands` = [band_theme] or []

Stale components to delete (verified not imported by Home.jsx or other surviving pages):
- EventCalendar — used only in Events.desktop.jsx (being deleted)
- EventFilterSheet — used only in Events.mobile.jsx (being deleted)
- EventSidebar — used only in Events.desktop.jsx (being deleted)
- EventCard — used in Events.desktop.jsx AND possibly Home.jsx — DO NOT delete without grep verification
- EventList — same — DO NOT delete without grep verification
