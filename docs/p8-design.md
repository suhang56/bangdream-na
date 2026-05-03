# bangdream-na Phase 8 — Admin Panel Redesign Spec

**Status**: Designer deliverable for Task #1 in team `bangdream-na-phase8`. Replaces visual treatment sections of `docs/p4-design.md`. Architecture contracts in `docs/p4-architecture.md` remain intact — this doc constrains the Architect's CSS/token translation only.

**Problem statement**: P4 admin shipped functional but visually broken — ghosted sidebar text, generic SaaS violet "+ Add new" button, weak hierarchy, invisible "Sign out", no brand identity, italic empty states, 224px sidebar too narrow, no top bar, no list/table layout polish.

**Design north star**: dark, theme-aware, panda-logo DNA — feels like the rest of bangdream.org, works in cockpit-conditions (fast input, glanceable data, minimal taps).

---

## 1. Design tokens — reuse, no hardcodes

**All colors must reference CSS custom props from `src/theme/themes.js`. Zero hardcoded hex values in admin CSS.**

Token inventory available to admin:

| Token | Role in admin |
|---|---|
| `--color-bg` | Shell background, sidebar background |
| `--color-bg-card` | Content area background, form card backgrounds |
| `--color-text` | Primary labels, table cell text, headings |
| `--color-text-muted` | Secondary labels, placeholder text, help text, empty-state copy |
| `--color-primary` | Active nav left-border, primary action buttons, links, focus rings |
| `--color-accent` | Badge highlights, tag chips, PR-status indicator |
| `--color-border` | All dividers, input borders, table row separators |
| `--gradient-hero` | Top-bar gradient stripe (thin, 3px, opacity 0.6) — brand signal without noise |
| `--color-on-primary` | Text on primary-colored buttons |
| `--color-on-accent` | Text on accent-colored chips |

**Derived tokens** (declare in `Admin.css` root scope, not per-component):
- `--admin-sidebar-width: 260px` — wider than P4's 224px; accommodates schema labels without clipping
- `--admin-topbar-height: 52px` — consistent spacing anchor for content padding-top
- `--admin-content-max: 900px` — form column width cap; prevents ultra-wide single-column forms
- `--admin-radius: 8px` — shared border-radius for cards, inputs, buttons
- `--admin-input-bg: color-mix(in srgb, var(--color-bg-card) 70%, var(--color-bg) 30%)` — input field background, slightly recessed
- `--admin-error: #e53e3e` — only hardcoded exception; semantic error red not in theme tokens

**Fallbacks**: every `color-mix()` usage must have an `@supports not (background: color-mix(...))` fallback block using the base token directly.

---

## 2. Shell layout

### 2.1 Desktop layout (≥768px)

