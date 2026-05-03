# `bangdream-na` Phase 8 — Architecture Specification (Admin redesign)

**Status**: Architect deliverable for Task #2 in team `bangdream-na-phase8`. **Revision 2** (2026-05-03) — re-aligned with `docs/p8-design.md` after Designer's spec landed. Drops 13 files, drops 2 iteration steps (P8.1 theme tokens + the SVG-illustration assumption inside P8.3), reduces total deliverables from 13 to 12 (P8.2 → P8.13 numbering preserved; P8.1 explicitly DROPPED so Developer can detect if they shipped it before this revision). Pairs with `docs/p8-design.md` §1-§9; both are authoritative.

**Scope**: Visual redesign + theme integration + Chinese localization of the existing `/admin` panel shipped in Phase 4. P8 is a **layered overlay** on P4 — schemas, GitHub API client, save flow, branch+PR semantics, security model are all unchanged. What P8 changes:

1. Admin chrome reads CSS custom properties from `<html data-theme="*">` so it inherits the active site theme (was: hardcoded neutral fallbacks).
2. Admin chrome is converted to **Chinese inline strings** (single-language, operator-only). No `t()` wrapping, no `i18n.json` keys for admin chrome — the strings are written directly into JSX/CSS as 中文 text.
3. Empty states get a single `◆` glyph icon (large, muted) + Chinese title/subtitle/CTA card per Designer §4.3. **No per-schema SVG illustrations** (Designer rejected — the no-new-deps rule extends to net-new visual asset language).
4. A new `AdminTopBar` shows breadcrumb + 5-state save status + ViewSiteLink + openPR pill (Designer §2.3). Sign-out **stays in sidebar bottom** (Designer §3.3 keeps P4 placement). Top bar replaces the duplicated success/error banners that were spread across `AdminEditor.jsx`; success spike still surfaces as a bottom-right toast per Designer §7.
5. The list view `<table>` is extracted into a reusable `<AdminTable>` component (§6) — no functional change beyond styling + Chinese strings + empty-state slot.
6. New layout tokens declared at `Admin.css :root` scope (Designer §1): `--admin-sidebar-width: 260px`, `--admin-topbar-height: 52px`, `--admin-content-max: 900px`, `--admin-radius: 8px`, `--admin-input-bg: color-mix(in srgb, var(--color-bg-card) 70%, var(--color-bg) 30%)`, `--admin-error: #e53e3e`. **No new theme tokens** — Designer aligned: error red is one local hardcoded exception, NOT pushed into all 8 `themes.js` entries.

**Why Chinese-only, not bilingual** (locked by team-lead, supersedes P4 §13 row "Admin UI language"):

- Admin is operator-only; the only authenticated user is 西瓜 (Chinese-native) with a GitHub PAT.
- The user-facing site stays bilingual via `t()` + `i18n.json` (Phase 5 chrome lexicon untouched).
- Admin chrome going through `t()` would add ~169 keys × 2 langs = ~338 i18n entries with no operator-side benefit. Memory rule (`feedback_i18n_scope_full_ui_chrome_default.md`): i18n default = full UI chrome — but admin is **not** UI chrome for end users; it's an internal operator console, scope-excluded.
- LangToggle is **not** rendered inside admin (was already the case in P4; stays).

**What does NOT change in P8**:

