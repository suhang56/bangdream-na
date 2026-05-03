# `bangdream-na` Phase 4 — Architecture Specification (Admin panel)

**Status**: Architect deliverable for task #2 in team `bangdream-na-phase4`. Ready for Developer dispatch (task #3) once Designer (task #1) is also complete.

**Scope**: Schema-driven admin panel at `/admin` for editing the 7 site data files (`events`, `members`, `news`, `posts`, `social`, `site`, `about`). PAT-in-sessionStorage auth. Save flow commits to a rolling `content-updates` branch and opens (or appends to) a single auto-PR against `main`; user merges in GitHub web; Vercel auto-deploys post-merge. Layered internally as **P4A** (foundation: githubApi.js + adminSchemas.js + AdminLogin + App.jsx route) → **P4B** (UI: AdminJsonFallback + AdminForm + AdminAssetUploader + AdminEditor + AdminNav + Admin.jsx shell) — single PR with commit-level separation.

**What does NOT change**: stack (`react@19`, `vite@8`, `react-router-dom@7`, `vitest@3`), `package.json` deps, `eslint.config.js`, `vercel.json`, `.gitignore`, `index.html`, `src/main.jsx`, `src/theme/`, all Phase 1-6 utility libs (`events.js`, `members.js`, `news.js`, `posts.js`, `dateFormat.js`, `carousel.js`, `uiLanguage.js`, `calendar.js`), all user-facing pages and components, all data files in `src/data/` (admin reads + writes them but does not change shape). The user-facing `i18n.json` chrome lexicon is **NOT** expanded for admin chrome (admin UI is EN-only V1; see §13).

**What changes**: 1 new page (`Admin.jsx`), 6 new components under `src/components/Admin*/`, 2 new lib modules (`githubApi.js`, `adminSchemas.js`), 1 modified file (`App.jsx`). No new npm deps.

---

## 1. No new deps — confirm

`package.json` deltas: **none**. Every Phase 4 deliverable composes from packages already pinned at Phase 1:

- `react` `^19.2.4` — `useState`, `useEffect`, `useRef`, `useId`, `useMemo`, `useCallback` cover all admin UI state needs
- `react-router-dom` `^7.13.2` — `<Routes>`, `<Route>`, `useLocation`, `useNavigate`, `useParams`, `<Navigate>` cover the `/admin/*` sub-routing
- `vitest` `^3.2.4` + `@testing-library/react` `^16.3.0` + `@testing-library/jest-dom` + `@testing-library/user-event` + `jsdom` — same test stack as P1-P6

