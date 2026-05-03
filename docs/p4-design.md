# bangdream-na — Phase 4 Design Spec (Admin Panel)

Single-source design reference for Phase 4. Audience: P4 Architect (component graph + GitHub API contracts + schema field defs), P4 Developer (DOM + behavior + edge cases + security), P4 Reviewer (Gate-4 row-by-row spec audit + on-device PAT flow + security checklist).

**Scope**: ship `/admin/*` route — a Single-Page Admin shell, separate from the main site chrome — that lets the maintainer (1 person, advanced user) edit the seven `src/data/*.json` files and upload assets to `public/<dir>/`. Saves go through the GitHub Contents API on a rolling `content-updates` branch with one open PR at a time; the user merges in GitHub web. No server-side. PAT stored in `sessionStorage` only.

**Locked decisions** (from approved plan `concurrent-giggling-micali.md` + memory):

1. **Commit mode**: branch+auto-PR (rolling `content-updates` branch, one open PR at a time, merge in GitHub web). Direct-to-`master` is **forbidden** in this admin.
2. **Admin UI is EN-only V1**. Do **not** add admin chrome strings to `i18n.json`. The admin LangToggle still works for the main site language preference (which is shared via the same `localStorage` key `bangdream-na:uiLanguage` and is read for date/locale formatting), but admin chrome itself does not translate.
3. **Asset upload is base64 PUT to repo** (not runtime upload, not third-party CDN). Goes through GitHub Contents API to `public/<dir>/`.
4. **No source code in this doc** — markdown spec only. The Architect produces signatures + skeletons; the Developer produces the React.

---

## 0. Reference deltas (admin vs portfolio's `Admin.jsx`)

`portfolio/src/pages/Admin.jsx` is the **proven baseline** the user already runs at portfolio's `/admin`. We mirror its shape and adapt where the bangdream-na project is different.

| Portfolio admin (current baseline) | bangdream-na admin (Phase 4) |
|---|---|
| 3 schemas: `posts.json` / `social.json` / `profile.json` | **7 schemas**: `events.json` / `members.json` / `news.json` / `posts.json` / `social.json` / `site.json` / `about.json` |
| Hard-coded sub-components (`PostsList`, `PostEditor`, `SocialEditor`, `ProfileEditor`) | **Schema-driven** `<AdminListView>` + `<AdminFormEditor>` rendered from `adminSchemas.js` field defs. Each schema reuses these two; only the field defs differ. |
| Asset upload: 3 fixed slots (`avatar.jpg`, `bg.jpg`, `music.mp3`) — overwrite-in-place | **Per-schema asset fields** (image / qrImage / avatar). Upload renames to `<slug>.<ext>` under the schema's asset dir. Generic Assets tab is V2-deferred. |
| Save mode: direct PUT to `master` (one commit, redeploy) | **Branch + rolling PR** mode. Save → PUT to `content-updates` branch → ensure one PR open → user merges in GitHub web → Vercel deploys post-merge. |
| Single-language UI (English) | Same — **single-language EN**, locked. |
| Token in `sessionStorage` key `gh_token` | Token in `sessionStorage` key `bangdream-na:gh_token` (namespaced). |
| Repo: `suhang56/portfolio` | Repo: `suhang56/bangdream-na` (constant in `githubApi.js`). |
| `ghPut` writes JSON file with no `branch` arg → defaults to default branch (`main`/`master`) | `ghPut` always passes `branch: 'content-updates'`. |
| No `ensurePR` / branch-state logic | New `ensureContentUpdatesBranch()` + `ensureOpenPR()` helpers in `githubApi.js`. See §5.2. |
| No nested-object editing (profile is flat) | **`<AdminJsonFallback>`** rendered for any field of type `object` / `array-of-objects` / `markdown` / `richtext`. Syntax-highlighted textarea with parse-on-blur validation. |
| Logout clears + reloads | Same. Plus: 401 from GitHub auto-logout (token expired/revoked → kick to login). |

What we keep verbatim from portfolio:

- `type="password"` PAT input + `autocomplete="off"` + `autoFocus` + Enter-to-submit
- Login screen `<details>` block listing the steps to mint a classic PAT with `repo` scope
- `flash()` ephemeral success toast (3s auto-clear)
- Sidebar layout (logo → nav buttons → logout button at bottom)
- `slugify(s)` helper (lowercased, dashes from spaces, strip non-word chars)
- `ghGet` / `ghPut` / `ghSha` / `uploadAsset` shape (we extend, not replace)

---

## 1. Admin shell layout

### 1.1 Routing

- New top-level route: `/admin` (with optional sub-tab `/admin/<schema>` — see §1.4 routing table).
- The admin shell does **not** render the main app's `<Navbar>` / `<Footer>`. It mounts under its own root layout (`<AdminLayout>`) so theme + lang context still hydrate (admin is theme-aware so brand-themed primary buttons feel native), but no public-site chrome leaks in.
- `App.jsx` route table gains a `<Route path="/admin/*" element={<AdminLayout />}>` branch; that layout's `<Outlet />` renders either `<Login>` (if no PAT) or `<AdminShell>` (if PAT). The outer `<ThemeProvider>` + `<LanguageProvider>` from `main.jsx` continue to wrap admin (they're at root above `<App>`).

### 1.2 Layout grid

```
Desktop ≥768px:
┌─────────────┬───────────────────────────────────────────────┐
│             │                                               │
│  Sidebar    │  Main content                                 │
│  240px      │  fluid                                        │
│  fixed-left │                                               │
│             │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘

Mobile <768px:
┌──────────────────────────────────────────────────────────┐
│ [☰] Admin                          [⎋ Sign out]          │  ← header bar
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Main content (full width)                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
                                                              ↑
                                                    Sidebar slides in
                                                    as drawer when ☰
                                                    tapped (overlay
                                                    backdrop, click-out
                                                    closes).
```

- Sidebar at desktop: `position: sticky; top: 0; height: 100vh;` so it stays visible while main content scrolls.
- Mobile drawer: `position: fixed; left: 0; top: 0; height: 100vh; width: min(280px, 80vw); transform: translateX(-100%);` — `transform: translateX(0)` when open. Backdrop is `position: fixed; inset: 0; background: rgba(0,0,0,0.5);` with `click → close`.
- Drawer animation honors `@media (prefers-reduced-motion: reduce)` → no transform transition (snap open/close).
- Body scroll lock when drawer open (toggle `document.body.style.overflow = 'hidden'`).

### 1.3 Sidebar contents (top-to-bottom)

```
┌─────────────────────────┐
│  Admin                  │  ← logo / wordmark (text only, "Admin")
│  bangdream-na           │  ← small subtle subtext
├─────────────────────────┤
│ ▶ Events                │  ← 7 schema buttons, active state highlights
│   Members               │
│   News                  │
│   Posts                 │
│   Social                │
│   Site                  │
│   About                 │
├─────────────────────────┤
│   View Site ↗           │  ← link to https://bangdream.org (target=_blank)
│   Open PR ↗             │  ← link to current open `content-updates` PR (or "No open PR" if none)
├─────────────────────────┤
│   Sign out              │  ← bottom-anchored
└─────────────────────────┘
```

- 7 schema buttons each as `<button>` with theme-aware active state (`background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-text); border-left: 3px solid var(--color-primary);`).
- "View Site" + "Open PR" are utility links, separated by a divider, not part of nav semantics.
- "Sign out" is `position: sticky; bottom: 0;` (or just bottom-anchored via flex-grow above) so it never scrolls out.
- Sidebar uses `<nav aria-label="Admin sections">` as wrapper for the 7 schema buttons so screen readers announce it.

### 1.4 Routing table

| Path | Renders |
|---|---|
| `/admin` | If no PAT → `<Login>`. If PAT → redirect to `/admin/events` (default landing). |
| `/admin/events` | `<EventsView>` (list + editor) |
| `/admin/members` | `<MembersView>` |
| `/admin/news` | `<NewsView>` |
| `/admin/posts` | `<PostsView>` |
| `/admin/social` | `<SocialView>` |
| `/admin/site` | `<SiteView>` |
| `/admin/about` | `<AboutView>` |
| `/admin/*` (any other) | redirect to `/admin/events` |