- `src/lib/githubApi.js` (entire file — no token handling, no save flow, no error sanitization touched)
- `src/lib/uiLanguage.js` `t()` mechanism (admin doesn't call it)
- `src/data/i18n.json` (no admin keys added; user-facing chrome lexicon stays Phase-5-owned)
- `src/data/*.json` content files
- `src/theme/ThemeContext.jsx` provider
- All non-admin pages and components
- `package.json` deps — every P8 deliverable composes from packages already pinned (`react@19`, `vitest@3`, `@testing-library/react@16`)
- `vite.config.js` coverage thresholds (still 80/80/80/80 global)
- `.gitignore`, `eslint.config.js`, `vercel.json`, `index.html`

**Non-goals** (locked):

- No rewrite of the schema-driven editor architecture from P4. AdminEditor's state machine (load → list → edit → save → conflict) stays.
- No new admin features (no asset gallery, no bulk-edit, no diff viewer, no theme-picker inside admin).
- No mobile drawer added. Admin remains desktop-first (≥768px); below 768px the existing inline layout degrades gracefully and shows a Chinese "建议在桌面端使用" notice. (Designer may override; if so, see §10.)
- No `i18n.json` admin keys, no `t()` calls in admin components, no language-switch tests for admin.
- No new fields, no new schemas, no new dependencies.

---

## 1. Component tree changes

### 1.1 New components

| File | Responsibility | Imported by |
|---|---|---|
| `src/components/AdminTopBar/AdminTopBar.jsx` | Sticky top bar inside content column (Designer §2.3). Renders breadcrumb (后台 / `<schemaTitle>` / [`<editing label>`]), 5-state save indicator, `查看网站 ↗` link, openPR pill (or `无待合并 PR` muted text). Sign-out stays in sidebar (NOT in top bar). Stateless; props-driven. | `Admin.jsx` (replaces inline header) |
| `src/components/AdminTopBar/AdminTopBar.css` | Tokens-only theme styling for the top bar (no hex colors). | side-effect |
| `src/components/AdminTopBar/AdminTopBar.test.jsx` | Tier B render + behavior tests (§9). | runner |
| `src/components/AdminTopBar/breadcrumb.js` | Pure helper `deriveBreadcrumb(schemaKey, editing)` returning Chinese-labeled segments. Tier A. | AdminTopBar |
| `src/components/AdminTopBar/breadcrumb.test.js` | Tier A tests (§9.1). | runner |
| `src/components/AdminTopBar/saveStatus.js` | Pure helper `deriveSaveStatusLabel(state)` returning Chinese label + variant. Tier A. | AdminTopBar |
| `src/components/AdminTopBar/saveStatus.test.js` | Tier A tests. | runner |
| `src/components/AdminEmptyState/AdminEmptyState.jsx` | Empty-state card per Designer §4.3: dashed-border card containing a large `◆` glyph (`color: var(--color-border); font-size: 2.5rem`), Chinese title (`暂无{entity}`), Chinese subtitle, and optional CTA button. Stateless. | `AdminEditor` (list-empty branch) |
| `src/components/AdminEmptyState/AdminEmptyState.css` | Dashed-border card + glyph + typography per Designer §4.3. Token-driven; only hardcoded exception is `--admin-error` if used (it isn't here — empty state has no error variant). | side-effect |
| `src/components/AdminEmptyState/AdminEmptyState.test.jsx` | Tier B tests: glyph rendered with `aria-hidden`; title + subtitle Chinese props rendered; CTA button click + absence cases. | runner |
| `src/components/AdminTable/AdminTable.jsx` | Generic table for collection schemas. Props: `{ columns, rows, idKey, onEdit, onDelete, busy, emptyState }`. No sort, no pagination (V1 defer). Renders `emptyState` slot when `rows.length === 0`. | `AdminEditor` (replaces the inline `<table>`) |
| `src/components/AdminTable/AdminTable.css` | Token-driven table styling. | side-effect |
| `src/components/AdminTable/AdminTable.test.jsx` | Tier B tests. | runner |
| `src/components/AdminBrandPanel/AdminBrandPanel.jsx` | Replaces the textual `Admin / bangdream-na` block at the top of `AdminNav` per Designer §3.1. Renders `<img src="/panda.svg" width="28" height="28" alt="" aria-hidden="true">` + wordmark `后台` + subline `BD!NA 后台`. Stateless. **Asset dependency**: requires `public/panda.svg` to exist — see §1.6. | `AdminNav.jsx` |
| `src/components/AdminBrandPanel/AdminBrandPanel.css` | Logo-row layout per Designer §3.1: img + wordmark in flex; subline below; bottom border `1px solid var(--color-border)`. | side-effect |
| `src/components/AdminBrandPanel/AdminBrandPanel.test.jsx` | Tier C behavior tests: renders `后台` wordmark + `BD!NA 后台` subline; img has `aria-hidden="true"`. | runner |

**~~AdminSignOut~~ component DROPPED**: Designer §3.3 keeps sign-out bottom-anchored in the sidebar (P4 placement). No new component needed; `AdminNav.jsx` keeps its existing sign-out button with restyled CSS per Designer §3.3.

**New file count**: 13 files (4 components × ~3 files each = 12, plus AdminBrandPanel needs the panda.svg asset addressed in §1.6).

### 1.2 Modified components

| File | Change | Rationale |
|---|---|---|
| `src/pages/Admin.jsx` | Mount `AdminTopBar` inside the content column (between `AdminNav` and the editor body). Pass `saveStatus`, `editing`, `openPR` as props (no `onSignOut` prop — sign-out stays in sidebar). Render success/error toasts (Designer §7) consuming the same `saveStatus` state. | Lift cross-cutting chrome into top bar + add toast renderer |
| `src/pages/Admin.css` | Declare new `:root`-scoped layout tokens per Designer §1: `--admin-sidebar-width: 260px`, `--admin-topbar-height: 52px`, `--admin-content-max: 900px`, `--admin-radius: 8px`, `--admin-input-bg: color-mix(...)`, `--admin-error: #e53e3e`. Replace `.admin-shell` width with grid layout `grid-template-columns: var(--admin-sidebar-width) 1fr`. Add 3px `--gradient-hero` stripe at top. Replace **every** hardcoded color/fallback with `var(--color-*)`. | Theme integration §2 + Designer §1, §2.1 |
| `src/components/AdminNav/AdminNav.jsx` | Replace the inline `Admin / bangdream-na` block with `<AdminBrandPanel />`. Replace English labels (`View Site ↗`, `Open PR #N ↗`, `No open PR`, `Sign out`) with Chinese inline strings. **Keep** the bottom-anchored sign-out button (Designer §3.3 — restyled, not removed). Drop the `View Site ↗` and `Open PR ↗` utility links from the sidebar — they move to the top bar (Designer §2.3). Prefix each schema button with `◆ ` (Designer §3.2). Schema button labels come from `schema.title` (Chinese after §4). | Chinese chrome + brand panel + sidebar utility cleanup |
| `src/components/AdminNav/AdminNav.css` | Sidebar width `var(--admin-sidebar-width)`. Replace remaining color literals with `var(--color-*)`. Active-state still uses `color-mix(in srgb, var(--color-primary) 12%, transparent)`. Update sign-out button per Designer §3.3 (transparent bg, `border: 1px solid var(--color-border)`, hover red via `--admin-error`). | Theme + Designer §3 |
| `src/components/AdminEditor/AdminEditor.jsx` | Replace inline `<table>` with `<AdminTable>` (§6). Replace the inline `No <schema> yet.` paragraph with `<AdminEmptyState>`. Wire `saveStatus` upward via `onSaveStatus` callback (§7) — emit `unsaved` on dirty, `saving` on save start, `saved` on success (auto-clears 3s), `error` on rejection. Replace English chrome strings with Chinese inline strings (`+ 新建{entity}`, `编辑`, `取消`, `保存（提交 + PR）`, `保存中…`, `← 返回 {title}`, list count `{N} 条`, etc.). Move success-toast / error-banner copy out (handled by Admin.jsx toast). | Top-bar wiring + Chinese chrome + empty-state slot + Designer copy |
| `src/components/AdminEditor/AdminEditor.css` | Drop the in-component table CSS (moved to `AdminTable.css`). Drop the in-component success/error CSS (moved to `AdminTopBar.css`). Replace remaining hex literals with tokens. | De-dupe + theme |
| `src/components/AdminForm/AdminForm.jsx` | Field labels + help come from `schema.fields[i].label` / `.help` (which are now Chinese — see §4). Submit-related strings + `Select…` placeholder become Chinese inline (`请选择…`). | Chinese chrome |
| `src/components/AdminForm/AdminForm.css` | Replace `#d33` error red with `var(--admin-error)` (the local hardcoded exception declared in `Admin.css :root`). Replace any remaining literals with tokens. Apply Designer §5 input/label/help spec. | Theme + Designer §5 |
| `src/components/AdminAssetUploader/AdminAssetUploader.jsx` | Replace English strings (`Drag image here, or click to upload`, `Uploading…`, `Replace`, error messages) with Chinese inline (`拖拽图片到此处或点击上传`, `上传中…`, `替换`, etc.). | Chinese chrome |
| `src/components/AdminAssetUploader/AdminAssetUploader.css` | Replace `#d33` with `var(--admin-error)`. Apply Designer §5.5 dropzone spec (`border: 2px dashed var(--color-border)`, `background: var(--admin-input-bg)`, drag-over tint via `color-mix`). | Theme + Designer §5.5 |
| `src/components/AdminLogin/AdminLogin.jsx` | Replace **every** English string with Chinese inline: title (`后台面板`), subtitle, expired banner, error messages, label, button (`登录`), `<details>` summary + ordered-list items, GitHub-tokens link text. | Chinese chrome |
| `src/components/AdminLogin/AdminLogin.css` | Replace `#d33`/`#a00` with `var(--admin-error)`. Replace `#fff` button text with `var(--color-on-primary)`. Apply Designer §5 input + button spec. | Theme + Designer §5, §6 |
| `src/components/AdminJsonFallback/AdminJsonFallback.jsx` | Replace user-facing strings (`JSON parsed OK`, `Invalid JSON: …` prefix) with Chinese (`JSON 解析成功`, `无效 JSON：…`). Keep parser's own error message intact (technical content). | Chinese chrome |
| `src/components/AdminJsonFallback/AdminJsonFallback.css` | Token sweep (no hex). | Theme |
| `src/lib/adminSchemas.js` | Translate every `title`, `field.label`, `field.help`, schema-`title`, `select.options` display, and any other operator-visible string to Chinese. Schema **keys** (`'events'`, `'members'`, etc.) and **field keys** (`'id'`, `'title'`) stay English (they're identifiers). `validateItem` error messages become Chinese inline strings (no `messageKey` indirection — the function returns `{ fieldKey, message: '<Chinese>' }`). | Chinese chrome |
| `src/lib/adminSchemas.test.js` | Update assertions that match against English label/error strings to expect Chinese strings. | Chinese chrome |

**~~`src/theme/themes.js` modification DROPPED~~**: Designer §1 keeps error red as a local `--admin-error: #e53e3e` declared in `Admin.css :root` scope, NOT pushed into all 8 theme entries. `themes.js` is byte-identical to pre-P8.

**Modified file count**: 14 files (was 16; dropped `themes.js` and the AdminSignOut wiring; AdminEmptyState/illustrations/* never get created).

### 1.3 Deletions

None.

### 1.4 Files NOT modified in P8

- `src/data/i18n.json` — admin doesn't use it (admin is Chinese-only inline). P8 adds zero `admin.*` keys. The file may receive unrelated user-facing key edits owned by Phase 5; those are out-of-scope for P8 review.
- `src/lib/uiLanguage.js` — admin doesn't call `t()`.
- `src/lib/githubApi.js` — security-critical; locked.
- `src/theme/themes.js` — Designer §1 declined adding `--color-error` to all 8 themes; error red is a local `--admin-error: #e53e3e` in `Admin.css :root` only.
- `src/theme/themes.test.js` — no test changes; `REQUIRED_TOKENS` unchanged.
- All `src/data/*.json` data files.
- `vite.config.js`, `package.json`, `package-lock.json`, `eslint.config.js`, `vercel.json`, `index.html`, `.gitignore`.
- All non-admin pages/components.

### 1.5 Hook extraction (none required)

`useOpenPR` not extracted (yagni — single caller in `Admin.jsx`). `saveStatus` is **lifted** from `AdminEditor` into `Admin.jsx` because it has multiple consumers: AdminTopBar pill, in-form save bar (Designer §6 "Save + Cancel row" mirrors top-bar status), and the bottom-right toast (Designer §7).

### 1.6 Asset dependency — `public/panda.svg`

Designer §3.1 specifies `<img src="/panda.svg" width="28" height="28" alt="">` in the sidebar brand panel. **The asset does not exist in the repo today** (`public/` only has `favicon.png`, `logo.png`, `robots.txt`, `sitemap.xml`).

Architect's call: **Developer reuses `/logo.png` for V1**. The Designer's intent is "panda-logo DNA" (`docs/p8-design.md` §0 north star) and `/logo.png` is the existing brand asset. If `logo.png` is not actually a panda, Developer flags it back to Designer for asset addition (a one-file commit dropping `public/panda.svg` into the repo — not new dependency, just a static asset).

Acceptance: `<AdminBrandPanel>` renders `<img src="/logo.png" ...>` initially. If a `panda.svg` lands in the same PR, switch the path. Reviewer verifies the image actually loads in the on-device smoke test (§9.5).

---

## 2. Theme integration

### 2.1 Inheritance chain (verified)

`<html data-theme="<key>">` is set by `ThemeContext.jsx` (P3). `theme.css` defines `:root[data-theme="<key>"] { --color-bg: ...; ... }` for every theme registered in `src/theme/themes.js`. CSS custom properties inherit to every descendant including `/admin` — admin already participates **transparently** because `App.jsx` wraps everything in the same `<ThemeProvider>` (no admin-specific carve-out). **No code changes needed in `ThemeContext` / `App.jsx` / `theme.css` for inheritance**; the work is purely replacing hardcoded fallback hex values in admin CSS files with `var(--color-*)` references that already exist on `:root[data-theme="*"]`.

### 2.2 Hardcoded literals to replace (per file)

The Reviewer's audit script (§9.4) `grep`s for hex codes in `src/components/Admin*/`, `src/pages/Admin.css`, and the new P8 components. After P8 lands, the only hex literal allowed inside admin CSS is **black/white in `rgba()` shadows** (e.g., `0 4px 20px rgba(0, 0, 0, 0.2)` for modal lift) since shadows are theme-agnostic.

Per-file replacement table:

| File | Literal | Replace with |
|---|---|---|
| `src/pages/Admin.css` | `#fafafa` (admin-shell bg fallback) | `var(--color-bg)` |
| `src/pages/Admin.css` | `#fff` (sidebar surface fallback) | `var(--color-bg-card)` |
| `src/pages/Admin.css` | `#e5e5e5`, `#eee` (border) | `var(--color-border)` |
| `src/pages/Admin.css` | `#111`, `#222`, `#333` (text) | `var(--color-text)` |
| `src/pages/Admin.css` | `#888`, `#666`, `#555`, `#999` (muted text) | `var(--color-text-muted)` |
| `src/pages/Admin.css` | `#6366f1` (admin-toast border literal) | `var(--color-primary)` |
| `src/pages/Admin.css` | `#d33` (toast.error border) | `var(--admin-error)` |
| `src/pages/Admin.css` | `#fff` (toast surface) | `var(--color-bg-card)` |
| `src/components/AdminNav/AdminNav.css` | `#fff`, `#e5e5e5`, `#eee`, `#111`, `#222`, `#888`, `#999`, `#333`, `#ddd`, `#6366f1`, `#f3f3f3` | tokens above |
| `src/components/AdminEditor/AdminEditor.css` | `#111`, `#777`, `#fafafa`, `#222`, `#555`, `#eee`, `#fff`, `#d4d4d4`, `#f5f5f5`, `#d33`, `#6366f1`, `#a00` | tokens above + `var(--admin-error)` |
| `src/components/AdminLogin/AdminLogin.css` | `#fafafa`, `#fff`, `#e5e5e5`, `#111`, `#666`, `#555`, `#d4d4d4`, `#d33`, `#a00`, `#6366f1` | tokens above + `var(--admin-error)` + `var(--color-on-primary)` for button text |
| `src/components/AdminAssetUploader/AdminAssetUploader.css` | `#d33`, `#d4d4d4`, `#fafafa`, `#555`, `#fff`, `#e5e5e5`, `#666`, `#888`, `#6366f1` | tokens + `var(--admin-error)` |
| `src/components/AdminForm/AdminForm.css` | (token sweep — read once during dev) | tokens |
| `src/components/AdminJsonFallback/AdminJsonFallback.css` | (token sweep) | tokens |

### 2.3 Disallowed tokens (Reviewer-enforced)

Inside admin CSS files (`grep -nP "#[0-9a-fA-F]{3,8}"`) should return **exactly one** match: the `--admin-error: #e53e3e;` declaration in `Admin.css :root` (the deliberate exception per Designer §1). Plus `rgba(0, 0, 0, X)` shadow declarations (theme-agnostic).

### 2.4 Local layout/error tokens in `Admin.css :root`

Designer §1 declined adding `--color-error` and `--color-error-on` to all 8 themes. Instead, the following tokens are declared **once** at the top of `src/pages/Admin.css`:

```css
:root {
  --admin-sidebar-width: 260px;
  --admin-topbar-height: 52px;
  --admin-content-max: 900px;
  --admin-radius: 8px;
  --admin-input-bg: color-mix(in srgb, var(--color-bg-card) 70%, var(--color-bg) 30%);
  --admin-error: #e53e3e;
}
```

These are global to admin (since `Admin.css` is imported once by `Admin.jsx` and the variables cascade to every descendant). The `--admin-error` is the **only hardcoded hex** allowed in admin CSS — Reviewer's static scan §9.4-A whitelists exactly this declaration line.

`themes.js` is byte-identical to pre-P8. `themes.test.js` is byte-identical. `REQUIRED_TOKENS` is unchanged. The previously-planned P8.1 commit ("add `--color-error` to all themes") is dropped from the iteration contract.

**No `--color-success` added.** P4 admin uses `color-mix(in srgb, var(--color-success, #2a8) 10%, transparent)` — the var is undefined and the fallback hex applies. P8 replaces these refs with `color-mix(in srgb, var(--color-primary) 10%, transparent)` — success uses the band's primary tint.

### 2.5 No `--color-surface` token

P4 admin CSS references `var(--color-surface, #fff)` — but `--color-surface` is **not defined** in any theme. Every reference resolves to its fallback `#fff`. P8 collapses these to `var(--color-bg-card)` (which IS in every theme), which is what was always intended. Literal find-and-replace inside admin CSS files; no new token needed.

---

## 3. Chinese chrome strings — inline policy

### 3.1 Where the strings live

Admin chrome strings are **written directly into JSX/CSS as Chinese characters**. No `t()` call, no `i18n.json` key, no helper indirection. Examples:

```jsx
// src/components/AdminLogin/AdminLogin.jsx
<h1 className="admin-login-title">后台面板</h1>
<p className="admin-login-sub">请输入 GitHub Personal Access Token 继续。</p>
<button type="submit" className="admin-login-button">登录</button>
```

```jsx
// src/components/AdminEditor/AdminEditor.jsx
<button onClick={...}>+ 新建</button>
<button onClick={...}>编辑</button>
<button onClick={...}>取消</button>
<button onClick={...}>{saving ? '保存中…' : '保存（提交 + PR）'}</button>
```

### 3.2 Schema-defined strings (in `adminSchemas.js`)

Every operator-visible string in the schema registry is rewritten to Chinese:

- `schema.title`: `'Events'` → `'活动'`, `'Members'` → `'成员'`, `'News'` → `'资讯'`, `'Posts (home carousel)'` → `'动态（首页滚动）'`, `'Social links'` → `'社交链接'`, `'Site identity'` → `'站点信息'`, `'About page'` → `'关于页'`.
- Every `field.label`: `'Title'` → `'标题'`, `'Date / time'` → `'日期 / 时间'`, `'Type'` → `'类型'`, `'Location'` → `'地点'`, etc.
- Every `field.help`: existing English help text translated inline.
- `validateItem` error messages: returned as `{ fieldKey, message: '<Chinese>' }`. Examples: `'标题不能为空'`, `'URL 必须以 https:// 开头'`, `'日期无效'`, `'必须为以下之一：concert, fanmeet, …'` (option list itself stays English since the `select` options are also enum tokens — see §3.3).
- Schema-level `key` and field-level `key` properties stay English (they are identifiers, not labels — they live in JSON files and code).

### 3.3 Enum option labels

`field.options` in schemas like `events.type` (`['concert', 'fanmeet', 'con', 'online', 'meetup']`) are **enum tokens**, not display labels — they get persisted to JSON. They stay English. The Chinese display label for each option is derived in `AdminForm.jsx` via a small inline lookup table per schema, e.g.:

```js
const EVENT_TYPE_LABEL_ZH = {
  concert: '演唱会',
  fanmeet: '粉丝见面会',
  con: '同人展',
  online: '线上活动',
  meetup: '线下聚会',
}
// In <select>:
<option value="concert">演唱会</option>
```

Inline tables of ~5 entries per schema-with-enums (`events.type`, `members.role`, `news.tag`, `social.platform`) — mechanical, no abstraction needed. Total ~25 enum-label pairs across all schemas.

### 3.4 Strings that stay English in admin

- Field **keys** (`id`, `title`, `date`, `image`, `bands`, etc.) shown in the list view's column headers. These are technical column identifiers — operator (西瓜) understands them. (If Designer prefers translated headers, AdminTable can accept an optional `column.label` Chinese override; default falls back to the field key string. See §6.)
- GitHub-related branded text: `GitHub`, `PAT`, `Personal Access Token`, `ghp_xxx`, `repo` (the OAuth scope name), `PR #N`. These are GitHub vocabulary — translating breaks operator's mental model.
- File extensions, ISO 8601 sample dates, JSON key examples in `field.help` snippets.
- Conventional commit message bodies (`chore(content): update events.json — add 春日聚会`) — author + summary in Chinese, but the conventional-commit prefix stays English since GitHub tooling parses it.
- `bangdream-na` (the brand subtitle).

### 3.5 Reviewer's English-leakage scan

The Reviewer runs a DOM-text scan against rendered admin chrome — for each rendered admin view, `document.body.textContent` is searched for English-letter-only words ≥3 chars; matches are flagged unless they are on the whitelist (the items in §3.4: `GitHub`, `PAT`, `Token`, `JSON`, `URL`, `bangdream-na`, etc.). See §9.3 for implementation; this is the policy Reviewer enforces.

---

## 4. `adminSchemas.js` translation pass — concrete delta

This file changes shape minimally. Schema keys, field keys, types, options, validation rules, asset constraints all stay byte-identical. Only **operator-visible strings** are rewritten in place. Specifically:

| What changes | Examples |
|---|---|
| `schema.title` | `'Events'` → `'活动'`; `'Members'` → `'成员'`; `'News'` → `'资讯'`; `'Posts (home carousel)'` → `'动态（首页滚动）'`; `'Social links'` → `'社交链接'`; `'Site identity'` → `'站点信息'`; `'About page'` → `'关于页'` |
| `field.label` | `'Title'` → `'标题'`; `'Date / time'` → `'日期 / 时间'`; `'Type'` → `'类型'`; `'Location'` → `'地点'`; `'Description'` → `'描述'`; `'Banner image'` → `'横幅图片'`; `'Ticket URL'` → `'购票链接'` (etc., all 7 schemas) |
| `field.help` | `'ISO 8601, e.g. 2025-09-15T19:00:00-07:00'` → `'ISO 8601 格式，例如 2025-09-15T19:00:00-07:00'`; `'Auto-generated from title; lowercase + dashes'` → `'根据标题自动生成；小写字母 + 横线'` |
| `validateItem` error strings | Inline Chinese: `'标题不能为空'`, `'URL 必须以 https:// 开头'`, `'日期无效'`, `'必须为以下之一：{options}'` (`{options}` interpolated by simple template literal at error-emit time), `'ID 重复：{id}'`, `'无效 JSON：{message}'`, `'资源路径必须以 public/ 开头'` |
| `validateItem` return shape | **Unchanged** from P4: `{ fieldKey, message }` — no `messageKey` indirection (since there's no second language). |

**Why no `messageKey` indirection**: P4's `validateItem` returns `{ fieldKey, message }` with English inline. P8 keeps the same shape but with Chinese strings. No breaking change to consumer code (`AdminForm.jsx`, `AdminEditor.jsx`) — they just render `error.message` directly.

### 4.1 Test impact

`src/lib/adminSchemas.test.js` has assertions like `expect(errors[0].message).toMatch(/required/i)`. These get rewritten to match the Chinese strings: `expect(errors[0].message).toMatch(/不能为空/)` etc. Mechanical 1:1 update; no logic change.

---

## 5. Top bar wiring

### 5.1 `<AdminTopBar>` props

```js
/**
 * @typedef {Object} AdminTopBarProps
 * @property {string} schemaKey - active schema, used for breadcrumb derivation
 * @property {object|null} editing - null when in list view; the item being edited (or { __new: true }) when in edit/create view
 * @property {{ status: 'idle' | 'saving' | 'saved' | 'error', prNumber?: number, prUrl?: string, errorMessage?: string }} saveStatus
 * @property {{ number: number, htmlUrl: string } | null} openPR
 * @property {() => void} onSignOut
 */
```

### 5.2 Breadcrumb derivation (Tier A pure helper)

```js
// src/components/AdminTopBar/breadcrumb.js
import { getSchema } from '../../lib/adminSchemas.js'

/**
 * Compose the breadcrumb segments for the top bar.
 *
 * @param {string} schemaKey
 * @param {object|null} editing - null in list view; item or { __new: true } in edit view
 * @returns {Array<{ label: string }>}
 *   First segment is always the root (后台). Later segments are not links.
 *
 * Examples:
 *   ('events', null)              → [{label:'后台'},{label:'活动'}]
 *   ('events', {__new:true})      → [{label:'后台'},{label:'活动'},{label:'新建活动'}]
 *   ('events', {id:'a',title:'X'})→ [{label:'后台'},{label:'活动'},{label:'X'}]
 *   ('site', null)                → [{label:'后台'},{label:'站点信息'}]
 *
 * Implementation: pulls schema.title from getSchema() (which is now Chinese
 * post-§4). For __new edge, derives noun by mapping schema.key (events→活动,
 * members→成员, …) via a small inline table. For edit edge, uses item.title
 * || item.name || item[schema.listKey] || '编辑'.
 */
export function deriveBreadcrumb(schemaKey, editing) {}
```

The helper carries a small inline noun-map (`events: '活动'`, `members: '成员'`, etc.) for the `新建{noun}` form — same 7 keys as schema registry.

### 5.3 Save-status pill (Tier A pure helper)

```js
// src/components/AdminTopBar/saveStatus.js
/**
 * Localized label + visual variant for the save-status pill.
 *
 * @param {{ status: 'idle' | 'saving' | 'saved' | 'error', prNumber?: number }} state
 * @returns {{ label: string, variant: 'idle'|'saving'|'saved'|'error', a11yLive: 'polite'|'off' }}
 *
 * Label mapping:
 *   idle   → '已保存'
 *   saving → '保存中…'
 *   saved  → '已保存 · PR #{n}' (interpolates prNumber)
 *   error  → '保存失败'
 *
 * a11yLive='polite' for saving/saved/error (announced); 'off' for idle.
 */
export function deriveSaveStatusLabel(state) {}
```

### 5.4 openPR pill

Reuses the existing `openPR` state in `Admin.jsx`. The pill renders inside `AdminTopBar` (right side, before `AdminSignOut`) with text `打开 PR #N ↗` (when set) or `暂无 PR` (when null). The same link is also kept inside `AdminNav`'s utility area (two views of the same data) — Designer may decide to drop one location; if so, top-bar wins.

### 5.5 saveStatus state lift

`AdminEditor` currently holds `saving`, `saveError`, `successMsg` locally. P8 moves the cross-cutting parts (success toast / top-level error) into `Admin.jsx` and passes a single `onSaveStatus` callback down:

```jsx
// Admin.jsx
const [saveStatus, setSaveStatus] = useState({ status: 'idle' })

<AdminTopBar
  schemaKey={activeKey}
  editing={...}
  saveStatus={saveStatus}
  openPR={openPR}
  onSignOut={handleLogout}
/>
<AdminEditor
  ...
  onSaveStatus={setSaveStatus}
  ...
/>
```

`AdminEditor` calls `onSaveStatus({status:'saving'})` immediately before any `commitContentChange`, `{status:'saved', prNumber, prUrl}` on success, `{status:'error', errorMessage}` on error (except auth-expired which calls `onAuthExpired`). AdminEditor's local state shrinks (no top-level `successMsg` or top-level `saveError`); the in-form `saveError` (shown above the form fields during a failed save retry) **stays local** — it's tied to the form lifecycle, distinct from the cross-cutting status pill.

`onSavedPR` callback is **kept** for backwards compat with the existing `Admin.jsx` openPR-tracking pattern — no semantic change.

### 5.6 Sticky positioning

`AdminTopBar` uses `position: sticky; top: 0; z-index: 10;`. Background `var(--color-bg-card)`. Border-bottom `1px solid var(--color-border)`. Height ~56px desktop. Below 768px: stacks (breadcrumb wraps; sign-out + status drop below). Designer's CSS owns exact responsive behavior.

---

## 6. AdminTable contract

```js
/**
 * @typedef {Object} TableColumn
 * @property {string} key - field key in the row object (e.g. 'title', 'date')
 * @property {string} [label] - optional Chinese column header. Defaults to key string.
 * @property {(value: unknown, row: object) => React.ReactNode} [format]
 * @property {string} [align] - 'left' | 'right' | 'center' (default 'left')
 *
 * @typedef {Object} AdminTableProps
 * @property {TableColumn[]} columns
 * @property {object[]} rows
 * @property {string} idKey - which row property is the React key + edit identity
 * @property {(row: object) => void} onEdit
 * @property {((row: object) => void) | null} onDelete - null disables delete actions (e.g., social locked schema)
 * @property {boolean} busy - disables all action buttons when true
 * @property {React.ReactNode} emptyState - JSX to render when rows.length === 0
 */

export default function AdminTable({ columns, rows, idKey, onEdit, onDelete, busy, emptyState }) {}
```

Behavior:

- `rows.length === 0` → render the `emptyState` slot, **no `<table>` element at all**.
- `onDelete === null` → hide the `✕` delete-button column (used by `social` since adding/removing platforms is V2-deferred).
- `busy === true` → all `<button>`s in rows get `disabled`.
- Action button labels: `编辑` (edit), `✕` (delete; symbol stays).
- No sort, no pagination — V1 defer.
- Caller (`AdminEditor`) maps `schema.listColumns: string[]` to `[{ key, label: COLUMN_LABEL_ZH[schemaKey]?.[key] ?? key }, ...]` before passing in. `COLUMN_LABEL_ZH` is a small inline lookup in AdminEditor (~30 entries across 7 schemas).

---

## 7. AdminEditor refactor — what shrinks, what stays

### 7.1 State that leaves AdminEditor

| State | Where it goes |
|---|---|
| `successMsg` (top-level success banner) | Replaced by `onSaveStatus({status:'saved', ...})` callback to `Admin.jsx` |
| `saveError` (top-level cross-cutting error) | Replaced by `onSaveStatus({status:'error', errorMessage})` |
| Visible saving button label (`保存中…`) | Stays inline (button-local) |

The error-inside-form-view (shown above form fields when a save attempt fails mid-edit) stays local to AdminEditor's edit branch — tied to the form lifecycle, not the cross-cutting status pill.

### 7.2 State that stays

`data`, `loading`, `loadError`, `editing`, `draft`, `saving`, in-form `saveError`, `conflict` — all stay. P8 is **not** a state-machine refactor.

### 7.3 The `onSaveStatus` contract — 5 states (Designer §2.3)

```ts
type SaveStatusUpdate =
  | { status: 'idle' }                                    // hidden in pill (no noise when clean)
  | { status: 'unsaved' }                                 // user typed in the form, nothing committed yet
  | { status: 'saving' }                                  // commitContentChange in flight
  | { status: 'saved'; prNumber: number; prUrl: string }  // 200 OK; auto-clears to 'idle' after 3 s
  | { status: 'error'; errorMessage: string }             // rejection (not auth-expired)

type AdminEditorProps = {
  schemaKey: string;
  token: string;
  branch?: string;
  onSavedPR?: (pr: {number, htmlUrl}) => void;        // unchanged from P4
  onAuthExpired?: () => void;                          // unchanged
  onSaveStatus: (update: SaveStatusUpdate) => void;    // NEW
}
```

Emit ladder:
- `unsaved` — emitted when `draft !== null && draft !== data` (cheap deep-equal at edit-form change). Cleared by transitioning to `saving` or `idle`.
- `saving` — emitted immediately before any `commitContentChange`.
- `saved` — emitted on 200; `Admin.jsx` schedules a 3 s `setTimeout` to revert to `idle` (Designer §2.3 spec).
- `error` — emitted on rejection (not auth-expired; that path resets to `idle` via `onAuthExpired`).
- `idle` — set by `Admin.jsx` itself on schema change (`useEffect([activeKey])`); AdminEditor doesn't emit it directly.

`Admin.jsx` is responsible for the auto-clear timer; the timer must `unref` (memory rule `feedback_timer_unref.md`) and clear on unmount + on subsequent state change.

---

## 8. Empty state — `◆` glyph card (Designer §4.3)

### 8.1 No per-schema illustrations

Designer §4.3 declined per-schema SVG illustrations. The single `◆` Unicode glyph (`U+25C6 BLACK DIAMOND`) is the icon for every empty state. Same glyph as the sidebar nav prefix (Designer §3.2). Rationale: font-safe, theme-neutral, zero new asset dependency, ~0 bytes (already in every CJK and basic Unicode font).

### 8.2 `<AdminEmptyState>` props

```js
/**
 * @typedef {Object} AdminEmptyStateProps
 * @property {string} title - Chinese heading (e.g., '暂无活动')
 * @property {string} [hint] - Chinese sub-copy (e.g., '点击上方按钮创建第一条活动')
 * @property {{ label: string, onClick: () => void } | null} [cta] - primary action (e.g., '+ 新建活动')
 */
```

No `schemaKey` prop — all empty states render the same `◆` icon. Caller passes pre-formatted Chinese strings (inline-string policy §3.1).

### 8.3 DOM + CSS (Designer §4.3)

```jsx
// AdminEmptyState.jsx
<div className="admin-empty-card">
  <div className="admin-empty-icon" aria-hidden="true">◆</div>
  <h3 className="admin-empty-title">{title}</h3>
  {hint && <p className="admin-empty-hint">{hint}</p>}
  {cta && (
    <button type="button" className="admin-btn-primary" onClick={cta.onClick}>
      {cta.label}
    </button>
  )}
</div>
```

```css
/* AdminEmptyState.css */
.admin-empty-card {
  border: 1px dashed var(--color-border);
  border-radius: var(--admin-radius);
  padding: 3rem 2rem;
  text-align: center;
  margin-top: 1.5rem;
}
.admin-empty-icon {
  font-size: 2.5rem;
  color: var(--color-border);
  line-height: 1;
}
.admin-empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0.75rem 0 0.375rem;
}
.admin-empty-hint {
  font-size: 0.9375rem;
  color: var(--color-text-muted);
  margin: 0 0 1rem;
}
```

### 8.4 What's removed from the file inventory

The 9 illustration JSX modules (`events.jsx`, `members.jsx`, `news.jsx`, `posts.jsx`, `social.jsx`, `site.jsx`, `about.jsx`, `_default.jsx`, `index.js`) are **not created**. The `registry.test.js` Tier A coverage entry is dropped from §9.1.

---

## 9. Test plan

### 9.1 New Tier A pure helpers (≥80% per-file all axes)

| File | Helpers covered | Edges |
|---|---|---|
| `src/components/AdminTopBar/breadcrumb.test.js` | `deriveBreadcrumb` | (a) list view single-segment; (b) edit view 3 segments; (c) `__new:true` edge; (d) item missing title falls back to listKey; (e) singleton schema (site/about) — 2 segments only; (f) unknown schemaKey returns just `[{label:'后台'}]` |
| `src/components/AdminTopBar/saveStatus.test.js` | `deriveSaveStatusLabel` | (a) idle → hidden (label = '', a11yLive='off'); (b) unsaved → '● 未保存', a11yLive='off' (informational, not a status update); (c) saving → '保存中…', polite; (d) saved with prNumber → '✓ 已保存 · PR #N', polite; (e) saved missing prNumber → defensive label `'✓ 已保存'`; (f) error → '✗ 保存失败', polite; (g) unknown status → falls back to idle defaults |

### 9.2 Tier B new components (≥80% branch + function)

| File | Coverage focus |
|---|---|
| `AdminTopBar.test.jsx` | renders breadcrumb segments (Chinese); renders correct save-status pill class for each of 5 states; renders `查看网站 ↗` ghost link; renders openPR pill when set; renders `无待合并 PR` muted placeholder when null; **no sign-out** rendered (sign-out lives in sidebar); ARIA: `<nav aria-label="...">` for breadcrumb, save-status has `role="status"` for `saving`/`saved`/`error` variants |
| `AdminEmptyState.test.jsx` | renders `◆` glyph with `aria-hidden="true"`; renders title + hint Chinese props; CTA button click triggers handler; CTA absent when prop not provided; dashed-border card class present |
| `AdminTable.test.jsx` | renders rows; column headers in correct order; click `编辑` calls `onEdit(row)`; click `✕` calls `onDelete(row)`; `onDelete=null` hides delete column; `busy=true` disables all buttons; `rows=[]` renders the empty-state slot, NOT the table |
| `AdminBrandPanel.test.jsx` | renders `后台` wordmark + `BD!NA 后台` subline; logo `<img>` has `aria-hidden="true"` and `alt=""`; img `src` is `/panda.svg` or `/logo.png` per §1.6 |

### 9.3 Tier B/C modified components (regression)

Existing tests in `AdminEditor.test.jsx`, `AdminNav.test.jsx`, `AdminLogin.test.jsx`, `AdminForm.test.jsx`, `AdminAssetUploader.test.jsx`, `AdminJsonFallback.test.jsx`, `Admin.test.jsx` MUST be updated to:

1. Match Chinese strings: `getByText('+ 新建')` rather than `getByText('+ Add new')`. (Tests do **not** import `t()`; they query Chinese inline text directly.)
2. Cover the new prop `onSaveStatus` on `AdminEditor` — verify it's called with `{status:'saving'}` immediately before any save call and with `{status:'saved'}` on success.
3. Cover theme inheritance: render `<Admin>` inside `<ThemeProvider initialTheme="roselia">`; assert the document's `data-theme` is set; assert the theme tokens are applied (jsdom doesn't fully implement getComputedStyle for vars, so probe via inline style on a sentinel element if needed — same approach Phase 3 used in `ThemeContext.test.jsx`).
4. **English-leakage scan** (replaces P4's i18n switch test): render `<Admin>`, log in, navigate each schema's list and edit views; for each rendered DOM, run a regex against `document.body.textContent` matching English-letter words `\b[A-Za-z]{3,}\b`; the matches must all be on the whitelist — `GitHub`, `PAT`, `Token`, `Personal`, `Access`, `JSON`, `URL`, `bangdream-na`, `repo`, `ghp`, `https`, `chore`, `feat`, `fix`, `content`, schema-key columns (`id`, `title`, `date`, `name`, `role`, `tag`, `image`, `bands`, `type`, `platform`, `enabled`, `body`, `summary`, `bio`, `oshi`, `city`, `description`, `links`, `location`, `socials`, `avatar`, `qrImage`, `sourceUrl`, `ticketUrl`, `endDate`, `discordInvite`, `communityName`, `communityNameZh`, `communityNameJp`, `mission`, `history`, `faq`, `coc`, `joinInstructions`, `datePosted`, etc.), enum option tokens (`concert`, `fanmeet`, `con`, `online`, `meetup`, `organizer`, `mod`, `member`, `cover-band`, `announcement`, `event`, `community`, `release`, `update`, `discord`, `qq`, `xiaohongshu`, `x`, `wechat`, `instagram`, `youtube`, `tiktok`, `bilibili`), and known help-text technical fragments (`ISO`, `lowercase`, `dashes`, `multi-day`). Architect's call: this whitelist is **explicit** (committed alongside the test) — when Developer adds a new field key, they update the whitelist. The test fails noisily on anything else, which catches genuine English chrome leaks.

This scan replaces the P4 i18n switch test and is the **memory rule** `feedback_i18n_scope_full_ui_chrome_default.md` enforcement for admin: i18n scope says "full UI chrome by default" — admin is a deliberate scope-exclusion, but English leakage still must be caught (operator wants Chinese-only UX). The whitelist documents the deliberate exceptions.

### 9.4 Reviewer-only static scans

```bash
# A. No hex literals in admin CSS (except rgba shadows + the one --admin-error declaration).
grep -rnEH '#[0-9a-fA-F]{3,8}' \
  src/components/Admin*/ src/pages/Admin.css 2>/dev/null \
  | grep -v 'rgba\(0' \
  | grep -v '\-\-admin-error: #e53e3e' \
  || true
# Should print zero remaining hits.

# B. No console.log / no localStorage / no Authorization header in admin chrome.
grep -rn 'console\.log\|localStorage\|Authorization' \
  src/components/Admin*/ src/pages/Admin.* \
  | grep -v 'src/lib/githubApi' || true
# Should print zero hits.

# C. No t() calls in admin chrome (admin is Chinese-inline, not localized).
grep -rn "from '\\.\\./\\.\\./lib/uiLanguage\\|t(" \
  src/components/Admin*/ src/pages/Admin.jsx \
  | grep -v '\\.test\\.jsx' \
  | grep -v 'fieldKey' \
  || true
# Should print zero hits — admin must NOT call t().

# D. No new admin keys in i18n.json.
grep -nE '"admin\\.' src/data/i18n.json || true
# Should print zero hits.
```

### 9.5 On-device verification (Reviewer)

`npm run dev` → log in → switch theme via the public site's `<ThemeSwitcher>` → return to `/admin` → confirm admin chrome (sidebar active state, save button, top bar pill) all retint to the active band theme. Save a real edit → confirm the save-status pill animates `idle → saving → saved` and `已保存 · PR #N` link points at the right PR. Confirm every visible chrome string is Chinese (no English chrome leakage outside the whitelist).

### 9.6 Coverage targets

Same gates as P4: global 80/80/80/80 in `vite.config.js`. Tier A files **per-file** ≥80% all axes. Tier B/C contribute to the global average; not enforced per-file but the new Tier B test suites exist and pass.

---

## 10. Mobile / responsive

P8 inherits P4 §1.2 (desktop-first ≥768px). No mobile drawer added in P8. Below 768px:

- Sidebar stacks above content (or scrolls horizontally) — `AdminNav.css` adds `@media (max-width: 768px)` block.
- Top bar reflows: breadcrumb wraps; status pill drops below.
- A `建议在桌面端使用` notice shown below the top bar at <640px (Chinese inline).

If Designer's spec specifies a drawer layout, **Architect approves the override** but adds those file changes (e.g., `AdminMobileDrawer/`) to the iteration contract before P8.5.

---

## 11. File-by-file plan (CREATE / MODIFY / DELETE)

### 11.1 CREATE (16 files)

```
src/components/AdminTopBar/AdminTopBar.jsx
src/components/AdminTopBar/AdminTopBar.css
src/components/AdminTopBar/AdminTopBar.test.jsx
src/components/AdminTopBar/breadcrumb.js
src/components/AdminTopBar/breadcrumb.test.js
src/components/AdminTopBar/saveStatus.js
src/components/AdminTopBar/saveStatus.test.js

src/components/AdminEmptyState/AdminEmptyState.jsx
src/components/AdminEmptyState/AdminEmptyState.css
src/components/AdminEmptyState/AdminEmptyState.test.jsx

src/components/AdminTable/AdminTable.jsx
src/components/AdminTable/AdminTable.css
src/components/AdminTable/AdminTable.test.jsx

src/components/AdminBrandPanel/AdminBrandPanel.jsx
src/components/AdminBrandPanel/AdminBrandPanel.css
src/components/AdminBrandPanel/AdminBrandPanel.test.jsx
```

(Was 28; dropped: 9 illustration JSX modules + `illustrations/index.js` + `illustrations/registry.test.js` (10 files) + `AdminSignOut/{jsx,css,test.jsx}` (3 files) — total 13 dropped.)

### 11.2 MODIFY (21 files)

```
src/pages/Admin.jsx
src/pages/Admin.css
src/pages/Admin.test.jsx

src/components/AdminNav/AdminNav.jsx
src/components/AdminNav/AdminNav.css
src/components/AdminNav/AdminNav.test.jsx

src/components/AdminEditor/AdminEditor.jsx
src/components/AdminEditor/AdminEditor.css
src/components/AdminEditor/AdminEditor.test.jsx

src/components/AdminLogin/AdminLogin.jsx
src/components/AdminLogin/AdminLogin.css
src/components/AdminLogin/AdminLogin.test.jsx

src/components/AdminForm/AdminForm.jsx
src/components/AdminForm/AdminForm.css
src/components/AdminForm/AdminForm.test.jsx

src/components/AdminAssetUploader/AdminAssetUploader.jsx
src/components/AdminAssetUploader/AdminAssetUploader.css
src/components/AdminAssetUploader/AdminAssetUploader.test.jsx

src/components/AdminJsonFallback/AdminJsonFallback.jsx
src/components/AdminJsonFallback/AdminJsonFallback.css

src/lib/adminSchemas.js
src/lib/adminSchemas.test.js
```

(Was 23; dropped `src/theme/themes.js` per §2.4 Designer alignment.)

### 11.3 DELETE

None.

### 11.4 Forbidden touches in P8

`src/lib/githubApi.js`, `src/lib/githubApi.test.js`, `src/lib/uiLanguage.js`, `src/data/i18n.json` (no `admin.*` keys added), `src/data/*.json` content files, `src/theme/themes.js`, `src/theme/themes.test.js`, `src/theme/ThemeContext.jsx`, `src/theme/theme.css`, `vite.config.js`, `eslint.config.js`, `vercel.json`, `index.html`, `package.json`, `package-lock.json`, all non-admin pages and components.

---

## 12. Iteration contract for Developer (Task #3)

Each deliverable is one PR-ready commit. After each commit the test suite (`npm test`) MUST pass. Push to remote after each commit (memory rule `feedback_push_and_save.md`). Conventional Commit format, no `Co-Authored-By` line.

### P8.1 — DROPPED

Original P8.1 added `--color-error`/`--color-error-on` tokens to all 8 themes. Designer §1 declined; error red is a local `--admin-error: #e53e3e` declared in `Admin.css :root` only. **If Developer already shipped P8.1 to remote**: revert that commit (`git revert`) before P8.2; `themes.js` must be byte-identical to pre-P8.

### P8.2 — adminSchemas.js Chinese pass

- Modify `src/lib/adminSchemas.js`: rewrite every operator-visible string (schema `title`, every `field.label`, `field.help`, `validateItem` error messages) to Chinese inline. Schema keys, field keys, `type`, `options`, validation rules unchanged.
- Modify `src/lib/adminSchemas.test.js`: update assertion strings (`/required/i` → `/不能为空/`, etc.).
- **Acceptance**: `adminSchemas.test.js` green. AdminForm/AdminEditor still render (they now show Chinese labels via the schemas) — but their existing tests query English text and will fail. They get fixed in P8.7+ commits, so this commit briefly leaves the **component** test files red. Per memory rule (per-commit test green), Developer **bundles the schema-side English-string-update for AdminForm/AdminEditor's existing test assertions into THIS commit** — the test-text update is mechanical (`getByText('Title')` → `getByText('标题')`). This keeps `npm test` green per-commit.
- **Commit**: `refactor(admin): translate adminSchemas labels to chinese`

### P8.3 — AdminEmptyState component (◆ glyph card)

- Create `AdminEmptyState.jsx` + `.css` + `.test.jsx` per §8 (single `◆` glyph; no per-schema illustrations; no `schemaKey` prop).
- **Acceptance**: AdminEmptyState tests green. Component mountable but not yet used.
- **Commit**: `feat(admin): add AdminEmptyState with diamond glyph card`

### P8.4 — AdminTable component

- Create `AdminTable.jsx` + `.css` + `.test.jsx`.
- **Acceptance**: AdminTable tests green. Component mountable but not yet wired into AdminEditor.
- **Commit**: `feat(admin): add reusable AdminTable component`

### P8.5 — AdminTopBar component (with helpers)

- Create `AdminTopBar.jsx` + `.css` + `.test.jsx` + `breadcrumb.js` + `breadcrumb.test.js` + `saveStatus.js` + `saveStatus.test.js`.
- **Acceptance**: All AdminTopBar tests green. Component mountable but not yet placed in Admin.jsx.
- **Commit**: `feat(admin): add AdminTopBar with breadcrumb + save-status pill`

### P8.6 — AdminBrandPanel only (no AdminSignOut)

- Create `AdminBrandPanel.jsx` + `.css` + `.test.jsx` per Designer §3.1 (panda logo img + `后台` wordmark + `BD!NA 后台` subline).
- Asset: confirm `public/panda.svg` exists, OR use `/logo.png` per §1.6. If neither passes the on-device smoke test, ping Designer for an asset commit.
- **AdminSignOut DROPPED**: sign-out stays in `AdminNav` per Designer §3.3 (restyled CSS, not a new component).
- **Acceptance**: tests green; AdminBrandPanel mountable but not yet wired.
- **Commit**: `feat(admin): add AdminBrandPanel`

### P8.7 — Wire AdminEditor to use AdminTable + AdminEmptyState + onSaveStatus + Chinese chrome

- Modify `src/components/AdminEditor/AdminEditor.jsx`: replace inline `<table>` with `<AdminTable>`; replace inline empty paragraph with `<AdminEmptyState>`; remove top-level success/error banners; add `onSaveStatus` prop and call it. Replace English chrome strings (`+ Add new`, `Edit`, `Cancel`, `Save (commit + PR)`, `Saving…`, `← Back to {title}`, conflict dialog) with Chinese inline. Add `COLUMN_LABEL_ZH` inline lookup for AdminTable headers.
- Modify `src/components/AdminEditor/AdminEditor.css`: remove now-duplicated rules; replace remaining literals with vars.
- Modify `src/components/AdminEditor/AdminEditor.test.jsx`: cover `onSaveStatus` calls; cover empty state slot; update assertions to Chinese strings.
- **Acceptance**: AdminEditor tests green; old behavior preserved (load, list, edit, save, conflict still work).
- **Commit**: `refactor(admin): wire AdminEditor to AdminTable + onSaveStatus + chinese chrome`

### P8.8 — Wire AdminNav: AdminBrandPanel + Chinese chrome + restyled sign-out

- Modify `src/components/AdminNav/AdminNav.jsx`: replace inline brand block with `<AdminBrandPanel />`; **keep** the bottom-anchored sign-out button (Designer §3.3); drop the `View Site ↗` / `Open PR ↗` utility links (they move to top bar). Replace English strings with Chinese inline (`登出` for sign-out etc.). Prefix each schema button label with `◆ ` (Designer §3.2). Schema button labels come from `schema.title` (Chinese after P8.2).
- Modify `src/components/AdminNav/AdminNav.css`: sidebar width = `var(--admin-sidebar-width)`; replace literals with vars; sign-out button gets the §3.3 restyle (transparent bg, hover red via `--admin-error`).
- Modify `src/components/AdminNav/AdminNav.test.jsx`: update for new structure + Chinese assertions; assert `◆ ` prefix appears once per schema button.
- **Acceptance**: AdminNav tests green; sidebar renders with brand panel + Chinese labels + restyled sign-out at bottom.
- **Commit**: `refactor(admin): use AdminBrandPanel + chinese chrome + restyled signout in AdminNav`

### P8.9 — Wire Admin.jsx: top bar + saveStatus state lift + toast

- Modify `src/pages/Admin.jsx`: introduce `saveStatus` state with 5 variants per §7.3 (`idle`/`unsaved`/`saving`/`saved`/`error`); mount `<AdminTopBar>`; wire `onSaveStatus` to AdminEditor; render success/error toast (Designer §7) consuming the same `saveStatus`. Schedule a 3 s `setTimeout` to revert `saved → idle` (with `unref`/cleanup per memory rule). No sign-out wiring on top bar.
- Modify `src/pages/Admin.css`: declare the 6 new `:root` tokens per §2.4; grid layout `grid-template-columns: var(--admin-sidebar-width) 1fr`; 3px gradient stripe at top; replace literals with vars.
- Modify `src/pages/Admin.test.jsx`: cover top bar mounting; saveStatus propagation across all 5 states; toast appearance/dismissal; the 3 s auto-clear.
- **Acceptance**: full admin chrome end-to-end works in tests; manual `npm run dev` smoke check.
- **Commit**: `feat(admin): wire AdminTopBar + lift saveStatus + toast into Admin shell`

### P8.10 — AdminLogin Chinese chrome + theme sweep

- Modify `src/components/AdminLogin/AdminLogin.jsx`: every visible string → Chinese inline (`后台面板`, `请输入 GitHub Personal Access Token 继续。`, `登录`, etc. — see §3 for full mapping).
- Modify `src/components/AdminLogin/AdminLogin.css`: replace `#d33`/`#a00`/`#fff`/`#6366f1` with tokens.
- Modify `src/components/AdminLogin/AdminLogin.test.jsx`: update assertions.
- **Acceptance**: tests green; manual smoke check shows Chinese login.
- **Commit**: `refactor(admin): chinese chrome + theme tokens in AdminLogin`

### P8.11 — AdminForm + AdminAssetUploader + AdminJsonFallback Chinese chrome + theme sweep

- Modify all three: visible strings → Chinese inline; CSS literals → vars; tests updated.
- AdminForm `<select>` placeholder → `请选择…`; enum option labels via inline `EVENT_TYPE_LABEL_ZH` etc. (§3.3).
- AdminAssetUploader: `拖拽图片到此处或点击上传`, `上传中…`, `替换`, `文件超过 5 MB`, `不支持的文件类型`.
- AdminJsonFallback: `JSON 解析成功`, `无效 JSON：…` prefix.
- **Acceptance**: tests green.
- **Commit**: `refactor(admin): chinese chrome + theme tokens in form + uploader + json fallback`

### P8.12 — DOM English-leakage scan test

- Create or extend `src/pages/Admin.test.jsx` with the English-leakage scan (§9.3 step 4): mount admin, log in, navigate each schema's list view + edit view; for each rendered DOM, assert `document.body.textContent` matches against the explicit whitelist of allowed English tokens.
- **Acceptance**: scan passes; if it fails, Developer translates the missed string and adds it to admin chrome (or, if it's a deliberate exception, adds it to the whitelist with a comment). This commit may iterate a few times.
- **Commit**: `test(admin): assert no english leakage in admin chrome`

### P8.13 — Reviewer prep: docs + scan script

- Update `docs/p8-architecture.md` if any decisions changed during implementation.
- Add `scripts/p8-static-scan.sh` (or `.cjs`) running the four scans from §9.4 — Reviewer runs this script for the audit.
- **Acceptance**: scans pass; doc accurate.
- **Commit**: `docs(admin): record P8 architecture and reviewer scans`

**Total commits**: 13. Each commit is independently shippable (tests pass, npm run dev works at that snapshot). Developer pushes after every commit per memory rule `feedback_push_and_save.md`.

---

## 13. Resolved open issues / Architect defaults

| Issue | Decision | Rationale |
|---|---|---|
| Admin language | **Chinese inline strings, no t()** | Operator-only console; user 西瓜 is Chinese-native. Bilingual ceremony. Locked by team-lead 2026-05-03. |
| `useOpenPR` hook extraction | **Skipped** | Single caller, ~6 lines of state — yagni. |
| Per-schema illustrations vs single shared | **Single `◆` glyph (Designer §4.3 override)** | No new SVG asset language; font-safe; theme-neutral; zero deps. Designer's call wins. |
| Save status as banner vs pill | **Pill in top bar + toast on event spike** | Pill is always-visible mini status (5 states); toast (Designer §7) is the per-save-completion spike with PR link. |
| Sign-out button location | **Sidebar bottom (Designer §3.3 override)** | Designer kept P4 placement, restyled with red hover via `--admin-error`. Architect's earlier "lift to top bar" was overridden. |
| Theme switcher in admin | **Not added** | Maintainer changes theme on the public site; admin chrome inherits silently. |
| Lang toggle in admin | **Not added** | Admin is Chinese-only; LangToggle is for the public site. |
| Mobile drawer | **Deferred to V2** | Admin is desktop-first. |
| New `--color-success` token | **Not added** | Reuse `--color-primary` tinted with 10% mix for "success" surfaces; one less token. |
| `--color-surface` orphan reference | **Replace with `--color-bg-card`** | `--color-surface` was never defined; refs were always resolving to fallback `#fff`. |
| `validateItem` return shape | **Unchanged: `{ fieldKey, message }`** | Chinese strings stored inline at validateItem call site; no `messageKey` indirection needed without bilingual support. |
| Theme tokens vs local error hex | **Local `--admin-error: #e53e3e` in `Admin.css :root` (Designer §1 override)** | Don't pollute 8 themes with a new contract for one operator-visible UI signal; one local declaration line is the single allowed exception in the §9.4-A scan. |
| Save status state count | **5 states (Designer §2.3)**: `idle` (hidden) / `unsaved` / `saving` / `saved` (3s auto-clear) / `error` | Adds `unsaved` (mid-edit dirty indicator) + auto-clear timer; both responsibilities on `Admin.jsx`. |
| Schema field keys (`id`, `title`, `date` …) — translate column headers? | **Optional override via `column.label`** | AdminTable accepts a Chinese label per column; AdminEditor passes a small inline `COLUMN_LABEL_ZH` map. Where no label is provided, the field key shows (acceptable for operator-visible technical column headers; see §3.4). |
| Enum option display labels | **Per-schema inline lookup table** in AdminForm | ~25 enum-label pairs across all schemas; mechanical, no abstraction. |
| English-leakage gate | **Whitelist-based DOM scan** | Replaces P4's i18n switch test; whitelist documents deliberate English exceptions (`GitHub`, `PAT`, schema keys, enum tokens). |

---

## 14. Acceptance gate (Reviewer Task #4)

Reviewer APPROVES only when ALL of:

- [ ] Static scans (§9.4 A, B, C, D) all pass with zero non-whitelisted hits.
- [ ] DOM English-leakage scan in `Admin.test.jsx` green; whitelist explicit and minimal.
- [ ] `npm run test:coverage` exits 0; per-file ≥80% on Tier A files (`adminSchemas.js`, `breadcrumb.js`, `saveStatus.js`, `illustrations/index.js`).
- [ ] On-device smoke (§9.5): theme retint visible in admin sidebar / top bar / save button when switching theme on public site; every visible chrome string is Chinese (whitelist exceptions only); save flow shows status pill `idle → saving → saved · PR #N`.
- [ ] All commits on `feat/phase-8` follow conventional-commit format and have NO `Co-Authored-By` line. (Total 12 deliverables P8.2-P8.13; P8.1 is dropped — see §12.)
- [ ] No `.claude/` references in committed files.
- [ ] No new npm deps (`package.json` / `package-lock.json` diff is empty for `dependencies` and `devDependencies`).
- [ ] User-facing pages (`Home`, `Events`, `Members`, `News`, `About`) render unchanged — admin route does not regress them.
- [ ] `src/data/i18n.json` contains **zero `admin.*` keys** added by P8 (Reviewer grep `'"admin\.'` returns no hits). Unrelated edits to user-facing keys in this file are Phase-5-owned and don't block P8 review.
- [ ] `src/lib/githubApi.js`, `src/lib/uiLanguage.js`, **`src/theme/themes.js`**, **`src/theme/themes.test.js`** are **byte-identical** to their pre-P8 state.
- [ ] No `t()` import or call inside `src/components/Admin*/` or `src/pages/Admin.jsx`.
- [ ] Admin CSS hex-literal scan (§9.4-A) returns zero hits except the single `--admin-error: #e53e3e;` declaration in `Admin.css :root`.
- [ ] `public/panda.svg` (or `/logo.png`) is referenced from `<AdminBrandPanel>` and the image actually loads in on-device smoke.
- [ ] Code review summary written to `.claude/code-reviews.md` per memory rule `feedback_code_review_log.md`.

Once APPROVED: per memory rule `feedback_never_autonomous_merge_to_default_branch.md`, team-lead opens a PR (does NOT auto-merge); user reviews and merges. Vercel auto-deploys.

---

## 15. Designer alignment (Task #1, completed)

Designer's `docs/p8-design.md` landed and overrode three Architect defaults. This doc has been re-aligned (search "Designer §" for cross-references). Summary of overrides:

| Architect default | Designer override | Section impact |
|---|---|---|
| Sidebar 240px | **260px** via `--admin-sidebar-width` | §1, §2.4, §11 |
| Add `--color-error` to all 8 themes | **Reject** — single `--admin-error: #e53e3e` in `Admin.css :root` | §2.4 (rewritten); §11 (drops `themes.js`); §12 (P8.1 dropped); §14 (themes.js byte-identical) |
| Per-schema SVG illustrations | **Reject** — single `◆` Unicode glyph for every empty state | §1.1 (drops 10 illustration files); §8 (rewritten); §9.1 (drops registry test); §11.1 (16 new files instead of 28); §12 (P8.3 simpler) |
| Sign-out moves to top bar | **Reject** — sign-out stays in sidebar, restyled per §3.3 | §1.1 (drops `AdminSignOut`); §1.2 (AdminNav keeps sign-out); §11.1 (drops 3 files); §12 (P8.6 / P8.8 reworked) |
| Top bar = breadcrumb + saveStatus + openPR | **Add** `查看网站 ↗` ghost link as 3rd element; saveStatus is **5-state** (idle hidden / unsaved / saving / saved with 3s auto-clear / error) | §5, §7.3 |
| Toast handling | Designer §7 specifies bottom-right toast for save success/error spike — `Admin.jsx` renders both top-bar pill (always) and toast (event spike) | §1.2 Admin.jsx, §7, §12 P8.9 |
| Brand panel content | Designer §3.1 specifies `<img src="/panda.svg">` + `后台` wordmark + `BD!NA 后台` subline | §1.1, §1.6 (asset dependency flagged), §12 P8.6 |
| Sidebar nav prefix | Designer §3.2: `◆ ` prefix on every schema button | §12 P8.8 |
| List header count badge | Designer §4.2: `{N} 条` count badge next to schema title | §1.2 AdminEditor, §12 P8.7 |

Architect's notes for Developer:
- Designer's spec is the visual binding contract; this doc is the structural binding contract. Where they reference each other, both are authoritative.
- Designer's full rendering specs (toast position, spinner CSS, focus ring offsets, contrast notes for each band theme, button system tokens) are in `docs/p8-design.md` §1-§9 — Developer reads both docs side-by-side.
- The `public/panda.svg` asset gap is the only blocking issue Architect can't resolve unilaterally; if Developer hits it, fall back to `/logo.png` and ping Designer for an asset commit per §1.6.

---

**End of P8 architecture spec.**