**Investigated and rejected for V1** (memory rule `principles.md`: don't pre-design for hypothetical future requirements):

- **JSON syntax highlighter** (e.g., `react-simple-code-editor` + `prismjs`): a `<textarea>` with `font-family: ui-monospace, "JetBrains Mono", monospace` plus blur-time `JSON.parse` validation covers the admin's complex-field editing surface. Adding `prismjs` (~50 KB) for one fallback editor is over-investment for a V1 admin UI used by 1-2 maintainers. Re-evaluate if V2 user research shows JSON-fallback is the dominant editing path.
- **Markdown preview** (e.g., `marked`): admin authors raw markdown into `news[].body` and similar fields; site-side rendering is the source of truth. Preview can be checked by visiting the PR's Vercel preview deployment. Skip.
- **File upload progress**: requires lower-level `XMLHttpRequest` + `upload.onprogress`; `fetch` + `FormData` does not expose progress in a useful way. Skip; show a "Uploading…" spinner (binary state). Re-evaluate when assets >5 MB are needed (current cap = 5 MB; see §10.3).
- **Form validation library** (e.g., `react-hook-form`, `zod`): 7 schemas with mostly-flat fields don't justify a validation engine. Inline per-field validators in `AdminForm` (length, regex for url, ISO datetime, enum membership) keep it transparent and testable. Re-evaluate at >15 schemas or nested-conditional validation.

If Developer believes a dep is needed mid-implementation, **escalate to team-lead before installing**. Memory rule `principles.md` immutability is preserved: every save writes a new object/array; `setX(prev => ...)` patterns only.

---

## 2. New files inventory

```
src/pages/
├── Admin.jsx                                 # /admin shell: login gate + AdminNav + view router
├── Admin.css
└── Admin.test.jsx

src/components/
├── AdminLogin/
│   ├── AdminLogin.jsx                        # PAT input + sessionStorage write + login submit
│   ├── AdminLogin.css
│   └── AdminLogin.test.jsx
├── AdminNav/
│   ├── AdminNav.jsx                          # left sidebar: 7 schema buttons + logout
│   ├── AdminNav.css
│   └── AdminNav.test.jsx
├── AdminEditor/
│   ├── AdminEditor.jsx                       # generic list-and-edit container per schema
│   ├── AdminEditor.css
│   └── AdminEditor.test.jsx
├── AdminForm/
│   ├── AdminForm.jsx                         # field-by-field form generator from schema
│   ├── AdminForm.css
│   └── AdminForm.test.jsx
├── AdminJsonFallback/
│   ├── AdminJsonFallback.jsx                 # textarea with JSON parse-on-blur + validity badge
│   ├── AdminJsonFallback.css
│   └── AdminJsonFallback.test.jsx
└── AdminAssetUploader/
    ├── AdminAssetUploader.jsx                # drag-drop / click-pick + base64 PUT to GitHub
    ├── AdminAssetUploader.css
    └── AdminAssetUploader.test.jsx

src/lib/
├── githubApi.js                              # ghGet / ghPut / ghSha / uploadAsset / openOrAppendPR / ensureBranch / sanitizeError
├── githubApi.test.js
├── adminSchemas.js                           # the 7 schema definitions + helper getters
└── adminSchemas.test.js
```

Net: **1 page (3 files) + 6 components × 3 files = 18 + 2 libs × 2 files = 4** ⇒ **25 new files**.

---

## 3. Modified files inventory

| File | Change type | Description |
|---|---|---|
| `src/App.jsx` | structural | Add `<Route path="/admin/*" element={<Admin />} />`. Conditionally hide `<Navbar />` and `<Footer />` when `location.pathname.startsWith('/admin')` — admin has its own chrome. The conditional render is a small wrapper component (see §6.1) since `useLocation` requires being inside `<BrowserRouter>`. |

**Files explicitly NOT modified** (admin reads them via githubApi but does not edit their shape):

- `src/data/*.json` — schemas in §7 describe the shape the editor enforces; data on disk stays as-authored. Admin's saves preserve key order and indentation per §6.4.
- `src/data/i18n.json` — admin UI is EN-only V1. No new chrome keys added. (User-facing chrome translations are owned by Phase 6 and unrelated.)
- `vite.config.js` — coverage thresholds stay at 80/80/80/80. Admin's per-file Tier A files (`githubApi.js`, `adminSchemas.js`) hit the global threshold naturally. Tier B/C files exempted from the per-file threshold via the existing `coverage.exclude` pattern? **No**: per Phase 1 spec the threshold is global, not per-file. Architect's call: keep it global; Tier A files lift the average; Tier B/C don't need per-file exemption. (See §11 for the fine-grained tier expectations.)
- `eslint.config.js` — admin code follows the same lint rules.
- `vercel.json` — `/admin/*` is served by the existing SPA-rewrite rule already in place.

---

## 4. Function signatures — `src/lib/githubApi.js` (Tier A)

All functions are async; all throw on failure. Errors are sanitized: messages must NEVER include the Authorization header value or the raw token. Test fixtures verify this (§11 edge catalog).

`REPO` is a module-level constant: `'suhang56/bangdream-na'`. `API` is `'https://api.github.com'`. (Mirrors portfolio's pattern, but pinned to this repo.)

### 4.1 Constants & internal helpers

```js
const REPO = 'suhang56/bangdream-na';
const API = 'https://api.github.com';
const DEFAULT_BASE = 'main';

/**
 * Strip any Authorization-related token data from an error object before
 * exposing it to UI. Never include the literal token. Returns a plain
 * Error with a sanitized .message.
 *
 * @param {unknown} err - the original error or response body
 * @param {string} fallback - fallback message if err has no usable message
 * @returns {Error}
 */
function sanitizeError(err, fallback) {
  // ALL fixtures verify: token never appears in returned .message.
}

/**
 * UTF-8-safe base64 encode of a string. Mirrors portfolio's
 * btoa(unescape(encodeURIComponent(s))) pattern but uses TextEncoder for
 * multibyte safety. Used for events with Chinese titles, etc.
 *
 * @param {string} s
 * @returns {string}
 */
function encodeBase64Utf8(s) {}

/**
 * UTF-8-safe base64 decode → string. Inverse of encodeBase64Utf8.
 *
 * @param {string} b64
 * @returns {string}
 */
function decodeBase64Utf8(b64) {}
```

### 4.2 `ghGet(token, path, branch?)`

```js
/**
 * Fetch a file from the repo and decode it as JSON.
 *
 * @param {string} token - GitHub PAT
 * @param {string} path - repo-relative path, e.g. 'src/data/events.json'
 * @param {string} [branch=DEFAULT_BASE] - branch ref to read from
 * @returns {Promise<{ content: unknown, sha: string, raw: string }>}
 *   - content: parsed JSON body
 *   - sha: blob sha (used by ghPut for optimistic concurrency)
 *   - raw: raw decoded text (kept for diff display + JSON-fallback editing)
 *
 * @throws Error with sanitized message on:
 *   - 401 (PAT invalid/expired)
 *   - 404 (file or branch missing)
 *   - 5xx (network failure)
 *   - JSON.parse error (malformed file content)
 */
export async function ghGet(token, path, branch = DEFAULT_BASE) {}
```

**Fetch URL**: `${API}/repos/${REPO}/contents/${path}?ref=${branch}`.
**Headers**: `Authorization: token <PAT>`, `Accept: application/vnd.github.v3+json`.

### 4.3 `ghPut(token, path, content, sha, message, branch)`

```js
/**
 * Write JSON content to a file on the specified branch. Optimistic
 * concurrency via sha. Auto-creates the branch if it does not exist
 * (delegates to ensureBranch first).
 *
 * @param {string} token
 * @param {string} path
 * @param {unknown} content - serializable JSON value (object/array)
 * @param {string|null} sha - blob sha from prior ghGet on same branch;
 *                             null if file is new on this branch
 * @param {string} message - conventional-commit message; see §6.4
 * @param {string} branch - target branch, e.g. 'content-updates'
 * @returns {Promise<{ content: { sha: string, path: string }, commit: { sha: string, html_url: string } }>}
 *
 * @throws Error sanitized:
 *   - 401 (PAT)
 *   - 409 (sha mismatch — concurrent edit; UI shows "Refresh and retry")
 *   - 422 (validation, e.g. branch name invalid)
 *   - 5xx
 */
export async function ghPut(token, path, content, sha, message, branch) {}
```

**Body**: `{ message, content: encodeBase64Utf8(JSON.stringify(content, null, 2) + '\n'), sha?, branch }`. Trailing newline preserved to match POSIX convention and existing data files.
**No auto-retry on 409**: surface to caller. Admin's UI presents a "Refresh and retry" button which re-runs `ghGet` then re-attempts. (Memory rule `principles.md`: don't add fallbacks for scenarios outside system boundaries — 409 is a real user-state and must surface.)

### 4.4 `ghSha(token, path, branch)`

```js
/**
 * Get the blob sha of a file on a specific branch. Returns null if the
 * file does not exist on that branch (404), instead of throwing.
 *
 * @param {string} token
 * @param {string} path
 * @param {string} branch
 * @returns {Promise<string|null>}
 *
 * @throws Error on 401, 5xx, or other non-404 failures.
 */
export async function ghSha(token, path, branch) {}
```

Used by `uploadAsset` and by save-flow when checking whether `content-updates` branch already has the file.

### 4.5 `ensureBranch(token, branch, base?)`

```js
/**
 * Ensure the named branch exists. If it does not, create it from `base`.
 * If it already exists, returns its head sha unchanged.
 *
 * @param {string} token
 * @param {string} branch - e.g. 'content-updates'
 * @param {string} [base=DEFAULT_BASE] - source ref for new branch
 * @returns {Promise<{ branch: string, headSha: string, created: boolean }>}
 *
 * @throws Error on 401, base-branch missing (404), 5xx.
 */
export async function ensureBranch(token, branch, base = DEFAULT_BASE) {}
```

**Implementation**:
1. `GET /repos/{REPO}/git/refs/heads/{branch}` → 200 returns sha, set `created: false`.
2. On 404: `GET /repos/{REPO}/git/refs/heads/{base}` to fetch base sha.
3. `POST /repos/{REPO}/git/refs` with `{ ref: 'refs/heads/' + branch, sha: baseSha }` → returns new sha, `created: true`.

This separates branch creation from `ghPut` for testability; `ghPut` calls `ensureBranch` internally before its PUT.

### 4.6 `uploadAsset(token, repoPath, file, message, branch)`

```js
/**
 * Upload a binary file (image) to the specified branch. File is read as
 * data URL, base64 portion extracted, then PUT to Contents API.
 *
 * @param {string} token
 * @param {string} repoPath - e.g. 'public/events/2025-roselia-la.jpg'
 * @param {File} file - browser File object (size + type validated by caller)
 * @param {string} message - conventional commit message
 * @param {string} branch
 * @returns {Promise<{ path: string, sha: string, downloadUrl: string }>}
 *   - path: repo-relative path (caller stores this in the JSON field)
 *
 * @throws Error sanitized:
 *   - 401, 409 (asset already exists with different sha — overwrite path
 *     handles this by passing the existing sha; first read it via ghSha)
 *   - 5xx
 *   - FileReader error
 */
export async function uploadAsset(token, repoPath, file, message, branch) {}
```

**Flow**:
1. `ensureBranch(token, branch)` (idempotent).
2. `ghSha(token, repoPath, branch)` → existingSha (may be null).
3. `FileReader.readAsDataURL(file)` → strip `data:*/*;base64,` prefix.
4. `PUT /repos/{REPO}/contents/{repoPath}` with `{ message, content: <base64>, branch, sha?: existingSha }`.

### 4.7 `openOrAppendPR(token, branch, base, title, body)`

```js
/**
 * If a PR is already open from `branch` to `base`, return its number
 * (commits already on `branch` are now part of that PR). Otherwise
 * open a new PR.
 *
 * @param {string} token
 * @param {string} branch - head, e.g. 'content-updates'
 * @param {string} base - target, e.g. 'main'
 * @param {string} title - PR title
 * @param {string} body - PR body markdown
 * @returns {Promise<{ number: number, htmlUrl: string, created: boolean }>}
 *
 * @throws Error on 401, 422 (head/base invalid), 5xx.
 */
export async function openOrAppendPR(token, branch, base, title, body) {}
```

**Flow**:
1. `GET /repos/{REPO}/pulls?head={REPO_OWNER}:{branch}&base={base}&state=open` (note: `head` requires `owner:branch` for cross-fork queries; same-repo accepts just `branch` but we send `owner:branch` to be safe).
2. If response array length ≥ 1: return `{ number: arr[0].number, htmlUrl: arr[0].html_url, created: false }`.
3. Else `POST /repos/{REPO}/pulls` with `{ title, body, head: branch, base }`.
4. **422 swallowing**: GitHub returns 422 with "A pull request already exists for…" in narrow race conditions where step 1 returned [] but creation failed. Catch this specific 422 (message regex `/already exists/i`), then re-run step 1 and return whatever's there. This is the ONE place a retry is justified — it's a documented GitHub race.

### 4.8 `commitContentChange(token, schemaKey, path, content, message)`

The high-level helper `AdminEditor` calls. Composes the lower-level primitives:

```js
/**
 * High-level save flow:
 *   1. ensureBranch('content-updates', 'main')
 *   2. ghSha(content-updates branch) — may be null first save
 *   3. ghPut(content-updates, sha, message)
 *   4. openOrAppendPR(content-updates, main, ...)
 *
 * @param {string} token
 * @param {string} schemaKey - e.g. 'events' (used for default PR title)
 * @param {string} path - e.g. 'src/data/events.json'
 * @param {unknown} content - the new JSON value
 * @param {string} message - conventional commit message; see §6.4
 * @returns {Promise<{ pr: { number, htmlUrl, created }, commit: { sha, html_url } }>}
 *
 * @throws Error sanitized — propagates from any inner call.
 */
export async function commitContentChange(token, schemaKey, path, content, message) {}
```

PR title default: `chore(content): editorial updates`. PR body default lists the schemas touched (accumulated across commits — for the simple V1, body is just `Auto-generated by /admin. Merge to deploy. Branch is auto-deleted on merge.`).

**Branch name constant**: `'content-updates'`. Single rolling branch (decision §13).

---

## 5. Function signatures — `src/lib/adminSchemas.js` (Tier A)

Pure config + small validation helpers. No side effects. No fetch. No DOM.

### 5.1 Schema shape contract

```js
/**
 * @typedef {'text'|'textarea'|'url'|'email'|'datetime'|'date'|'select'|'boolean'|'number'|'asset'|'array'|'object'} FieldType
 *
 * @typedef {Object} FieldDef
 * @property {string} key                     - JSON key in the data object
 * @property {string} label                   - human label for form (EN only V1)
 * @property {FieldType} type
 * @property {boolean} [required]             - default false
 * @property {boolean} [readOnly]             - default false; readOnly fields are auto-set or unmodifiable post-create
 * @property {boolean} [autoSlug]             - applies to type='text' fields where empty value is filled by slugify(otherField)
 * @property {string} [autoSlugFrom]          - which other field's value to slugify; only required when autoSlug=true
 * @property {boolean} [complex]              - for type='array'|'object'; renders <AdminJsonFallback /> instead of nested form
 * @property {string[]} [options]             - for type='select'; enum members
 * @property {string} [uploadDir]             - for type='asset'; e.g. 'public/events/'; MUST start with 'public/' (validated)
 * @property {string[]} [acceptedMimeTypes]   - for type='asset'; default ['image/png','image/jpeg','image/webp','image/svg+xml']
 * @property {number} [maxBytes]              - for type='asset'; default 5 * 1024 * 1024 (5 MB)
 * @property {string} [help]                  - inline hint text shown under the field
 * @property {string} [placeholder]
 *
 * @typedef {Object} SchemaDef
 * @property {string} key                     - matches the top-level export key (e.g. 'events')
 * @property {string} title                   - "Events", "Members", etc.
 * @property {string} file                    - 'src/data/events.json'
 * @property {'array'|'object'} shape         - is the JSON file a list (events) or a single object (site, about)?
 * @property {string} [listKey]               - for shape='array'; the field used as React key + ID (e.g. 'id')
 * @property {string[]} [listColumns]         - for shape='array'; columns shown in list view (e.g. ['id','title','date','type'])
 * @property {(item)=>string} [listLabel]     - for shape='array'; optional override for "<title> — <date>" row label
 * @property {(items)=>(items)} [sortFn]      - for shape='array'; default = no sort; events use upcoming-first-then-past, etc.
 * @property {FieldDef[]} fields              - per-item fields (array shape) or per-document fields (object shape)
 */
```

### 5.2 Top-level export

```js
export const adminSchemas = {
  events:  { ... },
  members: { ... },
  news:    { ... },
  posts:   { ... },
  social:  { ... },
  site:    { ... },
  about:   { ... },
};

/**
 * @param {string} key
 * @returns {SchemaDef|undefined}
 */
export function getSchema(key) {
  return adminSchemas[key];
}

export function listSchemaKeys() {
  return Object.keys(adminSchemas);
}

/**
 * Validate that an item conforms to its schema. Returns an array of
 * { fieldKey, message } for each violation; empty array on success.
 *
 * @param {string} schemaKey
 * @param {unknown} item
 * @returns {Array<{ fieldKey: string, message: string }>}
 */
export function validateItem(schemaKey, item) {}

/**
 * Slugify text into URL/file-safe form. Used for autoSlug fields.
 *
 * @param {string} title
 * @returns {string}
 */
export function slugify(title) {}
```

### 5.3 Schema definitions (one per data file)

#### 5.3.1 `events`

```js
events: {
  key: 'events',
  title: 'Events',
  file: 'src/data/events.json',
  shape: 'array',
  listKey: 'id',
  listColumns: ['id', 'title', 'date', 'type'],
  fields: [
    { key: 'id',          type: 'text',     label: 'ID',          required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: 'Auto-generated from title; lowercase + dashes' },
    { key: 'title',       type: 'text',     label: 'Title',       required: true },
    { key: 'date',        type: 'datetime', label: 'Date / time', required: true, help: 'ISO 8601, e.g. 2025-09-15T19:00:00-07:00' },
    { key: 'endDate',     type: 'datetime', label: 'End date / time', help: 'Optional; for multi-day events' },
    { key: 'type',        type: 'select',   label: 'Type',        required: true, options: ['concert', 'fanmeet', 'con', 'online', 'meetup'] },
    { key: 'location',    type: 'object',   label: 'Location',    complex: true, help: '{"city":"Los Angeles","venue":"YouTube Theater","country":"US"}' },
    { key: 'description', type: 'textarea', label: 'Description' },
    { key: 'links',       type: 'array',    label: 'Links',       complex: true, help: '[{"label":"Tickets","url":"https://..."}]' },
    { key: 'bands',       type: 'array',    label: 'Bands',       complex: true, help: '["Roselia","Poppin\'Party"]' },
    { key: 'image',       type: 'asset',    label: 'Banner image', uploadDir: 'public/events/' },
    { key: 'ticketUrl',   type: 'url',      label: 'Ticket URL' },
  ],
}
```

#### 5.3.2 `members`

```js
members: {
  key: 'members',
  title: 'Members',
  file: 'src/data/members.json',
  shape: 'array',
  listKey: 'id',
  listColumns: ['id', 'name', 'role', 'city'],
  fields: [
    { key: 'id',       type: 'text',     label: 'ID',     required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'name' },
    { key: 'name',     type: 'text',     label: 'Name',   required: true },
    { key: 'role',     type: 'select',   label: 'Role',   options: ['organizer', 'mod', 'member', 'cover-band'] },
    { key: 'city',     type: 'text',     label: 'City' },
    { key: 'oshi',     type: 'text',     label: 'Oshi (band/character)' },
    { key: 'bio',      type: 'textarea', label: 'Bio' },
    { key: 'avatar',   type: 'asset',    label: 'Avatar', uploadDir: 'public/members/' },
    { key: 'socials',  type: 'array',    label: 'Socials', complex: true, help: '[{"platform":"x","url":"https://..."}]' },
  ],
}
```

#### 5.3.3 `news`

```js
news: {
  key: 'news',
  title: 'News',
  file: 'src/data/news.json',
  shape: 'array',
  listKey: 'id',
  listColumns: ['id', 'title', 'date', 'tag'],
  fields: [
    { key: 'id',       type: 'text',     label: 'ID',         required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title' },
    { key: 'title',    type: 'text',     label: 'Title',      required: true },
    { key: 'date',     type: 'date',     label: 'Date',       required: true, help: 'ISO 8601 date, e.g. 2025-09-15' },
    { key: 'tag',      type: 'select',   label: 'Tag',        options: ['announcement', 'event', 'community', 'release', 'update'] },
    { key: 'summary',  type: 'textarea', label: 'Summary',    help: 'Shown on news list / cards' },
    { key: 'body',     type: 'textarea', label: 'Body (markdown)' },
    { key: 'image',    type: 'asset',    label: 'Hero image', uploadDir: 'public/news/' },
    { key: 'sourceUrl', type: 'url',     label: 'Source URL', help: 'Optional external link' },
  ],
}
```

#### 5.3.4 `posts`

(Schema added in P6 for the home-page peek carousel; P4 admin manages it.)

```js
posts: {
  key: 'posts',
  title: 'Posts (home carousel)',
  file: 'src/data/posts.json',
  shape: 'array',
  listKey: 'id',
  listColumns: ['id', 'title', 'datePosted'],
  sortFn: (items) => [...items].sort((a, b) => (b.datePosted ?? '').localeCompare(a.datePosted ?? '')),
  fields: [
    { key: 'id',         type: 'text',     label: 'ID',         required: true, readOnly: true, autoSlug: true, autoSlugFrom: 'title', help: 'Auto-generated; falls back to date + uuid if no title' },
    { key: 'image',      type: 'asset',    label: 'Image',      required: true, uploadDir: 'public/posts/' },
    { key: 'title',      type: 'text',     label: 'Title overlay', help: 'Optional; absent => image-only card' },
    { key: 'url',        type: 'url',      label: 'Click target URL', help: 'Optional; absent => non-link card' },
    { key: 'datePosted', type: 'date',     label: 'Date posted', required: true, help: 'ISO 8601 date' },
  ],
}
```

#### 5.3.5 `social`

```js
social: {
  key: 'social',
  title: 'Social links',
  file: 'src/data/social.json',
  shape: 'array',
  listKey: 'platform',
  listColumns: ['platform', 'label', 'enabled'],
  fields: [
    { key: 'platform', type: 'select', label: 'Platform',    required: true, options: ['discord', 'qq', 'xiaohongshu', 'x', 'wechat', 'instagram', 'youtube', 'tiktok', 'bilibili'] },
    { key: 'label',    type: 'text',   label: 'Label',       required: true },
    { key: 'url',      type: 'url',    label: 'URL',         help: 'Empty url + qrImage => QR popover tile' },
    { key: 'qrImage',  type: 'asset',  label: 'QR image',    uploadDir: 'public/social/', help: 'Used for WeChat etc.' },
    { key: 'enabled',  type: 'boolean', label: 'Enabled' },
  ],
}
```

#### 5.3.6 `site` (single object)

```js
site: {
  key: 'site',
  title: 'Site identity',
  file: 'src/data/site.json',
  shape: 'object',
  fields: [
    { key: 'discordInvite',     type: 'url',  label: 'Discord invite URL' },
    { key: 'communityName',     type: 'text', label: 'Community name (EN)' },
    { key: 'communityNameZh',   type: 'text', label: 'Community name (ZH)' },
    { key: 'communityNameJp',   type: 'text', label: 'Community name (JP)' },
  ],
}
```

#### 5.3.7 `about` (single object)

```js
about: {
  key: 'about',
  title: 'About page',
  file: 'src/data/about.json',
  shape: 'object',
  fields: [
    { key: 'mission',          type: 'textarea', label: 'Mission' },
    { key: 'history',          type: 'textarea', label: 'History' },
    { key: 'faq',              type: 'array',    label: 'FAQ',     complex: true, help: '[{"q":"...","a":"..."}]' },
    { key: 'coc',              type: 'textarea', label: 'Code of conduct' },
    { key: 'joinInstructions', type: 'textarea', label: 'Join instructions' },
  ],
}
```

### 5.4 Validation helper rules (`validateItem`)

For each field where `required === true`:
- `type='text'|'textarea'|'url'|'email'`: empty string fails.
- `type='date'|'datetime'`: empty fails; non-empty must `Date.parse` as finite number.
- `type='select'`: value must be in `options`.
- `type='asset'`: empty fails (string path required).
- `type='boolean'|'number'`: presence checked (boolean=must be true|false; number=must be finite).

For `complex: true` array/object fields: the value must be valid JSON of the declared type (array OR object). This validation only runs at save time; the AdminJsonFallback also runs JSON.parse at field-blur time for inline feedback.

For `autoSlug: true` fields where `readOnly: true`: an empty value at save time triggers `slugify(item[autoSlugFrom])`. If `autoSlugFrom` is also empty, fall back to `'p-' + Date.now().toString(36)` (avoids empty-id collision). Test fixture covers both branches.

For `type='url'`: must `new URL(value)` succeed (or be empty when not required).
For `type='email'`: simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (or empty when not required).

---

## 6. Branch + auto-PR commit flow (locked from approved plan)

### 6.1 Save algorithm

```text
# Pseudo-code (impl lives in src/lib/githubApi.js commitContentChange)

function save(token, schemaKey, newContent, summary):
    schema  = getSchema(schemaKey)                          # §5
    branch  = 'content-updates'
    base    = 'main'

    ensureBranch(token, branch, base)                       # idempotent — §4.5

    sha     = ghSha(token, schema.file, branch)             # may be null on first commit since branch reset
    if sha == null:
        sha = ghSha(token, schema.file, base)               # fall back to main's sha for the initial PUT

    message = composeMessage(schemaKey, summary)            # §6.4
    putRes  = ghPut(token, schema.file, newContent, sha, message, branch)   # §4.3

    pr      = openOrAppendPR(token, branch, base, prTitle(), prBody())      # §4.7
    return { pr, commit: putRes.commit }
```

Rolling branch — single open PR at any time. Every save adds another commit to that branch and (idempotently) keeps the PR open. After the user merges, GitHub deletes `content-updates` (default repo setting "automatically delete head branches" assumed enabled — Reviewer verifies in repo settings). The next save's `ensureBranch` recreates it from now-updated `main`.

### 6.2 SHA-fallback rationale

GitHub's Contents API requires the current sha when overwriting a file on the target branch. On first save after a merge, the `content-updates` branch is gone, `ensureBranch` recreates it from main, and the file's sha on this fresh branch equals main's sha. The two-step `ghSha(..., branch) || ghSha(..., base)` covers:

1. Subsequent saves on the same open PR: `ghSha(..., 'content-updates')` returns the latest blob sha from prior commits → use it.
2. First save after merge: `ghSha(..., 'content-updates')` returns the fresh-from-main sha (since `ensureBranch` just created it with that sha) — falls into branch-existed path (branch was just created from main, file has main's sha).
3. Brand-new file (file never existed in repo): both calls return null → `ghPut` is called with `sha: null`, which Contents API accepts as "create file".

### 6.3 PR detection edge — 422 race

When `openOrAppendPR` runs step 1 (list open PRs) and gets `[]`, then step 3 (create) racing with another tab's create can fail 422. The narrow retry (re-list, accept whatever's now there) resolves it. The retry budget is **one re-list**, no recursion. Test fixture covers the race.

### 6.4 Commit message convention

Per memory rule `principles.md` (Conventional Commits, no `Co-Authored-By`):

```text
chore(content): update <schema>.json — <action summary>
```

Where `<action summary>` is auto-composed by `AdminEditor`:

| Action | Summary template |
|---|---|
| Add new item to array schema | `add <listLabel(item)>` (e.g. `add 'Roselia LA Live 2025'`) |
| Edit existing item | `update <listLabel(item)>` |
| Delete item | `remove <listLabel(item)>` |
| Edit object schema (site/about) | `edit <field1>, <field2>` (diffed from prior load) |
| Asset upload (no schema change yet) | `chore(content): upload <relativePath>` |

`listLabel(item)` defaults to `item[firstNonIdField]` (e.g. event title, member name). For `posts` without title, falls back to `item.id`.

The emitted message MUST stay under GitHub's 100-char first-line guideline (truncate `<action summary>` at 60 chars + `…`).

### 6.5 PR title + body

```js
prTitle() => 'chore(content): editorial updates';
prBody()  =>
  '> Auto-generated by /admin panel.\n\n' +
  'Each commit on this branch corresponds to one save action.\n' +
  'Merge to deploy. Branch is auto-deleted on merge.\n\n' +
  '_To regenerate this PR, just save again from /admin._';
```

Body is static V1; we don't accumulate per-commit summaries in the PR body (avoids the read-then-write hazard on the PR resource itself). The commit list inside the PR is the source of truth.

### 6.6 App.jsx route + chrome-hide wrapper

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import Footer from './components/Footer/Footer.jsx';
import Home from './pages/Home.jsx';
// ... existing imports
import Admin from './pages/Admin.jsx';
import './App.css';

function ChromeAndRoutes() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  return (
    <>
      {!isAdmin && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/events" element={<Events />} />
        <Route path="/members" element={<Members />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
      {!isAdmin && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ChromeAndRoutes />
    </BrowserRouter>
  );
}
```

Test fixture: navigate to `/admin` → assert `<header role="banner">` (Navbar) absent, `<footer>` absent. Navigate to `/` → both present.

---

## 7. `<AdminForm />` implementation strategy

**Props**: `{ schema: SchemaDef, item: object, onChange: (newItem) => void, errors?: Array<{fieldKey,message}> }`.

**State**: none — fully controlled. Parent (`AdminEditor`) holds the item.

**Render loop**:

```jsx
schema.fields.map(field => {
  const value = item[field.key];
  const error = errors?.find(e => e.fieldKey === field.key);

  if (field.complex) return <AdminJsonFallback ... />;
  if (field.readOnly) return <ReadOnlyField ... />;

  switch (field.type) {
    case 'text':     return <input type="text" ... />;
    case 'textarea': return <textarea ... />;
    case 'url':      return <input type="url" ... />;
    case 'email':    return <input type="email" ... />;
    case 'date':     return <input type="date" ... />;
    case 'datetime': return <input type="datetime-local" ... />;  // browser auto-formats; convert to ISO on change
    case 'select':   return <select> ... </select>;
    case 'boolean':  return <input type="checkbox" ... />;
    case 'number':   return <input type="number" ... />;
    case 'asset':    return <AdminAssetUploader ... />;
  }
})
```

**Validation feedback**: parent runs `validateItem(schemaKey, item)` on every change; passes the error array down. `AdminForm` shows red border + message under any field with an error. Save button is in `AdminEditor` (parent); it disables when `errors.length > 0`.

**Datetime conversion**: `<input type="datetime-local">` returns `'YYYY-MM-DDTHH:mm'` (no seconds, no timezone). We convert to ISO at change-time using the browser's local timezone — `new Date(localStr).toISOString()`. Test fixture covers timezone behavior with mocked `Date`.

**autoSlug behavior**: when `field.autoSlug && field.readOnly`, the text input is disabled; its visible value is `value || slugify(item[field.autoSlugFrom] ?? '')`. The actual `item.id` is computed (and frozen into `item`) at save time, not at render time, to avoid surprising re-renders mid-typing.

---

## 8. `<AdminJsonFallback />` implementation

**Props**: `{ field: FieldDef, value: unknown, onChange: (newValue) => void }`.

**Internal state**:
- `text: string` — current textarea contents (initial: `JSON.stringify(value, null, 2)`).
- `error: string | null` — last parse error message.

**Behavior**:
- `onChange` of textarea: update `text` state only; do NOT call parent `onChange` yet.
- `onBlur`:
  1. `JSON.parse(text)` → on success, call parent `onChange(parsed)`, clear `error`.
  2. On parse error, set `error` to the parse message, do NOT call parent.
- Parent's `errors` prop bubbles up through `AdminForm` if save is attempted while text is unparseable; we re-validate on blur AND at save attempt.
- Visual: monospace textarea (`font-family: ui-monospace, "JetBrains Mono", "Cascadia Code", "Source Code Pro", monospace`), red 2px border + error message under field when `error !== null`, green checkmark icon (CSS-only) when `error === null && text !== JSON.stringify(value, null, 2)` (indicates "edited and parsed OK, ready to save").
- Hint text from `field.help` shown above textarea.

**Empty input**: empty string is valid for non-required fields and means "remove the field" — translates to `null` upstream. (Test edge case.)

**Multi-byte safety**: textarea natively supports Chinese; the `JSON.stringify(value, null, 2)` round-trip preserves non-ASCII content (no `ensure_ascii` knob in JS's `JSON.stringify`).

---

## 9. `<AdminAssetUploader />` implementation

**Props**: `{ field: FieldDef, value: string|null, token: string, branch: string, onChange: (relativePath: string) => void, onError: (message: string) => void }`.

**Internal state**:
- `uploading: boolean`
- `dragOver: boolean`
- `localError: string|null` (size/type validation; distinct from githubApi errors which propagate up via `onError`)

**Validation (client-side, before upload)**:
1. `file.size <= (field.maxBytes ?? 5 * 1024 * 1024)` — else `localError = 'File too large (>5 MB)'`.
2. `field.acceptedMimeTypes ?? ['image/png','image/jpeg','image/webp','image/svg+xml']`.includes(file.type) — else `localError = 'Unsupported file type'`.

**Slug computation**:
- If parent passed an `autoSlug` value (e.g. event id), derive filename from that: `${slug}.${ext}`.
- Else: derive from filename: `slugify(file.name.replace(/\.[^.]+$/, '')) + '.' + ext`.
- Final repoPath: `field.uploadDir + slug + '.' + ext` (e.g. `public/events/2025-roselia-la.jpg`).
- Asset uploadDir validated at module load (test): MUST start with `public/`.

**Upload flow**:
1. Set `uploading = true`.
2. Call `uploadAsset(token, repoPath, file, message, branch)` (§4.6).
3. On success: `onChange('/' + repoPath.replace(/^public\//, ''))` — turns `public/events/x.jpg` into `/events/x.jpg` (the URL the site uses).
4. On error: `onError(err.message)`; `uploading = false`.

**UI**:
- Drop zone: dashed border, fills the field width, ~120 px tall. `onDragOver` + `onDrop` set `dragOver` state.
- Click anywhere in zone opens file picker (hidden `<input type="file">`).
- During upload: dim + "Uploading…" overlay + spinner.
- Preview: when `value` is set, show small preview thumbnail (`<img src={value} />`) above the drop zone with "Replace" button.

**Memory rule `principles.md` immutability**: `onChange` returns the new path; parent does `setItem(prev => ({ ...prev, [field.key]: path }))`.

**No XHR upload progress** (rejected dep §1) — accepted V1 limitation.

---

## 10. `<AdminEditor />` implementation

The container that wires schema → list → edit → save.

**Props**: `{ schemaKey: string, token: string }`.

**State**:
- `data: unknown` — full content from latest `ghGet`.
- `sha: string` — for the `commitContentChange` call.
- `loading: boolean`.
- `editing: object | null` — the item being edited (array shape) or the cloned object (object shape).
- `pendingErrors: Array<{fieldKey, message}>` — from `validateItem`.
- `saving: boolean`.
- `successMsg: string` — "Saved → PR #N open".
- `errorMsg: string` — sanitized error from githubApi.

**On mount + on `schemaKey` change**:
- `ghGet(token, schema.file, 'main')` — read from main (the canonical source). Set `data` + `sha`.

**List view (when `editing == null` and `schema.shape == 'array'`)**:
- Render schema.listColumns as table headers.
- Render each item as a row with Edit + Delete buttons.
- Render "+ New" button at top.

**Edit view**: render `<AdminForm schema={schema} item={editing} onChange={setEditing} errors={pendingErrors} />` + Save + Cancel.

**Save flow**:
1. Compose new full content (insert/update item at correct position; preserve order otherwise).
2. Call `commitContentChange(token, schemaKey, newContent, message)` (§4.8).
3. On success: update local `data`, set `editing = null`, show toast: `Saved → PR #${pr.number} open. View on GitHub →` (link target `pr.htmlUrl`).
4. On error: set `errorMsg`. Keep `editing` so user can retry.

**Re-fetch on 409**: error message from ghPut on 409 is `'Concurrent edit detected. Refresh and retry.'` — UI shows a "Refresh" button that re-runs step 1 (ghGet) and discards local edits (with a confirm).

**Object-shape schemas (site, about)**: no list view; jump straight to single-form edit. Save button always visible.

---

## 11. Test plan + coverage tier mapping

### 11.1 Tier breakdown

| File | Tier | Threshold expectation | Notes |
|---|---|---|---|
| `src/lib/githubApi.js` | **A** | ≥80% lines, branches, functions, statements **per-file** | Every public function has happy + error path tests; mock `fetch` via `vi.fn()` |
| `src/lib/adminSchemas.js` | **A** | ≥80% per-file all axes | Schema-membership, validateItem matrix, slugify edge cases |
| `src/components/AdminEditor/AdminEditor.jsx` | **B** | ≥80% branch / function | List + edit + save + error states; uses Testing Library |
| `src/components/AdminForm/AdminForm.jsx` | **B** | ≥80% branch / function | Each field-type render branch tested |
| `src/components/AdminJsonFallback/AdminJsonFallback.jsx` | **B** | ≥80% branch / function | Valid + invalid + empty + multibyte JSON; blur behavior |
| `src/components/AdminAssetUploader/AdminAssetUploader.jsx` | **B** | ≥80% branch / function | Size + type validation, drag + click paths |
| `src/components/AdminLogin/AdminLogin.jsx` | **C** | Behavior-only — assert correct DOM + sessionStorage interaction | No coverage gate per-file |
| `src/components/AdminNav/AdminNav.jsx` | **C** | Behavior-only | Click handlers + active state |
| `src/pages/Admin.jsx` | **C** | Behavior-only | Login gate + view router smoke tests |

Vitest config thresholds (`vite.config.js`) stay global (80/80/80/80). Tier A files lift the average; Tier B/C files contribute their branches without per-file enforcement. **Reviewer (task #4) verifies** by running `npm run test:coverage` and inspecting per-file line/branch percentages in the HTML report.

### 11.2 Edge tests catalog (mandatory — memory rule `feedback_edge_testing_soul.md`)

Every entry below MUST have a corresponding test. Reviewer fails the gate if any are missing.

#### `githubApi.js` edges

1. **401 on ghGet** — bad PAT → throws sanitized error "Invalid token (401)"; error message does NOT contain the literal token.
2. **404 on ghGet (file missing)** — throws "File not found: {path} on {branch}".
3. **404 on ghGet (branch missing)** — same shape with branch in message.
4. **5xx on ghGet** — throws "GitHub server error (502)"; no token in message.
5. **Malformed JSON in file content** — throws "Invalid JSON in {path}".
6. **Empty file response** (file exists but is `''`) — returns `{ content: undefined, sha, raw: '' }` OR throws "Invalid JSON" (Architect choice: throw — empty isn't valid JSON for our schemas).
7. **Multi-byte round-trip** — `ghPut` then `ghGet` of `{ title: "Roselia LA Live - 中文 + 日本語 + 한국어 + 🎸" }` round-trips byte-identical.
8. **409 on ghPut (sha mismatch)** — throws "Concurrent edit detected. Refresh and retry."
9. **422 on ghPut (validation)** — throws "Invalid request: {message}" without leaking token.
10. **ghSha 404 returns null** (does not throw) — used for "file new on branch" path.
11. **ensureBranch creates new branch** — first call creates ref from main, returns `{ created: true }`.
12. **ensureBranch is idempotent** — second call returns `{ created: false }` with same branch sha.
13. **openOrAppendPR finds existing PR** — returns `{ created: false, number: 42 }`.
14. **openOrAppendPR opens new PR** — returns `{ created: true, number: 43 }`.
15. **openOrAppendPR 422 race** — list returns `[]`, create returns 422 "already exists", retry list returns the racing PR → returns `{ created: false }`.
16. **uploadAsset happy path PNG** — file ≤5 MB, accepted type → calls `ensureBranch` then `ghSha` then PUT; resolves with path/sha.
17. **uploadAsset failure** — 5xx → reject with sanitized message.
18. **commitContentChange composes correctly** — given mocked ghPut + openOrAppendPR returning canned values, asserts the orchestrated return shape.
19. **sanitizeError strips token** — given an Error containing the token literal in its message, returns sanitized Error with token redacted (regex `/token\s+[A-Za-z0-9_-]+/`).
20. **Authorization header is always present** — every fetch call's options include `Authorization: token <PAT>`.

#### `adminSchemas.js` edges

1. **Every schema has a defined `key` matching its export name**.
2. **Every schema's `file` starts with `'src/data/'`**.
3. **Every schema's `shape` is `'array'` or `'object'`**.
4. **Every array-shape schema has a `listKey` field present in `fields`**.
5. **No `readOnly: true` field is also `required: true` without `autoSlug: true`** — would be a UI deadlock.
6. **Every `type: 'asset'` field's `uploadDir` starts with `'public/'`** and ends with `'/'`.
7. **Every `type: 'select'` field has a non-empty `options` array**.
8. **`validateItem('events', { ...complete })` returns `[]`**.
9. **`validateItem('events', { ...missingTitle })` returns `[{ fieldKey: 'title', message: /required/i }]`**.
10. **`validateItem('events', { ...invalidUrl })` returns ticketUrl error**.
11. **`validateItem('events', { ...invalidDate })` returns date error** ("not a valid date").
12. **`validateItem('events', { type: 'unknown' })` returns enum-violation error**.
13. **`validateItem('site', { discordInvite: '' })` returns `[]`** (no required fields on site).
14. **`slugify('Roselia LA Live 2025!')` → `'roselia-la-live-2025'`**.
15. **`slugify('  中文 title  ')` → `'中文-title'`** (preserves CJK; lowercases ASCII; collapses whitespace).
16. **`slugify('')` → `''`**.

#### `AdminLogin` edges (Tier C behavior)

1. Empty PAT submit → no fetch / no sessionStorage write.
2. PAT typed + submit → `sessionStorage.setItem('bd_admin_token', token)` called once with the input value.
3. PAT input has `type="password"` and `autoComplete="off"`.
4. Logout flow → `sessionStorage.removeItem('bd_admin_token')`.
5. Token never appears in `console.log` (spy on `console.log`; assert `toHaveBeenCalledTimes(0)` for any call whose argument string-includes the token).

#### `AdminForm` edges

1. Required field empty → `errors` prop populated; save button (in parent test wrapper) disabled.
2. Invalid url → error displayed under field.
3. Datetime input change → `onChange` called with ISO-formatted value.
4. Select with `options=['a','b']` → renders 2 options + a placeholder; selecting 'a' calls `onChange`.
5. Asset field: passes `field.uploadDir` to `<AdminAssetUploader />`.
6. Complex field: renders `<AdminJsonFallback />` instead of plain input.
7. ReadOnly field: renders disabled input with auto-slug preview.

#### `AdminJsonFallback` edges

1. Valid JSON typed + blur → parent `onChange` called with parsed value.
2. Invalid JSON + blur → error message shown; parent `onChange` NOT called.
3. Empty textarea + blur (non-required) → parent `onChange` called with `null`.
4. Multi-byte content `[{"q":"中文?","a":"日本語"}]` → parses + round-trips.
5. Initial render with object value → textarea shows `JSON.stringify(value, null, 2)`.
6. Re-blur after fixing error → error clears, parent receives new value.

#### `AdminAssetUploader` edges

1. File >5 MB rejected → localError shown; no `uploadAsset` call.
2. Unsupported MIME (`image/gif`) rejected.
3. Drag + drop PNG → upload called; on success `onChange(/events/<slug>.png)`.
4. Click-pick PNG → same flow.
5. SVG accepted (default mime list includes svg+xml).
6. uploadAsset error 5xx → onError called with sanitized message; no `onChange`.
7. Filename with spaces + uppercase + special chars → slug normalized.

### 11.3 Reviewer-only checks (manual verification, not coverage-counted)

A. Static scan of `src/components/Admin*` and `src/pages/Admin.jsx`:
- `grep -rn "console\\.log" src/components/Admin*/ src/pages/Admin.* src/lib/githubApi.* src/lib/adminSchemas.*` MUST return zero matches.
- `grep -rn "Authorization" src/components/Admin*/ src/pages/Admin.*` MUST return zero matches (only `src/lib/githubApi.js` should reference Authorization headers).
- `grep -rn "localStorage" src/components/Admin*/ src/pages/Admin.* src/lib/githubApi.*` MUST return zero matches (admin uses sessionStorage exclusively).

B. On-device PAT flow (Reviewer fires up `npm run dev`, navigates to `/admin`, logs in with a real test PAT, edits one field in `posts`, saves, verifies a PR opened on github.com, merges, observes Vercel deploy). This is the gate for actual delivery. Memory rule `feedback_review_means_run_tests.md`: "review and commit" requires full test suite run + on-device check.

---

## 12. Internal commit ordering (single PR, layered commits)

Per memory rule `principles.md` (Conventional Commits, no `Co-Authored-By`). Each commit must keep the test suite green (`npm test` passes) when checked out alone.

### P4A — Foundation (lower risk, pure logic + login)

1. **`feat(admin): add github api client (ghGet/ghPut/ghSha/ensureBranch)`**
   - Adds `src/lib/githubApi.js` with: `ghGet`, `ghPut`, `ghSha`, `ensureBranch`, `sanitizeError`, `encodeBase64Utf8`, `decodeBase64Utf8`.
   - Adds `src/lib/githubApi.test.js` with edges 1-6, 8-12, 19-20.
   - Tests pass standalone (no UI yet).

2. **`feat(admin): add upload + PR helpers (uploadAsset/openOrAppendPR/commitContentChange)`**
   - Extends `src/lib/githubApi.js`.
   - Extends test file with edges 7, 13-18.

3. **`feat(admin): add adminSchemas registry`**
   - Adds `src/lib/adminSchemas.js` (7 schemas + helpers).
   - Adds `src/lib/adminSchemas.test.js` (16 edges in §11.2).

4. **`feat(admin): add AdminLogin component`**
   - Adds the 3 files (jsx/css/test).
   - Tests pass; component is mountable but not yet wired into routing.

5. **`feat(admin): add /admin route + chrome hide`**
   - Modifies `src/App.jsx` (ChromeAndRoutes wrapper).
   - Adds `src/pages/Admin.jsx` (3 files) — at this commit, Admin.jsx renders `<AdminLogin />` only; post-login it renders a placeholder "TODO P4B" message. This keeps every commit shippable.
   - Adds tests for App route + Admin shell login gate.

### P4B — UI components (build on foundation)

6. **`feat(admin): add AdminJsonFallback component`** (3 files + tests).

7. **`feat(admin): add AdminForm component`** (3 files + tests). Imports AdminJsonFallback.

8. **`feat(admin): add AdminAssetUploader component`** (3 files + tests). Imports `uploadAsset` from githubApi.

9. **`feat(admin): add AdminEditor component`** (3 files + tests). Imports AdminForm + AdminAssetUploader + commitContentChange.

10. **`feat(admin): add AdminNav component`** (3 files + tests).

11. **`feat(admin): wire Admin.jsx shell to AdminEditor + AdminNav`**
    - Modifies `src/pages/Admin.jsx` (replaces TODO placeholder with real wiring).
    - Updates `src/pages/Admin.test.jsx` for full flow.
    - At this commit, the admin panel is feature-complete.

12. **`docs(admin): record P4 architecture`** (already done by this Architect dispatch — placed first chronologically but committed last so the docs reflect what shipped).

(Total commit count = 12. Each commit ≤ ~500 LOC of source + tests, keeping per-commit review tractable.)

---

## 13. Resolved open issues (Architect defaults)

| Issue | Decision | Rationale |
|---|---|---|
| Single rolling `content-updates` branch vs per-save timestamped | **Single rolling** | One open PR at a time = simpler mental model; commit history within the PR shows the per-save sequence. Per-save branches would explode into N PRs and burden the merger. Memory `principles.md`: don't add complexity for hypothetical future requirements. |
| JSON syntax highlighter dep | **Skip for V1** | Plain monospace `<textarea>` + JSON.parse on blur. Re-evaluate after V1 user feedback (§1). |
| Markdown preview for textarea fields | **Skip for V1** | Authors check via Vercel preview deployment on the auto-PR. |
| Concurrent-edit conflict UX | **409 → "Refresh and retry" button** | No merge UI; admin is single-user (1-2 maintainers). Edge case handled, not optimized. |
| Asset slug auto-generation | **Lowercase + dashes from title; fallback `'a-' + Date.now().toString(36)` if no title** | Memory `principles.md`: avoid unused fallbacks, but slug-on-empty IS reachable (drag-drop with no title field). |
| Admin auth lifetime | **Session only (sessionStorage)** | Tab close clears token; matches portfolio's pattern; reduces window where a stolen device can write. localStorage is **forbidden** (Reviewer asserts via grep). |
| Admin UI language | **EN only V1** | Admin is for the 1-2 maintainers; expanding `i18n.json` keys for admin chrome would dilute the user-facing translation audit. Re-evaluate if non-English maintainers join. Memory rule: `i18n.json` chrome scope is locked to user-facing pages. |
| Field types not covered above (e.g., color picker, rich text) | **Out of scope** | None of the 7 schemas need them. |
| Server-side rate limiting on PAT misuse | **Out of scope** | GitHub enforces; nothing for the SPA to add. |
| ID collision detection | **Pre-save check**: if creating a new array item whose `listKey` value already exists in the array, validateItem returns an error `Duplicate id: <id>`. Test fixture covers this. |

---

## 14. Security implementation summary

Distilled from §11.3, this is the Reviewer's gate checklist:

- [ ] **PAT input** uses `type="password"` and `autoComplete="off"`. (AdminLogin §11.2 edge 3.)
- [ ] **Token storage** is `sessionStorage` only — NO `localStorage` references in admin code (Reviewer grep).
- [ ] **Token never logged** — `console.log` zero matches in admin code (Reviewer grep + AdminLogin edge 5).
- [ ] **Errors sanitized** — `sanitizeError` strips token from any error message; verified by edge 19.
- [ ] **Authorization header** present on every fetch but NEVER reflected in error messages — edge 20.
- [ ] **PAT scope guidance** — AdminLogin renders `<details>` with link to GitHub Settings → Tokens (classic) → check the `repo` scope.
- [ ] **No token in source** — Reviewer grep for `ghp_` / `github_pat_` patterns returns zero matches.
- [ ] **CORS** — GitHub API supports CORS for browser PATs; nothing to add.
- [ ] **CSP** — out of scope V1; rely on Vercel defaults; admin doesn't load third-party scripts.

---

## 15. Iteration contract for Developer (task #3)

**Input** to Developer:
- This document.
- `docs/p4-design.md` (Designer's deliverable — task #1, parallel; Developer waits for both).
- Approved plan `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md`.
- All 7 data files in `src/data/` as ground truth for schema verification.
- Reference `C:\Users\WaterMelon\portfolio\src\pages\Admin.jsx` for proven save-flow patterns.

**Output** Developer must produce:
- 25 new files per §2.
- 1 modified file per §3.
- All edge tests in §11.2 GREEN.
- Coverage `npm run test:coverage` GREEN at the global 80% bars.
- Static scans in §11.3.A pass (zero forbidden matches).
- 12 commits per §12, on branch `feat/phase-4`, ready for Reviewer.

**TDD ordering (Developer protocol)**: per memory rule `principles.md`, write the test first, then the implementation. The §12 commit list aligns with this — each commit is "test file + impl together"; Developer authors the test first, watches it fail, then writes impl.

**No scope creep** — Developer MUST NOT:
- Install new deps without team-lead approval.
- Add fields to schemas beyond §5.3.
- Touch user-facing pages or i18n.json.
- Auto-merge or push to `main` directly.
- Introduce backwards-compat shims for nonexistent prior versions.

When Developer signals `DONE` (per memory rule `feedback_wait_for_dev_done_before_pr.md`), Reviewer (task #4) takes over.

---

## 16. Dependencies on Designer's deliverable (task #1)

Designer's `docs/p4-design.md` (parallel to this) covers visual UX:
- Login screen layout, form spacing, theme integration.
- AdminNav left-sidebar visual treatment, active-state, icons (likely emoji or Phosphor chars to avoid new deps).
- Color usage on toast banners (success / error / info).
- Mobile responsiveness — admin is desktop-first; minimum supported width 768px (tablet); below that, show "Admin works best on desktop" notice. (Architect default — Designer may override.)
- Typography for code-monospace JSON fallback.
- Loading + skeleton states.

This Architect doc covers the **technical structure**; Designer covers the **visual surface**. No overlap. If Designer chooses to expand AdminNav (e.g., collapsible sub-sections per schema), Architect signs off in pre-Dev review.

---

## 17. Acceptance gate (Reviewer task #4)

Reviewer APPROVES only when ALL of:

- [ ] All edge tests in §11.2 present and green.
- [ ] Coverage `vitest run --coverage` exits 0; HTML report shows Tier A files at ≥80% per-file.
- [ ] Static scans (§11.3.A) all pass with zero forbidden matches.
- [ ] On-device PAT flow (§11.3.B) executed end-to-end: login → edit → save → PR opens → merge → Vercel deploys → site reflects edit.
- [ ] All 12 commits on `feat/phase-4` follow conventional-commit format and have NO `Co-Authored-By` line.
- [ ] No `.claude/` references in any committed file.
- [ ] Code review summary written to `.claude/code-reviews.md` per memory rule `feedback_code_review_log.md`.
- [ ] No new npm deps added (verify diff of `package.json` / `package-lock.json`).
- [ ] User-facing pages (`Home`, `Events`, `Members`, `News`, `About`) still render unchanged — admin route does not regress them; navigate to each and verify.

Once APPROVED: per memory rule `feedback_never_autonomous_merge_to_default_branch.md`, team-lead opens a PR (does NOT auto-merge to master autonomously); user reviews and merges. Vercel auto-deploys.

---

**End of P4 architecture spec.**