Each `<XxxView>` is one of:
- **Collection view** (events / members / news / posts / social): list table + per-row editor. State: `editing: T | null`.
- **Singleton view** (site / about): one form, no list.

Route changes preserve the PAT (it's in `sessionStorage`, not React state) and the loaded data caches (we re-fetch only on logout or manual refresh button per-view).

### 1.5 Login screen

Single-card centered layout. Mirrors portfolio's:

```
┌────────────────────────────────────────┐
│         Admin Panel                    │
│  Enter your GitHub Personal Access     │
│  Token to continue.                    │
│                                        │
│  [⚠ error banner if any]               │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ ghp_xxxxxxxxxxxxxxxxxxxx      │    │  ← input type=password
│  └────────────────────────────────┘    │     autocomplete=off
│                                        │     spellcheck=false
│         [   Sign In   ]                │     autoFocus
│                                        │     onKeyDown Enter → submit
│  ▸ How to get a token?                 │  ← <details> drop-down:
│                                        │     1. GitHub → Settings → Developer
│                                        │        settings
│                                        │     2. Personal access tokens (classic)
│                                        │        → Generate new token
│                                        │     3. Check the **repo** scope (full
│                                        │        control of private repos —
│                                        │        needed because PUT to Contents
│                                        │        API requires write)
│                                        │     4. Copy the token (starts with
│                                        │        `ghp_`) and paste above
│                                        │     5. The token is stored in your
│                                        │        browser's sessionStorage and
│                                        │        cleared when you close the tab
│                                        │     6. Rotate immediately if exposed:
│                                        │        Settings → Developer settings →
│                                        │        Tokens → Delete                 │
│                                        │     ↗ Open GitHub Tokens page         │  ← target=_blank
│                                        │       https://github.com/settings/tokens │
└────────────────────────────────────────┘
```

- Input: `<input type="password" autocomplete="off" spellcheck="false" autoFocus />`. **No `name=` attribute** (so password managers don't try to autofill site credentials). `placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"` to hint format.
- Submit: button + Enter key both call `login()` (trim + non-empty + write to `sessionStorage` under key `bangdream-na:gh_token`).
- Error banner: appears above input when previous attempt failed (e.g., 401 from a stale token). Sanitized message — never includes the token, never includes raw GitHub error JSON. See §6.4.
- Help `<details>` is **closed by default**.
- "Open GitHub Tokens page" link: `<a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">`.

### 1.6 Logout flow

- Sign-out button → confirm-less (no `confirm()`; the data is on GitHub already, nothing to lose locally) → `sessionStorage.removeItem('bangdream-na:gh_token')` → reset every cached data slice (events / members / news / posts / social / site / about + their SHAs + open PR number cache) to initial → navigate to `/admin` (which redirects to `<Login>`).
- Logout is also automatic on any 401 response from GitHub (see §6.4). User sees a banner "Your token expired or was revoked. Please sign in again." on the login screen post-redirect.

### 1.7 Theme + language inheritance

- The admin lives under the same `<ThemeProvider>` as the public site, so the theme key persists (e.g., maintainer using `mygo` theme on bangdream.org keeps that theme inside `/admin`).
- `<ThemeSwitcher>` is **not** rendered inside admin (deliberate — admin chrome is monochrome neutral; the band tint shows up only via `--color-primary` on save buttons + active sidebar item). The maintainer changes theme on the public site if desired.
- `<LangToggle>` is **not** rendered inside admin. Admin chrome is hardcoded EN. The lang preference still hydrates from `localStorage` (used by date formatting helpers if any inside admin — though we render dates as ISO strings in form fields, see §3 field type `datetime`).

---

## 2. Schema editor — schema-driven `<AdminListView>` + `<AdminFormEditor>`

The seven schemas all share the same two-component shape: a list/table view (or singleton form for site/about) and an edit form. Both are driven by an `adminSchemas.js` field-def registry. The Architect produces this registry; this section specifies its shape and the rendering rules.

### 2.1 Schema registry shape (logical contract — Architect produces concrete signatures)

Each schema entry exposes:

- `key` — the URL slug + sidebar label key (e.g., `'events'`).
- `label` — sidebar display string (e.g., `'Events'`).
- `kind` — `'collection'` (array of items) or `'singleton'` (one object).
- `path` — repo-relative path to the JSON file (`'src/data/events.json'`).
- `idField` — for collections, the field used as React key + edit identity (`'id'` for everything; `'platform'` for `social.json`). For singletons, omitted.
- `assetDir` — for schemas with asset fields, the `public/` subdirectory (`'public/events'`, etc.). Omitted for schemas without uploads.
- `defaultItem()` — factory returning a blank new item for collections (id auto-generated; date defaults to today; required fields stubbed empty). For singletons, omitted.
- `listColumns` — for collections, an array of `{ key, label, formatter? }` entries that the list view uses as table columns. Order matters; first column is the primary identifier shown in bold.
- `fields` — array of field defs, each with `{ key, label, type, required?, options?, hint?, validator?, asset?, readonly? }`. See §3 for the field-type catalog.
- `commitMessage(item, action)` — returns the conventional commit message string for this save (`'feat(content): add event "Spring Meetup"'`, `'chore(content): edit member alice'`, `'chore(content): delete news 2026-04-21'`). The branch+PR system uses this. See §5.3.

### 2.2 Collection list view (`<AdminListView>`)

```
┌──────────────────────────────────────────────────────────┐
│  Events                                  [+ Add new]     │  ← schema label + primary CTA
├──────────────────────────────────────────────────────────┤
│  ID         │ Title              │ Date         │        │  ← header (from listColumns)
├─────────────┼────────────────────┼──────────────┼────────┤
│  spring-2026│ Spring Meetup LA   │ 2026-05-15   │ Edit ✕ │
│  con-toronto│ Toronto Anime Con  │ 2026-06-02   │ Edit ✕ │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

- Sort: by `date` desc when a `date` or `datePosted` listColumn exists; else by insertion order (input array).
- Empty state: centered card "No events yet. **Add your first event** ↗" — clicking the inline link is equivalent to `[+ Add new]`. Same copy pattern for every collection (`No members yet`, `No news yet`, `No posts yet`).
- Row "Edit" → opens `<AdminFormEditor>` with that item pre-loaded (clones the item; editor mutates a draft copy, never the live array directly).
- Row "✕" (delete) → `confirm('Delete "<title>"?')` → on confirm, save the array minus that item via the same branch+PR flow. Title shown is the row's primary listColumn value. Disabled while a save is in flight.
- Disabled state: while any row is saving, all Edit/✕/Add buttons disable to prevent concurrent edits. (Single-tab user; this is belt-and-suspenders. Multi-tab is out-of-scope V1.)

### 2.3 Singleton form view (no list, just `<AdminFormEditor>` mounted directly)

For `site.json` and `about.json` — kind=`'singleton'`. The editor mounts straight away with the loaded object. Top of view: schema label + a `[Save]` button. No "+ Add new". Save writes the (possibly mutated) object back. Reset/Discard button reloads from the cached SHA copy.

### 2.4 Editor form (`<AdminFormEditor>`)

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Events                          Edit event    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ID                                                      │
│  ┌──────────────────────────────────────┐                │
│  │ spring-2026                  [readonly]│              │  ← readonly auto-id field
│  └──────────────────────────────────────┘                │
│                                                          │
│  Title *                                                 │
│  ┌──────────────────────────────────────────────┐        │
│  │ Spring Meetup LA                             │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Date *                                                  │
│  ┌──────────────────────────┐                            │
│  │ 2026-05-15T18:00          │  ← datetime-local         │
│  └──────────────────────────┘                            │
│                                                          │
│  Type *                                                  │
│  ┌──────────────────────────┐                            │
│  │ concert            ▼      │  ← select(enum)           │
│  └──────────────────────────┘                            │
│                                                          │
│  Location (object — JSON)                                │
│  ┌──────────────────────────────────────────────┐        │
│  │ {                                             │       │  ← AdminJsonFallback
│  │   "city": "Los Angeles",                      │       │     monospace, pretty-printed
│  │   "venue": "Aratani Theatre"                  │       │     parse-on-blur, red-border
│  │ }                                             │       │     when invalid
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Image                                                   │
│  ┌──────────────────────────────────────────────┐        │
│  │ /events/spring-2026.png                      │       │  ← url + asset uploader inline
│  └──────────────────────────────────────────────┘        │
│  [Drag image here, or click to upload]                   │
│                                                          │
│  ...                                                     │
│                                                          │
│  ┌──────────────────────────┐ ┌──────────┐               │
│  │   Save (commit + PR)     │ │  Cancel  │               │
│  └──────────────────────────┘ └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

- "← Back to Events" — text link top-left, returns to list view (clears editing draft; if dirty, `confirm('Discard unsaved changes?')`).
- Title: "Edit event" (existing item) or "New event" (added item). Singular noun (Architect adds `singularLabel: 'event'` to schema entry).
- Field order matches `fields` registry order. Required fields (`required: true`) display ` *` after the label.
- Save button label: `Save (commit + PR)` to be explicit about what happens. Disabled when:
  1. Saving in flight, or
  2. Any required field is empty, or
  3. Any JSON-fallback field is in error (failed parse-on-blur), or
  4. Any `url` field has invalid value (failed `https://` validator).
- Cancel button: identical to Back link (asks if dirty).
- Validation errors show inline below the bad field, in `color: var(--color-error, #d33)` text + red `border` on the input (`outline-color`-style red, not `border-radius`-breaking). Error message is human (e.g., `Title is required`, `URL must start with https://`, `Invalid JSON: Unexpected token } at line 4`).
- Input change handlers update the local draft state; nothing writes to GitHub until Save.

### 2.5 New-item flow

- `[+ Add new]` from list → `<AdminFormEditor>` mounts with `defaultItem()` output. ID is auto-generated (`Date.now().toString()` for collections that allow auto-id, OR a `slugify(title)`-based id deferred to first-save for events/members/news/posts where a stable slug is preferred). For social, the ID set is fixed (5 platforms) — adding new is **disabled** (the `[+ Add new]` button hides for social; see §4.5).
- Auto-id strategy per schema (Architect codifies):
  - events / news / posts: id = `slugify(title)` if title set at save time + uniqueness check (append `-2`, `-3`, … if collision); fallback `event-<Date.now()>` if no title.
  - members: id = `slugify(name)` with same uniqueness suffix; fallback `member-<Date.now()>`.
  - social: id is the `platform` enum value; cannot be added or removed.
  - site / about: singleton — no id concept.
- New-item save: append to array (or update singleton), then run the same branch+PR save flow.

### 2.6 Edit-existing-item flow

- Editor draft state seeds from a deep-clone (`JSON.parse(JSON.stringify(item))`) of the source item. Mutating the draft never affects the cached array.
- On save, replace the array entry where `idField` matches; if the editor changed the id (rare — id fields are mostly readonly), match the original id (we capture it on edit-open).
- If the SHA on the server is now newer than what we hold (concurrent edit elsewhere), see §5.4 stale-SHA handling.

---

## 3. Field type catalog

The exhaustive set of `type` values supported by `<AdminFormEditor>`. Architect's job: implement renderers per type. Developer's job: render correctly + validate.

| Type | Input element | Validator | Notes |
|---|---|---|---|
| `text` | `<input type="text">` | required if `required: true` (non-empty trim) | Free text. |
| `textarea` | `<textarea rows={4}>` | same as text | Free multi-line text. |
| `markdown` | `<textarea rows={12} class="font-mono">` | same as text | Markdown body. **No live preview in V1** (deferred to V2). Hint below: `Plain markdown — use ## for headings, blank line for paragraphs.` |
| `number` | `<input type="number">` | optional `min` / `max` from `options` | Stored as JS number. |
| `select` | `<select>` | required behavior; value must be in `options.choices` | `options.choices = [{ value, label }]`. First option `<option value="" disabled hidden>{placeholder}</option>` when no value selected and field is required. |
| `datetime` | `<input type="datetime-local">` | parses to ISO 8601 (with timezone — append local `:00` seconds + `Z` if user input has none) | Stored as ISO string. Architect provides `localToIso(localStr)` + `isoToLocal(iso)` helpers. Empty allowed only when not required. |
| `date` | `<input type="date">` | parses to `YYYY-MM-DD` | Stored as ISO date (no time). |
| `boolean` | `<input type="checkbox">` | always valid (true or false) | Default false. |
| `url` | `<input type="url">` | must start with `https://` (case-insensitive) when non-empty; required-empty → invalid if `required: true` | Allows trailing slash, no other normalization. http://, javascript:, data: → rejected. |
| `asset` | `<input type="text" readonly>` showing the path + `<AssetUploader>` below | required: non-empty path | Path is server-relative (`/events/foo.png`). The text input is read-only — uploads write to it via the uploader. Manual editing supported via a small "Edit path" toggle (in case maintainer wants to reference a path without re-uploading). |
| `json` | `<AdminJsonFallback>` | `JSON.parse` on blur; required behavior: non-empty after parse | Renders for `object`, `array of objects`, or any field the schema marks complex. Pretty-prints input on first mount; user edits the textarea; on blur it tries parse — green border or red border + error. |
| `readonly-text` | `<input type="text" readonly>` | n/a | For id fields and locked brand strings (see site.json `communityName`). Renders greyed. |

Each rendered field is wrapped in `<label>` + a `<div class="admin-field">` with help-text slot (`hint` from registry, or none).

### 3.1 `<AdminJsonFallback>` detail

```
┌──────────────────────────────────────────────────┐
│  Location (object — JSON)                        │  ← label + format hint
│  ┌────────────────────────────────────────────┐  │
│  │ {                                           │  │  ← <textarea> monospace
│  │   "city": "Los Angeles",                    │  │     onBlur → JSON.parse
│  │   "venue": "Aratani Theatre"                │  │     onChange → update local string
│  │ }                                           │  │
│  └────────────────────────────────────────────┘  │
│  ✓ Valid JSON                                    │  ← state line below
└──────────────────────────────────────────────────┘
```

- Stores **two** local state slices: `text: string` (the raw textarea content) and `parsed: T | undefined` (the last-successful parse result). Save reads `parsed`, not `text` — if `parsed` is stale (text has been edited and not re-blurred), the form forces a blur first.
- On mount: `text = JSON.stringify(initialValue, null, 2)`, `parsed = initialValue`.
- On blur: try `JSON.parse(text)`; on success → update `parsed`, set border-state `valid`, status line `✓ Valid JSON`; on fail → set border-state `invalid`, status line `✗ Invalid JSON: <error.message>` (e.g., `Unexpected token } in JSON at position 47`).
- Save button: disabled (form-level) when any json-fallback field is in `invalid` state.
- Required+empty: status line `✗ Required` if the parsed value is `null` / `undefined` / `[]` / `{}` and `required: true`.
- Visual: red border via `border-color: var(--color-error)`; valid state has subtle green-tinted border `border-color: color-mix(in srgb, var(--color-success, #2a8) 60%, var(--color-border))`.
- Tab key inserts two spaces inside the textarea (don't escape focus mid-edit).

### 3.2 `<AssetUploader>` detail (per-field, inline)

```
┌─────────────────────────────────────────────────┐
│  Image                                          │
│  /events/spring-2026.png         [Edit path]    │  ← path field readonly + toggle
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │      ⬆                                  │    │  ← drop-zone
│  │      Drag image here, or click to upload│    │     hover → primary-tinted bg
│  │      png · jpg · webp · svg · ≤5MB      │    │     dragging → solid primary border
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [Preview thumbnail of current value, if any]   │  ← <img src> with cache-bust ?v=<ts>
└─────────────────────────────────────────────────┘
```

Behavior detail in §4.

---

## 4. Per-schema field map

For each schema, the exhaustive `fields` registry list. **Order in this section is the order fields render in `<AdminFormEditor>`**.

### 4.1 events.json (collection, idField=`id`, assetDir=`public/events`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `readonly-text` | yes | Auto-generated from `slugify(title)` at first save. After that, locked. Hint: "Stable identifier — never change after save." |
| `title` | `text` | yes | The event's display title. |
| `date` | `datetime` | yes | ISO 8601 with timezone. Picker uses local-time UI; saved as `<localISO>:00<offset>` (e.g., `2026-05-15T18:00:00-07:00`). |
| `location` | `json` | yes | Object: `{ city: string, venue: string, address?: string, mapUrl?: string }`. Hint: "City + venue minimum. address and mapUrl optional." |
| `type` | `select` | yes | choices = `concert` / `fanmeet` / `con` / `online` (note: lib `events.js` typedef says `concert/fanmeet/con` — we **add `online`** for online-only events, per task description; Architect updates the typedef union). |
| `description` | `textarea` | yes | Plain text, ~3-6 lines. |
| `bands` | `json` | no | Array of strings — band keys. Hint: "Array of band keys: neutral, roselia, popipa, mygo, morfonica, afterglow, pastel, hhw. Example: `[\"roselia\", \"mygo\"]`." |
| `links` | `json` | no | Array of `{ label: string, url: string }`. Hint: "Array of `{label, url}` objects." |
| `image` | `asset` | no | Banner image. Path written to `/events/<id>.<ext>`. |
| `ticketUrl` | `url` | no | https://. |

`commitMessage(item, action)`:
- `'add'` → `feat(content): add event "${title}"`
- `'edit'` → `chore(content): edit event "${title}"`
- `'delete'` → `chore(content): delete event "${title}"`

`listColumns`: `[{ key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }, { key: 'date', label: 'Date', formatter: dateFmt }, { key: 'type', label: 'Type' }]`. Sort: by `date` desc.

### 4.2 members.json (collection, idField=`id`, assetDir=`public/members`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `readonly-text` | yes | `slugify(name)` at first save. |
| `name` | `text` | yes | Display name. CJK or ASCII. |
| `pronouns` | `text` | no | E.g., "she/her", "他/他". |
| `role` | `select` | yes | choices = `organizer` / `member` / `alumnus` / `cover-band-lead`. (Aligned with `i18n.json` `role.coverBandLead` key.) |
| `oshiBand` | `select` | no | choices = `neutral` / `roselia` / `popipa` / `mygo` / `morfonica` / `afterglow` / `pastel` / `hhw`. (`pastel` = Pastel*Palettes; `hhw` = Hello, Happy World!) |
| `oshiCharacter` | `text` | no | Free text — character display name (e.g., "Yukina"). |
| `city` | `text` | no | E.g., "Los Angeles", "Toronto". |
| `coverBand` | `text` | no | If member is in a cover band — the cover band's name. |
| `coverBandRole` | `text` | no | E.g., "Vocal", "Guitar". Empty when no cover band. |
| `bio` | `textarea` | no | Free-text bio. |
| `socials` | `json` | no | Array of `{ platform: string, url: string }`. Hint: "Array of `{platform, url}` objects. platform values: discord, x, instagram, youtube, tiktok, xiaohongshu, bilibili, weibo." |
| `avatar` | `asset` | no | Path written to `/members/<id>.<ext>`. |

`commitMessage`:
- `add` → `feat(content): add member ${name}`
- `edit` → `chore(content): edit member ${name}`
- `delete` → `chore(content): delete member ${name}`

`listColumns`: `[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'oshiBand', label: 'Oshi' }, { key: 'city', label: 'City' }]`. Sort: by `name` asc (locale-aware, mirrors `lib/members.js sortMembersByName`).

### 4.3 news.json (collection, idField=`id`, assetDir=`public/news`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `readonly-text` | yes | `slugify(title)` at first save. |
| `date` | `datetime` | yes | ISO 8601. |
| `title` | `text` | yes | News headline. |
| `category` | `select` | yes | choices = `announcement` / `release` / `event` / `community` / `media`. (Note: lib `news.js` typedef has `community`; task description had `media` — we keep all five for forward-compat. Architect updates typedef.) |
| `body` | `markdown` | yes | News body, markdown. |
| `image` | `asset` | no | Lead image. Path written to `/news/<id>.<ext>`. |

`commitMessage`:
- `add` → `feat(content): add news "${title}"`
- `edit` → `chore(content): edit news "${title}"`
- `delete` → `chore(content): delete news "${title}"`

`listColumns`: `[{ key: 'date', label: 'Date', formatter: dateFmt }, { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' }]`. Sort: by `date` desc.

### 4.4 posts.json (collection, idField=`id`, assetDir=`public/posts`)

The Phase 6 carousel data file. Tightly scoped: image-driven banner posts.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `readonly-text` | yes | `post-<Date.now()>` at create (no title-based slug because `title` is optional). |
| `image` | `asset` | **yes** | Banner image. Path written to `/posts/<id>.<ext>`. **Required** — empty image is invalid. |
| `title` | `text` | no | Optional title overlay on the carousel card (per P6 spec §1). |
| `url` | `url` | no | Optional external link the card links to (xhs/X/etc.). Must be https://. |
| `datePosted` | `datetime` | yes | Used for chronological ordering in the carousel. |

`commitMessage`:
- `add` → `feat(content): add post ${id}` (or `${title}` if set, else id)
- `edit` → `chore(content): edit post ${id}`
- `delete` → `chore(content): delete post ${id}`

`listColumns`: `[{ key: 'id', label: 'ID' }, { key: 'title', label: 'Title' }, { key: 'datePosted', label: 'Posted', formatter: dateFmt }, { key: 'url', label: 'Link' }]`. Sort: by `datePosted` desc.

### 4.5 social.json (collection, **fixed 5 entries**, idField=`platform`, assetDir=`public/social`)

The shape is locked: 5 entries, one per platform, in fixed order. The admin **disables** Add and Delete on this view. Edit-only.

| Field | Type | Required | Notes |
|---|---|---|---|
| `platform` | `readonly-text` | yes | One of: `discord`, `qq`, `xiaohongshu`, `x`, `wechat`. Locked. Acts as id. |
| `label` | `text` | yes | Display label (`Discord`, `QQ群`, `小红书`, `X`, `微信`). |
| `url` | `url` | no | Optional — if empty, platform shows as "Coming soon" disabled tile per Phase 6 PlatformTileRow spec. wechat typically empty + qrImage instead. |
| `qrImage` | `asset` | no | QR code image path. Mainly for `wechat`. Path written to `/social/<platform>-qr.<ext>`. |
| `enabled` | `boolean` | no | Default true. When false, the tile doesn't render in the public site. Use for temporarily hiding a platform. |

`commitMessage`:
- `edit` → `chore(content): edit social ${platform}`

(No add / delete commit messages — those flows are disabled.)

`listColumns`: `[{ key: 'platform', label: 'Platform' }, { key: 'label', label: 'Label' }, { key: 'url', label: 'URL' }, { key: 'enabled', label: 'Enabled' }]`. Sort: insertion order (the locked 5-platform order). View also hides the `[+ Add new]` button and the row `✕` delete button.

### 4.6 site.json (singleton)

```
{
  "discordInvite": "https://discord.gg/...",
  "communityName":   "BanG Dream North America Chinese Community",
  "communityNameZh": "北美炸梦同好会",
  "communityNameJp": "バンドリ北米華人コミュニティ"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `discordInvite` | `url` | yes | Primary Discord invite. |
| `communityName` | `readonly-text` | yes | **Locked brand identity**. The admin renders this read-only with hint: "Locked — community brand identity. Change requires direct repo edit." |
| `communityNameZh` | `readonly-text` | yes | Locked. Same hint. |
| `communityNameJp` | `readonly-text` | yes | Locked. Same hint. |

(Note: the task description listed `communityName*` as readonly-text but the file is otherwise editable, so they show in the form as visibly-greyed inputs. If the maintainer truly wants to change them, they edit `site.json` directly in GitHub.)

(Note: `tagline` was moved to `i18n.json` in Phase 6 — admin does not surface tagline editing here. If the maintainer wants to retranslate, they edit `i18n.json` directly. Admin does **not** open the tri-lingual chrome translation can-of-worms in V1 — see §0 lock decision 2.)

`commitMessage`:
- `edit` → `chore(content): edit site config`

### 4.7 about.json (singleton)

| Field | Type | Required | Notes |
|---|---|---|---|
| `mission` | `textarea` | yes | Multi-line mission statement. |
| `history` | `textarea` | yes | Multi-paragraph history. |
| `faq` | `json` | yes | Array of `{ q, a }`. Hint: "Array of `{q, a}` objects. Example: `[{\"q\": \"How do I join?\", \"a\": \"Click the Discord button.\"}]`." |
| `coc` | `markdown` | yes | Code of Conduct, markdown. |
| `joinInstructions` | `markdown` | yes | Numbered-list-style markdown. |

`commitMessage`:
- `edit` → `chore(content): edit about page`

---

## 5. Asset uploader UX + commit/PR mode

### 5.1 Asset uploader behavior (within `<AssetUploader>`, called from each `asset` field)

1. **Trigger**: drop a file onto the dropzone, or click → opens `<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>`.
2. **Client-side validation**:
   - File size: warn if `> 5 MB` — show error inline `File too large (5.7 MB). Max 5 MB.` Save uploads ≤5MB only. (GitHub Contents API allows up to 100MB, but base64 inflation + browser memory + git LFS-ish concerns make 5MB a sensible cap.)
   - MIME / extension: must be `.png`, `.jpg`, `.jpeg`, `.webp`, or `.svg`. Reject everything else with `Unsupported file type. Allowed: png, jpg, webp, svg.`
   - Filename: ignored from the user — we generate the new filename from the schema's `idField` value (current draft) and the file's extension (lowercased).
3. **Filename slug derivation**: `${slugify(currentItem.id)}.${ext}` for collections, OR `${slugify(currentItem[fieldKey])}.${ext}` for special cases like social.qrImage (which uses `${platform}-qr.${ext}`). For the rare new-item case where `id` is not yet set, use a temporary `pending-<Date.now()>.${ext}` and the path is finalized when the item saves (the path is written into the JSON at save time).
4. **Upload flow** (inside `<AssetUploader>`):
   - Read file as base64 via `FileReader.readAsDataURL`.
   - Strip data URL prefix (`data:image/png;base64,`).
   - Call `ghPutAsset({ path: 'public/<assetDir>/<slug>.<ext>', base64, branch: 'content-updates', message: 'chore(asset): upload <slug>.<ext>' })`. See §5.2 for the branch contract.
   - On 200/201: write the `/<assetDir>/<slug>.<ext>` path back into the form draft via `onChange(path)`. Show success toast: `✓ Image uploaded (will appear after PR merges).`
   - Cache-bust the preview thumbnail with `?v=<Date.now()>`.
5. **Progress / spinner**: dropzone replaces its label with `<Spinner /> Uploading…` for the duration of the request. Disable other inputs while uploading? **No** — only the dropzone disables; user can keep typing. (Saves under stress are the form's problem, not the uploader's.)
6. **Errors**: surface with red banner inline below the dropzone. Common errors:
   - 403 `Resource not accessible by integration` → `Token lacks repo write permission. Check PAT scope.`
   - 422 `sha … does not match` (overwriting an existing asset that changed since fetch) → `An existing asset at this path was changed elsewhere. Refresh the page and try again.`
   - 404 → `Repository or path not found. (Check that public/<assetDir>/ exists.)` (we ship empty `.gitkeep` files in each assetDir at scaffold time so this never fires for new repos — Architect adds these.)
   - Network → `Upload failed: network error. Try again.`
   - All errors **never include the Authorization header** in their displayed message (see §6).
7. **Sequence after successful upload**:
   - The asset is committed to `content-updates` branch (NOT main).
   - The form's `image` (or `qrImage` / `avatar`) field now holds the new path.
   - The user must still click "Save (commit + PR)" on the form to commit the JSON change pointing at this asset.
   - **Important**: a user who uploads then closes without saving leaves an orphan asset in the branch. This is fine — orphan assets are harmless and the next save will live alongside them. Cleanup happens manually if ever needed (no V1 cleanup tooling).

### 5.2 Branch + PR commit contract (`ensureContentUpdatesBranch`, `ensureOpenPR`)

Reusable across every save in §5.3.

#### `ensureContentUpdatesBranch(token, repo)`

1. `GET /repos/:repo/branches/content-updates` → if 200, branch exists, return its head SHA.
2. If 404, the branch doesn't exist. Get the default branch's head SHA: `GET /repos/:repo` → `default_branch`; `GET /repos/:repo/git/refs/heads/<default_branch>` → `object.sha`.
3. Create `content-updates` from default branch SHA: `POST /repos/:repo/git/refs` with `{ ref: 'refs/heads/content-updates', sha: <defaultSha> }`.
4. Return the new branch's head SHA.

The ghGet/ghPut helpers in `githubApi.js` accept an optional `ref` / `branch` parameter. Admin always passes `'content-updates'`.

#### `ensureOpenPR(token, repo)`

1. `GET /repos/:repo/pulls?state=open&head=:owner:content-updates&base=<default_branch>` → if length ≥1, PR exists; return its number + html_url.
2. If length 0, open one: `POST /repos/:repo/pulls` with:
   - `title: 'Content updates'`
   - `head: 'content-updates'`
   - `base: <default_branch>`
   - `body: 'Rolling content edits from /admin. Merge to publish.\n\nGenerated by bangdream-na admin panel.'`
3. Return the new PR's number + html_url.

Cache the open-PR number in admin state for the session (refreshes on each save and on logout).

#### Diverged branch fallback

If `content-updates` exists but is not based on the latest default branch (i.e., the default branch advanced after the last admin save), the next push to `content-updates` may need to merge or rebase. **V1 simplification**: we don't auto-merge. We just push to `content-updates` head — GitHub allows non-fast-forward content commits via the Contents API (each call provides the file's current SHA on that branch). If the target file on `content-updates` differs from `master`, that's *expected* (it's the in-flight edit). Cross-file conflicts on merge are user's concern at PR-merge time. Architect documents this caveat in `githubApi.js`.

#### Branch-deleted-after-merge

After a maintainer merges the PR in GitHub web, GitHub's "Delete branch" button (if clicked) removes `content-updates`. The next admin save handles this transparently: `ensureContentUpdatesBranch` recreates it from the now-newer default branch. The next `ensureOpenPR` opens a fresh PR. The previous open PR cache in admin state is stale → save flow re-resolves.

### 5.3 Save flow — `<AdminFormEditor>` `Save` button click → end

1. **Pre-validate**: local field validation (required / url / json-parse). If any fail, abort + highlight inline errors.
2. **Disable form** + show `Saving…` on Save button.
3. **Branch ensure**: `await ensureContentUpdatesBranch(token, REPO)`. On any error → error banner, re-enable.
4. **Build new content**:
   - For collections: clone the cached array, apply the edit (replace by id, append for add, remove by id for delete), `JSON.stringify(arr, null, 2) + '\n'` (trailing newline matches existing files).
   - For singletons: replace the singleton, same stringify.
5. **Resolve current SHA on `content-updates` branch**: `ghGet(token, path, { ref: 'content-updates' })`. If file missing on branch (first edit before any commit), `ghGet` from default branch. Cache the resulting SHA.
6. **PUT contents**: `ghPut(token, path, content, { sha, branch: 'content-updates', message: schema.commitMessage(item, action) })`.
7. **Stale-SHA path**: if PUT returns 409 `sha-mismatch` → `ghGet(path, ref='content-updates')` → diff: if our local content (pre-edit) === remote content, retry with new SHA (someone else just committed something else, our edit is still safe to land); else, show `<StaleConflictDialog>` (see §5.4).
8. **Open PR ensure**: `await ensureOpenPR(token, REPO)`. Cache PR number + url.
9. **Update local cache**: replace cached array/singleton + SHA + PR number.
10. **Toast success**: `✓ Saved → PR #<n> open. [View on GitHub →](<pr_url>)` for 5 seconds (longer than default 3s because the link is actionable).
11. **Re-enable form**, return list view (collections) or stay on form (singletons).

### 5.4 Stale-SHA conflict dialog (`<StaleConflictDialog>`)

When the SHA on `content-updates` is newer than what the admin held, AND the remote content differs from the admin's pre-edit baseline (genuine concurrent edit):

```
┌──────────────────────────────────────────────┐
│  ⚠ Out-of-date                                │
│                                              │
│  The data on GitHub changed since you        │
│  loaded this page (someone else may have     │
│  edited via /admin or directly on GitHub).   │
│                                              │
│  Your changes have NOT been saved.           │
│                                              │
│  ┌──────────────────────┐ ┌────────────────┐ │
│  │  Discard & Refresh   │ │  Cancel        │ │
│  └──────────────────────┘ └────────────────┘ │
└──────────────────────────────────────────────┘
```

- "Discard & Refresh" → re-fetches the schema from `content-updates`, drops the local draft, returns to list view.
- "Cancel" → closes the dialog; the form keeps the user's edits but stays in the dirty state. The user can copy their edits out manually if they want, then refresh themselves later.
- We **never** force-overwrite. No "force save" option. (Designed-in safety per task description: "never force-overwrite".)

### 5.5 PR Open visibility

Sidebar's `Open PR ↗` link:
- Shows `Open PR ↗` when an open PR exists. Clicking opens its `html_url` in a new tab.
- Shows `No open PR` greyed out when none. Tooltip: "A PR opens automatically on your next save."
- Updates after every save (Architect updates a context value `openPRNumber + openPRUrl`).
- Sidebar also re-fetches PR state on schema-view mount (fire-and-forget; cheap, gives accurate state on tab return).

---

## 6. Security checklist

This list IS the Reviewer Gate-4 security audit. Every item maps to a concrete impl check.

### 6.1 PAT input handling

- [S1] Login input: `<input type="password" autocomplete="off" spellcheck="false">`. **No `name=` attribute** to dissuade password-manager autofill of unrelated site credentials.
- [S2] Token stored in `sessionStorage` under key `bangdream-na:gh_token`. Cleared automatically on tab close (sessionStorage default lifetime).
- [S3] Token **never written to `localStorage`** anywhere. (Reviewer greps the code: `grep -i 'gh_token' src/` — every match must be `sessionStorage`, not `localStorage`.)
- [S4] Token cleared on Logout button (`sessionStorage.removeItem`) + on 401 from any GitHub call (auto-logout). Logout reloads to `/admin/` (login screen).
- [S5] Token never appears in URL, query string, hash fragment, or referrer. Admin uses `fetch` only — no `<form action>` posts.

### 6.2 Logging hygiene

- [S6] **No `console.log` of the token, headers object, or fetched response with auth**. Reviewer greps: `grep -E 'console\.(log|debug|info|warn|error)' src/admin/` — every match is read for whether it could leak the token. Approved: error messages without auth headers. Forbidden: `console.log(headers)`, `console.error(err)` where err contains a request that has Authorization.
- [S7] No `localStorage.setItem` on any debug data — even hashed/redacted token MUST NOT persist anywhere except sessionStorage.
- [S8] No analytics / Sentry / third-party telemetry imports inside `src/admin/`. Admin is local-only. (Reviewer checks imports.)

### 6.3 Sanitized error surfaces

- [S9] Every fetch wrapper (`ghGet` / `ghPut` / `ghPutAsset` / `ghCreateBranch` / `ghEnsurePR` / `ghCreatePR`) catches errors and **re-throws a sanitized error**: `throw new Error(safeMsg)` where `safeMsg` is one of:
  - The GitHub `message` field from `await res.json()` (which never includes the token by GitHub's own design)
  - A static phrase: `Network error`, `Unauthorized — token expired or revoked`, `Repository not found`, `File too large`, etc.
  - The raw response body is **never** spread into the error message; never log the request headers.
- [S10] Error banners in UI render only the sanitized error message. Reviewer scans the rendered DOM for any string starting with `Bearer `, `token `, or `ghp_`.

### 6.4 401 → auto-logout

- [S11] Any GitHub fetch returning 401 triggers a global handler: clear `sessionStorage`, set state `expiredTokenBanner: true`, navigate to `/admin/` (login screen). The login screen reads `expiredTokenBanner` and shows: `Your token expired or was revoked. Please sign in again.` Then clears the flag on next successful login.
- [S12] 403 with `message: 'Bad credentials'` is **also** treated as auto-logout (some PATs return 403 not 401 when revoked).

### 6.5 PAT scope documentation

- [S13] Login screen `<details>` block explicitly says: "Check the **repo** scope (full control of private repositories — required because the admin commits and uploads files)". Lists steps 1-6 verbatim in §1.5.
- [S14] Token rotation guidance included in step 6: "Rotate immediately if exposed: GitHub Settings → Developer settings → Tokens → Delete."

### 6.6 No token in URL/query/referrer

- [S15] All API calls use `fetch(API_URL, { headers: { Authorization: 'token <PAT>' } })`. Token in **header** only. No `?token=…` query param. No `<a href>` carries it.
- [S16] Outbound links (View Site, Open PR, GitHub Tokens page) use `target="_blank" rel="noopener noreferrer"`. The `noreferrer` strips the Referer header so even the path of the admin page doesn't leak.

### 6.7 sessionStorage scope

- [S17] sessionStorage is per-tab. Closing tab → token gone. Reviewer manually verifies: open `/admin`, log in, close tab, reopen → login screen, no auto-relogin.

### 6.8 Reviewer deliverable

- Reviewer fills out a `## Security audit` section in their review with line items [S1]…[S17] each marked `[OK]` or `[BLOCK]`. Any `[BLOCK]` blocks Phase 4 ship.

---

## 7. Layout + responsive

### 7.1 Desktop ≥768px

- Sidebar: `width: 240px; position: sticky; top: 0; height: 100vh;` left side.
- Main content: `margin-left: 240px; padding: 2rem clamp(1rem, 4vw, 3rem);`.
- Forms: max-width `720px`, centered inside main content.
- List tables: full main-content width.
- Drop-zones: full form-row width (matching input widths).

### 7.2 Tablet 540-767px

- Sidebar collapses to drawer mode (same as mobile).
- Header bar appears: `height: 56px; background: var(--color-surface); border-bottom: 1px solid var(--color-border);` with `[☰] Admin` left + `[⎋ Sign out]` right.
- Forms: max-width `min(560px, calc(100vw - 2rem))`.

### 7.3 Mobile <540px

- Same drawer + header as tablet.
- Forms: `padding: 1rem; max-width: 100%;`.
- List tables: scroll horizontally OR collapse to `<dl>` definition lists per row (Architect picks; either is acceptable). Recommended: full-width cards stacked, no table on mobile.
- Drop-zones: full width.

### 7.4 Reduced motion

- Drawer slide animation: skipped under `@media (prefers-reduced-motion: reduce)` (instant open/close).
- Toast fade animation: same — instant show/hide.
- Save button "Saving…" state: don't animate the spinner; render a static character `⏳` instead.

### 7.5 Theme tinting

- Only **one** theme-tinted element in admin: the primary action color (`Save`, active sidebar tab, focus ring).
- Everything else (sidebar bg, form bg, borders, text) uses neutral tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-border`).
- All 8 themes must remain readable. Reviewer cycles through themes at `/admin/events` once during gate-4 review.

---

## 8. Edge cases for Developer

| # | Case | Behavior |
|---|---|---|
| E1 | Empty list (no items in any collection) | Center-aligned empty card: `No events yet.` + primary button `+ Add your first event`. (Same pattern for members/news/posts.) |
| E2 | Network failure mid-save | Error toast: `Save failed: <safe message>. [Retry]`. The form draft is preserved — clicking Retry replays the save with the same draft. No data loss. |
| E3 | Network failure mid-asset-upload | Error banner inside dropzone: `Upload failed: <safe message>.` Form's `image` field stays at its previous value. User can retry. |
| E4 | PAT expired/revoked (401 from any call) | Auto-logout per §6.4. Banner on next login screen. |
| E5 | PAT lacks `repo` scope (403 `not accessible by integration`) | Sanitized banner: `Token lacks repo write permission. Check PAT scope at GitHub Settings.` Stay logged in (the user might just need to mint a new token). |
| E6 | Concurrent edit (sha mismatch + content diff) | `<StaleConflictDialog>` per §5.4 — Discard & Refresh, or Cancel + manual copy-paste. Never force. |
| E7 | Save while another save in flight | Save button disabled during in-flight save. Other forms locked too via context flag (form-level only — list view buttons stay enabled to allow nav between schemas mid-save? **No** — lock the whole admin during a save to keep it simple). |
| E8 | Validation error in JSON fallback | Red border + `✗ Invalid JSON: <reason>`. Save button disabled until all json fields are valid. |
| E9 | Validation error in url field | Red border + `URL must start with https://` inline. Save disabled. |
| E10 | Required field empty | Red border on field + `<field-label> is required` inline. Save disabled. |
| E11 | Asset upload >5MB | Inline error in dropzone: `File too large (5.7 MB). Max 5 MB.` Upload aborted before the fetch. |
| E12 | Asset wrong type | Inline error: `Unsupported file type. Allowed: png, jpg, webp, svg.` Upload aborted. |
| E13 | Asset upload race (two uploads to same path) | Second upload sends without sha → 422; admin retries the upload one time with the now-current sha (pull-update-push pattern); on second 422 surfaces error. |
| E14 | User pastes a token starting with whitespace | `tokenInput.trim()` before save. (Mirrors portfolio.) |
| E15 | User reloads `/admin/events` mid-edit | Draft is in React state, not persisted → lost. **By design.** Form has a `dirty` flag; if dirty, `window.onbeforeunload` shows the browser's "leave site" prompt. |
| E16 | Toast spam (multiple saves in quick succession) | Each save replaces the active toast. Single toast slot. |
| E17 | List view sorted by date desc; user adds an undated entry | `dateFmt` returns `(no date)` for items missing `date`. Such items sort to the end (mirrors `lib/events.js` malformed-date behavior). |
| E18 | Markdown body is empty + required | Error inline: `Body is required`. |
| E19 | User edits singleton then navigates to another sidebar tab | Same as E15: `confirm('Discard unsaved changes?')` if dirty. Cancel keeps user on current view. |
| E20 | GitHub branch protection rules block direct push to default branch | Not our problem — admin pushes to `content-updates`, not default. (Defensive: Reviewer sanity-checks that `master` push is impossible from admin code paths.) |
| E21 | Rolling PR description gets stale (many commits in PR over time) | Acceptable for V1. PR title stays `Content updates`. Body never updates. User reviews commits in GitHub web. |
| E22 | Maintainer manually deletes `content-updates` branch in GitHub web while logged in | Next save's `ensureContentUpdatesBranch` recreates it from default branch. Transparent. |
| E23 | Maintainer renames default branch (e.g., `master` → `main`) | `ensureContentUpdatesBranch` resolves default via `GET /repos/:repo` → `default_branch`. Resolves dynamically. No hard-code. |
| E24 | `posts.json` is `[]` and user clicks Add new with image required | Form blocks Save until image is uploaded. Asset upload writes to branch immediately; form save writes the JSON entry. Two-step but handled. |

---

## 9. Localization scope

- Admin chrome is **EN-only V1**. Strings are hardcoded as JSX literals in admin components.
- Reviewer audit point: **no admin component reads from `i18n.json`** (except maybe a date formatter that uses `uiLanguage` for locale, which is a soft-dependency, not chrome translation).
- **Acceptance**: `grep "from '../../i18n'" src/admin/` and `grep "useT(" src/admin/` return no matches in admin source.
- Date formatting: use `Intl.DateTimeFormat(uiLanguage === 'zh' ? 'zh-CN' : 'en-US', { ... })` for human-readable date display in list columns. List column header labels are still EN (e.g., `Date`, not `日期`).
- The locked tri-lingual `communityName{,Zh,Jp}` fields in `site.json` are **content data** that the admin displays; they are not chrome — the EN-only rule does not apply to them, they show as their Chinese / Japanese stored values.

---

## 10. Acceptance for Reviewer Gate-4 (row-by-row spec audit)

Reviewer runs through this matrix; every item must pass.

### 10.1 Shell

| ID | Check |
|---|---|
| A1 | `/admin` route renders `<Login>` when no token in `bangdream-na:gh_token` sessionStorage key. |
| A2 | `/admin` redirects to `/admin/events` after successful login. |
| A3 | Sidebar shows 7 schema buttons in order: Events, Members, News, Posts, Social, Site, About. |
| A4 | `View Site ↗` opens `https://bangdream.org` in new tab with `rel="noopener noreferrer"`. |
| A5 | `Open PR ↗` opens current `content-updates` PR in new tab; shows `No open PR` (greyed) when no PR exists. |
| A6 | Logout clears sessionStorage AND resets all cached state AND navigates to login. |
| A7 | Mobile <768px: sidebar is a drawer, opens via ☰, closes on backdrop click. |
| A8 | Theme tinting: `Save` button uses `--color-primary`. Verified across 4 sample themes (neutral / mygo / roselia / hhw). |

### 10.2 Schema editor

| ID | Check |
|---|---|
| B1 | Each of 7 schemas renders its list (or singleton form) without throwing. Empty arrays show empty-state CTA. |
| B2 | Every `text`, `textarea`, `markdown`, `number`, `select`, `datetime`, `date`, `boolean`, `url`, `asset`, `json`, `readonly-text` field type renders correctly per §3. |
| B3 | `<AdminJsonFallback>` shows pretty-printed input on mount; parse-on-blur turns border red on invalid; status line shows error. |
| B4 | Required fields show ` *` next to label; Save button disabled when any required is empty. |
| B5 | URL fields reject non-https values; show inline error. |
| B6 | Adding new + editing existing both go through the same `<AdminFormEditor>`. |
| B7 | Cancel and Back link both prompt `Discard unsaved changes?` when form is dirty. |
| B8 | Singleton views (site/about) have no `[+ Add new]`, no list. |
| B9 | Social view has the row delete and `[+ Add new]` hidden (5-platform lock). |

### 10.3 Per-schema field map (row-by-row)

For each of 7 schemas, every field listed in §4 renders with the correct type. Reviewer literally checks the rendered DOM matches the table row-by-row. A missing field, wrong type, or wrong required-flag = block.

### 10.4 Asset uploader

| ID | Check |
|---|---|
| C1 | Drag-drop accepts files; click-to-pick accepts files. |
| C2 | >5MB file rejected with inline error before any fetch fires. |
| C3 | Non-image file rejected before any fetch fires. |
| C4 | On successful upload, the form's path field updates to `/<assetDir>/<slug>.<ext>`. |
| C5 | On successful upload, the asset is committed to `content-updates` branch (Reviewer verifies via GitHub web: branch has the new file). |
| C6 | Upload progress: dropzone shows spinner during fetch. |
| C7 | Cache-bust on the preview thumbnail (`?v=<ts>`). |

### 10.5 Commit/PR mode

| ID | Check |
|---|---|
| D1 | First save creates `content-updates` branch from default branch. |
| D2 | First save opens a PR titled `Content updates` against default branch. |
| D3 | Subsequent saves commit to `content-updates`; existing PR is reused. |
| D4 | Toast shows `✓ Saved → PR #N open. [View on GitHub →]` with working link. |
| D5 | Delete row commits a deletion to `content-updates` (entry removed from JSON). Same toast. |
| D6 | Stale-SHA conflict dialog appears when concurrent edits exist; "Discard & Refresh" reloads from branch; no force option. |
| D7 | After PR merge in web UI + branch delete, next save recreates branch + PR seamlessly. |

### 10.6 Security (cross-reference §6 [S1]-[S17])

Reviewer fills out the security audit table line-by-line.

### 10.7 Localization

| ID | Check |
|---|---|
| L1 | `grep "from '../../i18n'" src/admin/` returns 0 matches. |
| L2 | `grep "useT(" src/admin/` returns 0 matches. |
| L3 | Admin chrome strings are visible English in every view; no Chinese / Japanese leakage. |

### 10.8 Coverage

| ID | Check |
|---|---|
| T1 | `src/lib/githubApi.js` — Tier A pure logic (URL building, slug derivation, error sanitization, branch/PR resolution helpers): ≥80% per-file all axes (line, branch, function, statement). |
| T2 | `src/admin/adminSchemas.js` — Tier A field-def sanity (each schema entry has the required keys, all field types are in the catalog): ≥80% per-file all axes. |
| T3 | `<AdminJsonFallback>` — Tier B logic-component: ≥80% branch/function. Tests cover: pretty-print on mount, valid parse on blur, invalid parse on blur, empty + required. |
| T4 | `<AdminFormEditor>` — Tier B: ≥80% branch/function. Tests cover: required field validation, URL validation, dirty-state guard, save dispatches with right args. |
| T5 | `<AssetUploader>` — Tier B: ≥80% branch/function. Tests cover: file-size cap, MIME cap, success path, error path. |
| T6 | `<AdminLayout>` / `<Login>` / `<AdminListView>` — Tier C: behavior-only (renders without throwing, sidebar nav clicks work, login submit calls login fn). |
| T7 | Edge tests for §8 E1-E24 are non-negotiable. Each E# has at least one test asserting the documented behavior. |

---

## 11. Out-of-scope for V1 (deferred)

- Markdown live preview in the editor
- Multi-language admin chrome
- Asset cleanup / orphan detection
- Multi-user collision warning beyond stale-SHA dialog
- Generic Assets tab (free-form file browser)
- Drag-to-reorder in collection list views
- Undo / version history (GitHub history is the audit trail)
- Bulk edit / multi-select
- Search inside collections (small enough lists not to need it; defer until N>100)
- Direct-to-default-branch save mode (forbidden per §0 lock 1)
- Token storage encryption beyond sessionStorage (advanced-user tool, single tab)
- 2FA / SSO PATs (classic PATs only — fine-grained PATs may work but are not certified V1)
- Mobile-first editing UX (V1 mobile is functional, not optimized — desktop is the primary surface)

---

## 12. Open issues / questions for Architect + Developer

1. **Default branch detection**: cache the result of `GET /repos/:repo` → `default_branch` in admin state for the session, OR re-resolve on every `ensureContentUpdatesBranch`? **Recommend**: cache in state on login, re-resolve only on 401 or explicit refresh. Architect to decide.
2. **`content-updates` PR title**: hardcoded `Content updates` or dynamic `Content updates — N pending`? **Recommend**: hardcoded; dynamic title risks unnecessary PR-edit API calls and adds no value (the user sees commit list inside the PR).
3. **`gh_token` sessionStorage key collision** if portfolio admin and bangdream-na admin share the same browser? Both run on different domains (`suica.ngo` vs `bangdream.org`) so sessionStorage is origin-scoped — no collision. Confirmed safe.
4. **Asset preview for SVGs**: SVG is text-based and the GitHub Contents API returns base64 — preview thumbnail uses `<img src={path}>` which works for SVG too. No special handling needed. Confirmed safe.
5. **datetime-local browser inconsistency**: Safari shows `datetime-local` with no Z/timezone affordance. We store the full ISO with explicit `+/-HH:MM` offset (computed from the user's `Intl.DateTimeFormat().resolvedOptions().timeZone`). Architect provides the helper; tests cover Safari + Chrome timezones.

---

## 13. File map (preview — Architect finalizes)

```
src/admin/
├── AdminLayout.jsx + .css                          # outer layout + theme/lang inheritance
├── AdminShell.jsx                                   # sidebar + main content router
├── Login.jsx                                        # PAT login screen
├── Sidebar.jsx                                      # nav + utility links + signout
├── views/
│   ├── EventsView.jsx
│   ├── MembersView.jsx
│   ├── NewsView.jsx
│   ├── PostsView.jsx
│   ├── SocialView.jsx
│   ├── SiteView.jsx
│   └── AboutView.jsx
├── components/
│   ├── AdminListView.jsx                            # generic collection list
│   ├── AdminFormEditor.jsx                          # generic schema-driven editor
│   ├── AdminJsonFallback.jsx                        # JSON textarea with parse-on-blur
│   ├── AssetUploader.jsx                            # per-field inline uploader
│   ├── StaleConflictDialog.jsx
│   └── Toast.jsx                                    # ephemeral success/error
├── adminSchemas.js                                  # 7 schema field-def registries
├── githubApi.js                                     # ghGet / ghPut / ghPutAsset / ensureBranch / ensurePR
└── adminState.js                                    # context for token, openPRNumber, dirty flag

src/admin/__tests__/
├── adminSchemas.test.js                              # Tier A
├── githubApi.test.js                                 # Tier A
├── AdminJsonFallback.test.jsx                        # Tier B
├── AdminFormEditor.test.jsx                          # Tier B
├── AssetUploader.test.jsx                            # Tier B
├── EventsView.test.jsx                               # Tier C smoke
├── ... (one per view, smoke level)
└── edgeCases.test.jsx                                # E1-E24 from §8

public/events/.gitkeep
public/members/.gitkeep
public/news/.gitkeep
public/posts/.gitkeep
public/social/.gitkeep
```

(Architect codifies the exact module boundaries; Developer implements; Reviewer audits.)

---

## 14. Hand-off to Architect (concrete asks)

Architect's deliverable should produce:

1. **`adminSchemas.js` registry** with the 7 entries fully spelled out (all fields, all types, all `commitMessage` builders, all `defaultItem` factories, all `listColumns`).
2. **`githubApi.js` signature contract**: function names, argument shapes, return-types, error-throwing behavior. Pseudo-code OK; concrete implementation is Developer's.
3. **`adminState.js` context shape**: what's in the context, who reads/writes, dirty-flag invariants.
4. **Component tree diagram** showing prop flow (token, dispatch fns, openPR cache).
5. **Test-coverage matrix** mapping §10 acceptance items to specific test files / cases.

---

## 15. Hand-off to Developer (after Architect)

Developer reads the Architect's spec + this design doc together. Implementation order recommended:

1. `githubApi.js` (with full Tier-A test suite first, TDD)
2. `adminSchemas.js` (Tier-A tests)
3. `AdminLayout`, `Sidebar`, `Login` (smoke tests)
4. `AdminJsonFallback`, `AssetUploader` (Tier-B tests, including edge cases)
5. `AdminFormEditor` (Tier-B tests, including all field types + validation)
6. `AdminListView` + 5 collection views + 2 singleton views (smoke tests + integration)
7. `StaleConflictDialog` + edge case test sweep (E1-E24)
8. Final: full integration test running through one events-add flow end-to-end (mock fetch).

---

## 16. Hand-off to Reviewer (gate 4)

Reviewer's deliverable:

1. **Spec audit table** — every row in §10 marked `[OK]` or `[BLOCK]`.
2. **Security audit** — every item [S1]-[S17] in §6 marked `[OK]` or `[BLOCK]`.
3. **On-device verification** — Reviewer logs in with a real PAT in a real browser session at the deploy preview URL, runs through:
   - Add a test event → save → verify PR opens → check branch contents on GitHub
   - Edit the test event → save → verify same PR has a new commit
   - Upload an asset to the test event → save → verify asset committed
   - Delete the test event → save → verify deletion commit
   - Logout → verify sessionStorage cleared
   - Sign in with bad token → verify 401 handling + auto-logout banner
4. Reviewer attaches the audit + on-device notes to `.claude/code-reviews.md` per project rule [feedback_code_review_log].
5. Reviewer's APPROVED unblocks merge of the Phase 4 PR.