```
┌──────────────────────────────────────────────────────────────────┐
│ [gradient stripe — 3px top bar, full width]                      │
├──────────────────┬───────────────────────────────────────────────┤
│                  │  顶栏：面包屑 + 保存状态 + PR 链接 [52px]     │
│  Sidebar         ├───────────────────────────────────────────────┤
│  260px           │                                               │
│  fixed-left      │  Content area (max 900px, centered in fluid)  │
│  full-height     │                                               │
│                  │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

- Shell: `display: grid; grid-template-columns: var(--admin-sidebar-width) 1fr;`
- Top gradient stripe: `height: 3px; background: var(--gradient-hero); opacity: 0.6;` spans full width above both columns via negative margin or separate row
- Sidebar: `background: var(--color-bg); border-right: 1px solid var(--color-border); position: sticky; top: 0; height: 100vh; overflow-y: auto;`
- Content column: `background: var(--color-bg-card);` provides a subtle lift from sidebar
- Top bar inside content column: `height: var(--admin-topbar-height); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; padding: 0 2rem;`
- Content area: `padding: 2rem clamp(1rem, 4vw, 2.5rem); max-width: var(--admin-content-max); margin: 0 auto;`

### 2.2 Mobile layout (<768px)

- Grid collapses: sidebar hidden off-screen (`transform: translateX(-100%)`), content takes full width
- Top bar visible at all times: `[≡]` hamburger left, schema title center, `[Sign out]` right
- Hamburger tap: sidebar slides in as overlay drawer (`transform: translateX(0)`), backdrop `rgba(0,0,0,0.5)`, click-out closes
- `@media (prefers-reduced-motion: reduce)`: no transition on drawer, snap open/close
- Body scroll lock when drawer open
- Top bar height `var(--admin-topbar-height)` unchanged on mobile

### 2.3 Top bar (new in P8 — absent in P4)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  后台 / 活动             [● 未保存]               [查看网站 ↗]  [PR #4 ↗]        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Left to right:
- **面包屑 (Breadcrumb)**: `后台 / 活动` — "后台" links to `/admin`; schema name (e.g. `活动`) is plain text (current location). `font-size: 0.875rem;`
- **保存状态指示器 (Save status indicator)** (center-left, inline after breadcrumb separator):
  - Idle / saved: hidden (no noise when clean)
  - Unsaved changes: `● 未保存` — `color: var(--color-text-muted); font-size: 0.8rem;` with `●` in `color: var(--color-accent);`
  - Saving in flight: `保存中…` — `color: var(--color-text-muted); font-size: 0.8rem;` (spinner prepended in impl)
  - Just saved (3s auto-clear): `✓ 已保存` — `color: var(--color-accent); font-size: 0.8rem;`
  - Error: `✗ 保存失败` — `color: var(--admin-error); font-size: 0.8rem;`
- **Right slot**: `[查看网站 ↗]` ghost button + `[PR #N ↗]` accent pill or `无待合并 PR` in muted text
  - PR pill: `background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent); border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent); border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.75rem; font-weight: 600; text-decoration: none;`
  - "无待合并 PR": `color: var(--color-text-muted); font-size: 0.8rem; font-style: normal;`

All top-bar text base: `font-size: 0.875rem; color: var(--color-text-muted);` except breadcrumb active segment `color: var(--color-text); font-weight: 600;`

**Theme switcher and lang toggle**: NOT rendered in admin top bar. Per P4 locked decision (§1.7 of p4-design.md), admin chrome does not render `<ThemeSwitcher>` or `<LangToggle>`. User changes theme/lang from the public site. Admin inherits the persisted preference passively.

---

## 3. Sidebar redesign

### 3.1 Structure (top to bottom)

```
┌───────────────────────────────┐
│  [panda logo 28px]  后台      │  ← logo row: img + wordmark
│  BD!NA 后台                   │  ← subline, muted
├───────────────────────────────┤
│  ▌ ◆ 活动                     │  ← active: left border + tinted bg
│    ◆ 成员                     │
│    ◆ 新闻                     │
│    ◆ 帖子                     │
│    ◆ 社媒                     │
│    ◆ 站点                     │
│    ◆ 关于                     │
├───────────────────────────────┤
│  登出                         │  ← bottom, sticky
└───────────────────────────────┘
```

- Logo row: `<img src="/panda.svg" width="28" height="28" alt="">` (decorative, aria-hidden) + `<span>后台</span>` in `font-weight: 700; color: var(--color-text);`
- Subline: `BD!NA 后台` in `font-size: 0.72rem; color: var(--color-text-muted); letter-spacing: 0.04em;`
- Logo block bottom border: `1px solid var(--color-border);`

### 3.2 Nav button specs

- Each schema button: `<button role="menuitem">` inside `<nav aria-label="Admin sections">`
- Default state: `background: transparent; color: var(--color-text-muted); border-left: 3px solid transparent; padding: 0.6rem 1rem; border-radius: 0; font-size: 0.9375rem; font-weight: 400; width: 100%; text-align: left;`
- Hover: `color: var(--color-text); background: color-mix(in srgb, var(--color-primary) 6%, transparent);`
- Active: `color: var(--color-text); font-weight: 600; background: color-mix(in srgb, var(--color-primary) 12%, transparent); border-left-color: var(--color-primary);`
- Focus-visible: `outline: 2px solid var(--color-primary); outline-offset: -2px;`
- Touch target: min-height `44px`
- NO italics. NO generic SaaS violet override. Color comes from `--color-primary` (theme-driven).
- Schema label icon: single Unicode symbol prefix for quick scan — `◆ Events`, `◆ Members`, etc. Same `◆` character across all (not per-band emoji — keeps it neutral and avoids font fallback risk)

### 3.3 Sign out button

- Position: `margin-top: auto;` at flex column bottom
- Style: `background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted); padding: 0.5rem 1rem; border-radius: var(--admin-radius); font-size: 0.875rem; width: 100%;`
- Hover: `border-color: var(--admin-error); color: var(--admin-error);` — destructive affordance on hover only
- NOT muted, NOT italic, NOT invisible against dark bg — passes 4.5:1 contrast on all 8 themes verified by token values

---

## 4. Collection list view redesign

### 4.1 Table layout

- Full-width `<table>` replacing P4's implicit flex list
- `<thead>`: `background: color-mix(in srgb, var(--color-bg) 60%, var(--color-bg-card) 40%); border-bottom: 2px solid var(--color-border);`
- `<th>`: `font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); padding: 0.625rem 1rem;`
- `<tr>` hover: `background: color-mix(in srgb, var(--color-primary) 4%, transparent);`
- `<td>`: `font-size: 0.9375rem; color: var(--color-text); padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border);`
- Primary ID column: `font-weight: 600; font-family: ui-monospace, monospace; font-size: 0.85rem; color: var(--color-text-muted);`
- Action column (`Edit` / `✕`): right-aligned, `width: 120px;`
- `编辑` button: text button, `color: var(--color-primary); background: transparent; border: none; font-size: 0.875rem; cursor: pointer; padding: 0.25rem 0.5rem;`
- `删除` button: `color: var(--color-text-muted);` → hover `color: var(--admin-error);`
- Disabled state (save in flight): all action buttons `opacity: 0.4; pointer-events: none;`

### 4.2 List header bar

```
┌─────────────────────────────────────────────────────┐
│  活动  (12 条)                        [+ 新建活动]   │
└─────────────────────────────────────────────────────┘
```

- Title: `font-size: 1.25rem; font-weight: 700; color: var(--color-text);`
- Count badge: `{N} 条` — `font-size: 0.8rem; color: var(--color-text-muted); margin-left: 0.5rem;`
- `[+ 新建{schema}]` primary button (see §6 button system)
- Bottom border: `2px solid var(--color-border);`

### 4.3 Empty state redesign

Replace P4's sad italics with:

```
┌─────────────────────────────────────────────┐
│                                             │
│              ◆                              │  ← schema icon, large, muted
│                                             │
│           暂无活动                          │  ← plain, non-italic
│   点击上方按钮创建第一条活动                │  ← subtitle
│                                             │
│           [+ 新建活动]                      │  ← same primary CTA
│                                             │
└─────────────────────────────────────────────┘
```

- Icon: `font-size: 2.5rem; color: var(--color-border);` — uses same `◆` glyph from nav
- Title: `font-size: 1.125rem; font-weight: 600; color: var(--color-text); margin: 0.75rem 0 0.375rem;`
- Subtitle: `font-size: 0.9375rem; color: var(--color-text-muted);`
- Card: `border: 1px dashed var(--color-border); border-radius: var(--admin-radius); padding: 3rem 2rem; text-align: center; margin-top: 1.5rem;`
- NOT italic. NOT bare "暂无活动" with no subtitle or CTA.

---

## 5. Form / editor redesign

### 5.1 Form card

- Editor rendered in a `<div class="admin-form-card">`: `background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--admin-radius); padding: 1.5rem 2rem;`
- Form title: `"新建活动"` / `"编辑活动"` — `font-size: 1.125rem; font-weight: 700; color: var(--color-text); margin: 0 0 1.5rem;`
- Back link: `← 返回` — `font-size: 0.875rem; color: var(--color-text-muted); text-decoration: none; display: inline-flex; align-items: center; gap: 0.375rem; margin-bottom: 1rem;` → hover `color: var(--color-primary);`

### 5.2 Field layout

- Each field: `<div class="admin-field">` with `margin-bottom: 1.25rem;`
- Label: `<label>` — `font-size: 0.875rem; font-weight: 600; color: var(--color-text); display: block; margin-bottom: 0.375rem;`
- Required asterisk: ` *` in `color: var(--admin-error);`
- Help text: `font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;`
- Error message: `font-size: 0.8rem; color: var(--admin-error); margin-top: 0.25rem;`

### 5.3 Input specs

- Text / URL / email / number: `background: var(--admin-input-bg); border: 1px solid var(--color-border); border-radius: var(--admin-radius); color: var(--color-text); padding: 0.5rem 0.75rem; font-size: 0.9375rem; width: 100%; box-sizing: border-box;`
- Focus: `border-color: var(--color-primary); outline: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent); outline-offset: 0;`
- Error state: `border-color: var(--admin-error); outline-color: color-mix(in srgb, var(--admin-error) 30%, transparent);`
- Readonly: `opacity: 0.55; cursor: default; background: color-mix(in srgb, var(--color-bg) 80%, var(--color-bg-card));`
- Textarea: same as text input + `resize: vertical; min-height: 80px;`
- Select: same as text input + `appearance: auto;` (keep native arrow — no custom dropdown dep)
- Checkbox (boolean): native `<input type="checkbox">` + inline label, `accent-color: var(--color-primary);`
- Datetime-local / date: same token treatment as text inputs; browser native picker

### 5.4 JSON fallback (`<AdminJsonFallback>`)

- Textarea: `font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", monospace; font-size: 0.875rem; min-height: 120px; background: var(--admin-input-bg); border: 1px solid var(--color-border); border-radius: var(--admin-radius); color: var(--color-text); padding: 0.625rem 0.75rem; resize: vertical; width: 100%; box-sizing: border-box;`
- Valid state indicator: `✓ JSON 格式正确` in `color: var(--color-accent); font-size: 0.8rem; margin-top: 0.25rem;`
- Error state: red border + `✗ ` + JS parse error message in `color: var(--admin-error);` (parse error text is browser-native, kept as-is)

### 5.5 Asset uploader (`<AdminAssetUploader>`)

- Drop zone: `border: 2px dashed var(--color-border); border-radius: var(--admin-radius); padding: 1.25rem; text-align: center; cursor: pointer; background: var(--admin-input-bg); transition: border-color 150ms ease, background 150ms ease;`
- Drag-over: `border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 6%, var(--admin-input-bg));`
- Drop zone text: `font-size: 0.875rem; color: var(--color-text-muted);` — "拖拽图片至此，或点击上传"
- Uploading state: overlay text "上传中…" + spinner (CSS border-animation, `border-top-color: var(--color-primary)`)
- Preview: `<img>` thumbnail `max-width: 120px; max-height: 80px; border-radius: 4px; border: 1px solid var(--color-border);` + `[替换]` ghost button below

---

## 6. Button system

Three variants only. No new visual languages.

### Primary (`[+ 新建活动]`, `[保存（提交 PR）]`)
- `background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: var(--admin-radius); padding: 0.5rem 1.25rem; font-size: 0.9375rem; font-weight: 600; cursor: pointer;`
- Hover: `filter: brightness(1.12);`
- Focus-visible: `outline: 3px solid var(--color-primary); outline-offset: 2px;`
- Disabled: `opacity: 0.45; pointer-events: none;`
- Min touch target: `min-height: 40px;`

### Secondary / ghost (`[取消]`, `[放弃更改]`, `[刷新]`)
- `background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: var(--admin-radius); padding: 0.5rem 1rem; font-size: 0.9375rem; cursor: pointer;`
- Hover: `color: var(--color-text); border-color: color-mix(in srgb, var(--color-border) 60%, var(--color-text));`

### Danger (`[确认删除]` — on confirmation only)
- `background: color-mix(in srgb, var(--admin-error) 12%, transparent); color: var(--admin-error); border: 1px solid color-mix(in srgb, var(--admin-error) 40%, transparent);`
- Hover: `background: color-mix(in srgb, var(--admin-error) 20%, transparent);`
- Appears only in delete-confirm dialog, not inline in table

### Save + Cancel row (pinned save bar for long forms)
- Bar: `display: flex; gap: 0.75rem; align-items: center; padding: 1rem 2rem; border-top: 1px solid var(--color-border); background: var(--color-bg-card);`
- When the form is long enough to scroll (content height > viewport − topbar): bar becomes `position: sticky; bottom: 0; z-index: 10;` — stays visible while scrolling through long field lists
- When the full form fits in viewport: bar is inline (not sticky; avoids double-bottom border)
- Primary save button left, cancel right
- Save bar also shows inline save status: `● 未保存` / `保存中…` / `✓ 已保存` text in muted style (mirrors top bar indicator, but scoped to this form)

---

## 7. Toast / feedback system

### Success toast
- `position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 200;`
- `background: var(--color-bg-card); border: 1px solid var(--color-primary); border-left: 4px solid var(--color-primary); border-radius: var(--admin-radius); padding: 0.875rem 1.25rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); max-width: 420px;`
- Title: `font-size: 0.9375rem; font-weight: 600; color: var(--color-text);` — "已保存"
- Body: `font-size: 0.875rem; color: var(--color-text-muted); margin-top: 0.25rem;`
- PR link: `color: var(--color-primary); text-decoration: none;` — "查看 PR #N →" (opens `_blank`)
- Auto-dismiss: 5s (longer than P4's 3s — gives time to click the PR link)
- Dismiss button `[✕]`: top-right, `color: var(--color-text-muted);`

### Error toast
- Same position and sizing
- `border-color: var(--admin-error); border-left-color: var(--admin-error);`
- `background: color-mix(in srgb, var(--admin-error) 8%, var(--color-bg-card));`
- Title `color: var(--admin-error);` — "保存失败"
- No auto-dismiss (user must acknowledge)

### 409 并发编辑提示条
- Inline inside form card, not floating toast
- `background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-card)); border: 1px solid var(--color-accent); border-radius: var(--admin-radius); padding: 0.75rem 1rem; margin-bottom: 1rem;`
- Text: "检测到并发编辑，请刷新后重试。" + `[刷新]` ghost button inline

### Loading states
- List loading: three skeleton rows — `<div class="admin-skeleton-row">` with `background: color-mix(in srgb, var(--color-border) 60%, var(--color-bg-card)); border-radius: 4px; height: 1rem; width: 70%;` and CSS shimmer animation (`@keyframes shimmer`)
- Form loading: skeleton input blocks same treatment
- Shimmer animation: `@media (prefers-reduced-motion: reduce)` disables animation, keeps static tinted blocks

---

## 8. Accessibility

### 8.1 Contrast requirements

- All text against its background must meet WCAG AA 4.5:1 minimum
- Critical pairs to verify across all 8 themes:
  - Sidebar nav text (`--color-text-muted`) against `--color-bg` — verify on `roselia` (darkest bg `#0a0410`)
  - Active nav text (`--color-text`) against `12% primary tint` — verify on `hhw` (bright yellow primary)
  - Primary button text (`--color-on-primary`) against `--color-primary` — verify on `hhw` (`--color-on-primary: rgba(0,0,0,0.85)`)
  - `--admin-error` `#e53e3e` against all `--color-bg-card` values — minimum 3:1 for UI state (not body text)

### 8.2 Focus rings

- Every interactive element (buttons, inputs, selects, links, nav items) must show `:focus-visible` ring
- Ring spec: `outline: 2px solid var(--color-primary); outline-offset: 2px;`
- On dark backgrounds where primary is also dark (e.g. `roselia` purple `#a020c0`): ring still visible because outline sits outside the element against `--color-bg` or `--color-bg-card`
- `outline-offset: -2px` only for sidebar nav buttons (inset ring avoids layout shift in constrained sidebar)

### 8.3 Keyboard navigation tab order

Natural DOM order governs; do NOT use `tabindex > 0`. Tab sequence per screen:

**List view**: sidebar nav items (7) → top-bar links → `[+ Add {schema}]` button → table rows (each row: Edit button → Delete button) → repeat
- Table row cells are NOT individually focusable — only the action buttons within each row
- Arrow-key navigation within `<nav>` sidebar: `aria-activedescendant` or roving `tabindex` pattern so up/down arrow moves between schema items without leaving the nav region

**Edit form**: `[← Back]` link → form fields in DOM order (matches `schema.fields` array order) → `[Save]` → `[Cancel]`
- JSON fallback textarea: tab stops at the textarea itself; shift-tab exits
- Asset uploader drop zone: focusable via tab, activates file picker on Enter/Space

**Confirmed ARIA roles**:
- Sidebar `<nav aria-label="Admin sections">`
- Schema nav items `role="menuitem"` inside `role="menu"`
- List `<table>` with `<caption>` (visually hidden) naming the schema
- Toast `role="status"` for success; `role="alert"` for error (live regions)
- Save status indicator: `role="status" aria-live="polite"` — screen readers announce state changes without interrupting

### 8.4 Motion

- Drawer open/close transition: `transition: transform 200ms ease;` — disabled under `@media (prefers-reduced-motion: reduce)`
- Shimmer skeleton animation: CSS `@keyframes shimmer` with `opacity` — disabled under `prefers-reduced-motion`
- Toast enter animation: `@keyframes fade-in` — disabled under `prefers-reduced-motion` (toast still appears, just without animation)

---

## 9. i18n — admin chrome language

**Policy**: admin chrome is **Chinese-only** (中文). Operator (single user, native Chinese speaker) is the only consumer; bilingual would be ceremony, EN-only would force operator out of native language.

**Implementation**:
- All admin chrome strings are hardcoded Chinese inline in component JSX. Examples:
  - "+ Add new" → "+ 新建"
  - "Sign out" → "登出"
  - "Saved" / "Saving…" / "Unsaved changes" → "已保存" / "保存中…" / "有未保存的修改"
  - "No events yet" → "还没有活动"
  - Nav: "Events" → "活动", "Members" → "成员", "News" → "公告", "Posts" → "首页轮播", "Social links" → "社交平台", "Site Identity" → "站点信息", "About page" → "关于页"
- Schema labels in `src/lib/adminSchemas.js` switch to Chinese inline strings (Architect decides whether to rename `label` or add `labelZh`).
- Do NOT thread `t()` through admin components.
- Do NOT add admin keys to `src/data/i18n.json`.
- No `<LangToggle>` in admin top bar (admin is single-language).
- Brand acronyms left as-is: "BD!NA", "PR", "GitHub", "PAT".

**Reviewer gate**: scan rendered `/admin` DOM for any English chrome string (excluding the brand acronyms above) → BLOCKER.

**Full canonical string table** (Developer uses these exactly):

| Context | Chinese string |
|---|---|
| Sidebar wordmark subline | `BD!NA 后台` |
| Nav: Events | `活动` |
| Nav: Members | `成员` |
| Nav: News | `公告` |
| Nav: Posts | `首页轮播` |
| Nav: Social | `社交平台` |
| Nav: Site | `站点信息` |
| Nav: About | `关于页` |
| Sign out button | `登出` |
| Top bar: breadcrumb root | `后台` |
| Top bar: View site link | `查看网站 ↗` |
| Top bar: save status — unsaved | `有未保存的修改` |
| Top bar: save status — saving | `保存中…` |
| Top bar: save status — saved | `✓ 已保存` |
| Top bar: save status — error | `✗ 保存失败` |
| Top bar: no open PR | `无待合并 PR` |
| List header: add button | `+ 新建` (e.g. `+ 新建活动`) |
| List header: item count badge | `{N} 条` |
| Table: Edit action | `编辑` |
| Table: Delete action | `删除` |
| Empty state title | `还没有{schema}` (e.g. `还没有活动`) |
| Empty state subtitle | `点击上方按钮创建第一条记录` |
| Form title: new item | `新建{schema}` |
| Form title: edit item | `编辑{schema}` |
| Form: Back link | `← 返回` |
| Form: Save button | `保存（提交 PR）` |
| Form: Cancel button | `取消` |
| Form: Discard button | `放弃更改` |
| Form: Refresh button | `刷新` |
| JSON fallback: valid | `✓ JSON 格式正确` |
| JSON fallback: error prefix | `✗ ` + JS parse error (browser-native, kept as-is) |
| Asset uploader: drop zone | `拖拽图片至此，或点击上传` |
| Asset uploader: uploading | `上传中…` |
| Asset uploader: replace button | `替换` |
| Toast success title | `已保存` |
| Toast success body | `查看 PR #N →` |
| Toast error title | `保存失败` |
| Concurrent edit banner | `检测到并发编辑，请刷新后重试。` |
| Login screen heading | `BD!NA 后台` |
| Login screen subtext | `输入 GitHub Personal Access Token 以继续` |
| Login submit button | `登录` |
| Login error banner | `Token 无效或已过期，请重新登录。` |
| Login help summary | `如何获取 Token？` |
| Post-logout banner | `Token 已过期或被撤销，请重新登录。` |
| Delete confirm dialog | `删除「{title}」？此操作无法撤销。` |
| Delete confirm button | `确认删除` |
| Discard changes confirm | `放弃未保存的更改？` |
| Singleton reset button | `重置` |

---

## Acceptance gates (Reviewer checklist additions for P8)

**Tokens & colors**
- [ ] Zero hardcoded hex values in `Admin.css` and all `AdminNav/`, `AdminEditor/`, `AdminForm/`, `AdminLogin/`, `AdminJsonFallback/`, `AdminAssetUploader/` CSS files — every color references a CSS custom prop or `--admin-*` derived token
- [ ] `--admin-error` (`#e53e3e`) is the only hardcoded hex; it must have the comment `/* semantic error — not in theme token set */` on the same line
- [ ] `color-mix()` fallback `@supports` blocks present for every derived `--admin-*` token using `color-mix()`
- [ ] All 8 themes render without visual regression — verify by switching theme on public site then visiting `/admin`

**Sidebar**
- [ ] Sidebar width is `260px` (not 224px) — confirm in DevTools computed styles
- [ ] All 8 themes render sidebar nav active state visibly (primary left border + tinted bg)
- [ ] "Sign out" button passes 4.5:1 contrast on `roselia` (`--color-bg: #0a0410`) at default (non-hover) state
- [ ] Panda logo `<img>` present in sidebar header, `aria-hidden="true"` (decorative)

**Top bar**
- [ ] Top bar gradient stripe present and uses `var(--gradient-hero)` at `opacity: 0.6`
- [ ] Save status indicator cycles: hidden (clean) → "Unsaved changes" (dirty) → "Saving…" (in-flight) → "Saved" (3s) → hidden
- [ ] PR pill renders with accent color when PR open; "No open PR" muted text when none
- [ ] No `<ThemeSwitcher>` or `<LangToggle>` rendered inside admin shell

**List / table**
- [ ] Collection list renders as `<table>` with `<thead>` column labels matching schema `listColumns`
- [ ] `[+ 新建{schema}]` button uses primary button style — not ghost, not muted
- [ ] Empty states: non-italic, `◆` glyph icon, Chinese subtitle text, primary CTA button — no bare single-line text with no CTA

**Form / edit**
- [ ] Save bar is `position: sticky; bottom: 0` when form content overflows viewport
- [ ] Save bar shows inline save status (mirrors top bar indicator)
- [ ] Asset uploader drop zone has dashed border, drag-over state changes to primary border color

**Accessibility**
- [ ] `@media (prefers-reduced-motion: reduce)` disables shimmer animation AND drawer slide transition
- [ ] All interactive elements show `:focus-visible` outline using `var(--color-primary)`
- [ ] Touch targets ≥ 44px height on all sidebar nav buttons and primary action buttons
- [ ] Toast uses `role="status"` (success) and `role="alert"` (error)
- [ ] Save status indicator uses `role="status" aria-live="polite"`
- [ ] No `tabindex` values > 0 anywhere in admin DOM
- [ ] Table `<caption>` present (visually hidden) on each collection table

**i18n**
- [ ] All visible admin chrome is in Chinese (excluding brand acronyms BD!NA / PR / GitHub / PAT)
- [ ] `i18n.json` diff is empty — no admin keys added (admin is inline Chinese, not i18n-keyed)
- [ ] No `<LangToggle>` rendered inside admin shell

**No new visual languages**
- [ ] No emoji used as UI elements (only `◆` Unicode glyph for nav/empty-state icon)
- [ ] No pink, pastel, character art, or franchise wordmarks introduced
- [ ] No new npm deps in `package.json`
