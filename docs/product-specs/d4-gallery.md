# Feature: D4 — Gallery (Claude Design port)

## Product Context

Sub-PR D4 of 6 for the bangdream-na Claude Design redesign. D1 has merged to `main` as commit ef396e7, establishing all bf-* design tokens, LayoutShell, and global helpers. D4 collapses the current Mobile/Desktop layout split (Gallery.desktop.jsx + Gallery.mobile.jsx) into a single responsive Gallery.jsx using bf-* CSS classes from tokens.css, and ports the visual style to the bandori-fans subpage design.

The target is a gallery page with a dark page-hero band, responsive bf-album-grid (3-col → 2-col → 1-col), and the existing lightbox wired through the already-present yet-another-react-lightbox dependency. No worker changes are required; the worker /api/gallery endpoint already returns all needed fields.

Key constraint from Architect §3 SURPRISE-1: gallery items have no band_theme field. All album thumbnail backgrounds use a fixed ink gradient or solid --bg-2. No band-color theming.

## User Stories

- As a visitor I want to see a prominent page-hero with the gallery title and total photo/album counts so I know I am on the gallery page.
- As a visitor I want to browse all photo albums in a responsive grid so I can quickly scan community event memories.
- As a visitor I want to click a thumbnail to open a fullscreen lightbox with keyboard navigation so I can view photos comfortably.
- As a visitor I want to filter the gallery to a specific album or event using a dropdown so I can find photos from a specific occasion.
- As a visitor I want to clear the active filter and return to the full gallery with one click so I can resume browsing.
- As a visitor arriving via a deep link with a URL hash (#event-slug) I want the page to scroll to the correct album section on load.
- As a mobile visitor I want the grid to collapse to 2-col and then 1-col so photos are viewable on small screens.

## Acceptance Criteria

### Page Hero

- [ ] A `<div class="bf-page-hero">` renders at the very top of the gallery page (inside LayoutShell, above the filter controls)
- [ ] Hero contains `<h1 class="bf-page-hero__title">` with text "相册" (zh) / "Gallery" (en) driven by `t('nav.gallery')`
- [ ] Hero contains `<p class="bf-page-hero__subtitle">` with `t('gallery.groupMeta', { groupCount, imageCount })` output e.g. "9 个相册 · 17 张照片"
- [ ] Hero background uses `var(--ink)` fill; text uses `var(--paper)`; no band_theme, no dynamic color
- [ ] Hero is full-width (extends edge to edge of the bf-container or via negative margin to bleed), padding 48px 0 on desktop, 32px 0 on mobile

### Album Grid Layout

- [ ] Gallery groups render inside `<div class="bf-album-grid">` scoped within a `<div class="bf-container">`
- [ ] `bf-album-grid` is a CSS Grid: 3 columns at desktop (>900px), 2 columns at tablet (600px–900px), 1 column at mobile (<600px)
- [ ] Each group is a `<section class="bf-album" id="{group.id}" aria-labelledby="heading-{group.id}">` 
- [ ] Each bf-album has `<h2 class="bf-album__title" id="heading-{group.id}">` with a clickable `<button class="bf-album__title-btn">` that activates the group filter on click
- [ ] Each bf-album has `<div class="bf-album__meta">` showing `{count} 张 · {dateRange}` (date omitted if null)
- [ ] The PhotoGrid component (src/components/Gallery/PhotoGrid.jsx) is reused inside each bf-album with no duplication of thumbnail rendering logic
- [ ] Thumbnail background for cells without a loaded image uses `background: linear-gradient(135deg, var(--ink-3), var(--ink-2))` (fixed ink gradient — no band_theme)
- [ ] bf-album card has `background: var(--paper)`, `border: 1px solid var(--rule)`, subtle `box-shadow: var(--shadow-card)`
- [ ] scroll-margin-top on each bf-album section: 80px (accommodates fixed nav)

### Filter Controls

- [ ] Filter row renders below the page-hero inside bf-container
- [ ] A pill button labeled `t('gallery.filter.allOption')` ("全部相册") acts as "show all" — active state when no filter
- [ ] A `<select class="bf-gallery-select">` with `aria-label={t('gallery.filter.dropdownAria')}` lists all group options as `<option value="{group.id}">{group.label} · {count} 张</option>`
- [ ] Selecting a group option sets `?album=<group-id>` URL param via useSearchParams (replace: true)
- [ ] When a filter is active, an inline active-filter pill appears: `<div class="bf-active-filter">` with label text and a `<button aria-label={t('gallery.filter.clear')}>×</button>`
- [ ] Clicking the clear button or the "全部相册" pill removes the ?album param and restores full view
- [ ] URL param `?album=<group-id>` is the single source of truth for filter state (applied on mount)

### Lightbox

- [ ] Clicking any thumbnail calls `onItemClick(index, item, group)` which sets lightbox state `{ open: true, index, items: group.items }`
- [ ] The existing `Lightbox` component (src/components/Gallery/Lightbox.jsx) is used — no new lightbox implementation
- [ ] Keyboard navigation: ← → navigate slides, Esc closes — handled natively by yet-another-react-lightbox
- [ ] Lightbox closes on backdrop click — handled natively by YARL
- [ ] A count badge / position indicator "N / M" is shown — use YARL Counter plugin or rely on YARL's built-in counter display; do NOT build a custom overlay
- [ ] `open` prop flips to false on close (via `closeLightbox()` function)

### Empty States

- [ ] When API returns 0 items: render `<p class="bf-gallery-empty" role="status">` with `t('gallery.empty')` text — "暂无相册" (zh) / "No albums yet" (en)
- [ ] When items exist but active filter matches no group: render `<p class="bf-gallery-empty" role="status">` with `t('gallery.emptyFilter')` text — "没有符合条件的相册" (zh) / "No photos match this filter." (en)
- [ ] Loading state: use existing `LoadingState` component with `className="gallery-loading"`
- [ ] Error state: use existing `ErrorState` component with `className="gallery-error"` and `onRetry` callback

### Accessibility

- [ ] Each `<section class="bf-album">` has `aria-labelledby="heading-{group.id}"`
- [ ] Each thumbnail `<button>` has `aria-label` = caption if non-empty, else `t('gallery.photoFallbackLabel', { n: index+1 })` ("第 N 张照片" zh / "Photo N" en)
- [ ] Filter `<select>` has `aria-label={t('gallery.filter.dropdownAria')}`
- [ ] Filter group container has `role="group"` and `aria-label={t('gallery.filterAria')}`
- [ ] Active filter clear button has `aria-label={t('gallery.filter.clear')}` ("Clear filter")

### Cleanup

- [ ] `src/pages/Gallery.desktop.jsx` deleted
- [ ] `src/pages/Gallery.desktop.css` deleted
- [ ] `src/pages/Gallery.desktop.test.jsx` deleted
- [ ] `src/pages/Gallery.mobile.jsx` deleted
- [ ] `src/pages/Gallery.mobile.css` deleted
- [ ] `src/pages/Gallery.mobile.test.jsx` deleted
- [ ] `Gallery.jsx` no longer imports `Mobile`, `Desktop`, `GalleryMobile`, or `GalleryDesktop`
- [ ] `App.jsx` route `/gallery` is unchanged — still renders `<Gallery />`
- [ ] No worker file is modified

### CSS Namespace

- [ ] All new classes are prefixed `bf-` (bf-page-hero, bf-album-grid, bf-album, bf-album__title, bf-album__title-btn, bf-album__meta, bf-gallery-select, bf-active-filter, bf-gallery-empty)
- [ ] Existing gallery-grid, gallery-thumb, gallery-thumb__btn classes from PhotoGrid.css are preserved (PhotoGrid is not modified)
- [ ] New CSS lives in `src/pages/Gallery.css` (replaces Gallery.desktop.css + Gallery.mobile.css)

## Edge Test Cases (6 mandatory, 8 total)

1. **Empty list** — API returns `{ items: [], total: 0 }` → empty-state `<p>` renders with non-empty text; no JS error; no heading level 2 rendered
2. **Missing image_url** — item with `image_url: ""` or `image_url: null` after adapt → `<img>` renders with empty src; no crash, no missing-key warning
3. **Lightbox open on click** — clicking first thumbnail fires `setLightbox({ open: true, index: 0, items: [...] })`; `data-testid="lightbox"` appears in DOM
4. **Lightbox close** — after lightbox opens, calling `onClose` sets `lightbox.open = false`; lightbox element removed from DOM
5. **Filter no-match** — URL `/gallery?album=does-not-exist` with items present → empty-filter-state `<p>` renders (not the zero-total empty state); groups not rendered
6. **Null taken_at** — item with `taken_at: null` → group meta shows count without a date; no "NaN", no "Invalid Date", no crash
7. **Null album + null event_slug** — item where both `album` and `event_slug` are null → adaptGalleryRow handles gracefully; item appears in a fallback group or is skipped without crash
8. **Hash anchor scroll** — route `/gallery` with `window.location.hash = '#event-meet-2024'` after items load → `scrollIntoView` called on the matching section element

## Data & API

### Worker endpoint

`GET /api/gallery` — returns `{ items: GalleryItem[], total: number }`

Supports query params: `limit`, `offset`, `event_id`, `album` (Gallery.jsx uses `limit=100`, no filter params).

### GalleryItem (wire shape)

| Field | Type | Notes |
|---|---|---|
| id | number | primary key |
| image_url | string | CDN URL |
| caption | string\|null | optional caption |
| taken_at | number\|null | unix seconds; null = unknown date |
| event_id | number\|null | FK to events table |
| event_slug | string\|null | event slug for group key |
| event_title_zh | string\|null | group display label (event-linked) |
| album | string\|null | group display label (standalone) |
| sort_order | number | manual ordering within group |
| created_at | number | unix seconds |
| updated_at | number | unix seconds |

**NO band_theme field** — SURPRISE-1 confirmed. Thumbnail background = fixed ink gradient.

### UI-shape (post-adaptGalleryRow)

| Field | Source |
|---|---|
| id | id |
| imageUrl | image_url |
| caption | caption |
| takenAt | taken_at |
| eventSlug | event_slug |
| eventTitleZh | event_title_zh |
| album | album |

### Group key derivation

- Event-linked item (`event_slug` non-null): group id = `event-{event_slug}`, label = `event_title_zh`
- Standalone item (`album` non-null): group id = `album-{slug(album)}`, label = `album`

## Out of Scope

- Admin gallery upload UI (separate Admin page, not touched in D4)
- Pagination (fetch limit=100 covers all current items; Gallery.jsx fetch logic unchanged)
- Worker route changes (worker/src/routes/gallery.ts not modified)
- New i18n translation keys (reuse existing `t()` keys already in uiLanguage.js)
- BandSwitcher or band-color theming (no band_theme field; fixed ink gradient)

---

## Designer notes

### Component reuse (confirmed)

The following D1 components and CSS classes are reused AS-IS. No modifications to these files.

| Component / class | Source | Usage in D4 |
|---|---|---|
| `PhotoGrid` | src/components/Gallery/PhotoGrid.jsx | Renders thumbnail grid inside each bf-album section |
| `Lightbox` | src/components/Gallery/Lightbox.jsx | Fullscreen lightbox, opened from Gallery.jsx state |
| `LoadingState` | src/components/LoadingState/ | Loading spinner while API fetch is in flight |
| `ErrorState` | src/components/ErrorState/ | Error + retry UI on fetch failure |
| `.bf-container` | tokens.css | Page content max-width wrapper (1380px, auto margins) |
| `.bf-section` | tokens.css | Section padding (56px desktop, 36px mobile) |
| `.bf-pill` | tokens.css | Mono-font label pill (reusable for filter active-filter label) |
| `.bf-cta` | tokens.css | Primary CTA button style |
| `.bf-divider` | tokens.css | 1px rule divider |

### New classes to add (Gallery.css)

All new classes are bf-prefixed. Existing `gallery-grid`, `gallery-thumb`, `gallery-thumb__btn`, `gallery-thumb__img` in PhotoGrid.css are NOT modified.

```
bf-page-hero            — full-width dark band (--ink bg, --paper text)
bf-page-hero__inner     — bf-container-width centering wrapper inside hero
bf-page-hero__title     — h1, --display font, 48px desktop / 32px mobile
bf-page-hero__subtitle  — subtitle line, rgba(paper, 0.6) muted

bf-album-grid           — CSS Grid 3-col -> 2-col -> 1-col responsive
bf-album                — group card (paper bg, rule border, shadow-card)
bf-album__header        — flex row: title + meta
bf-album__title         — h2, 20px, weight 700
bf-album__title-btn     — unstyled button inside h2 (filter-on-click)
bf-album__meta          — photo count + date, ink-3 color, mono font 11px

bf-gallery-filter       — filter row wrapper (flex, gap 8px, align center)
bf-gallery-chip         — filter pill button (--accent bg when active)
bf-gallery-select       — album dropdown select
bf-active-filter        — active-filter inline pill (label + clear btn)
bf-active-filter__clear — x clear button inside active-filter pill

bf-gallery-empty        — empty state paragraph (centered, ink-3 color)
```

### Page-hero design

Full-bleed dark band at the top of the gallery page:
- Background: `var(--ink)` (paper palette: #1f1d1a)
- Title: --display font stack, weight 800, clamp(28px, 5vw, 48px), color var(--paper)
- Subtitle: 14px, color rgba(241,239,233,0.6) (hardcoded or inline style; do NOT add a new token)
- Padding: 48px top/bottom desktop; 32px mobile
- NO band image, NO gradient overlay — pure ink fill (SURPRISE-1 constraint; no band_theme)

### Album grid card design

Each bf-album card:
- Background: `var(--paper)`, border: `1px solid var(--rule)`, box-shadow: `var(--shadow-card)`
- bf-album__title-btn: plain text, cursor pointer, no underline; click activates group filter
- Thumbnail grid inside uses existing gallery-grid / gallery-thumb classes from PhotoGrid
- Photo count + date in bf-album__meta: mono font, 11px, `var(--ink-3)` color

### Ink gradient for thumbnail backgrounds

When an image has not loaded (loading flash), the thumbnail cell shows the ink gradient. Scoped rule in Gallery.css (do NOT modify PhotoGrid.css):
```css
.bf-album .gallery-thumb { background: linear-gradient(135deg, var(--ink-3), var(--ink-2)); }
```

### Filter affordance

- "全部相册" pill: accent bg + accent-ink text when active; paper bg + rule border when inactive
- Dropdown select: rule-2 border, paper bg, ink color, mono font 11px
- Active-filter pill: accent-soft bg, rule border, padding 4px 10px; x button uses ink-3 color

### Lightbox count badge

Use the yet-another-react-lightbox `Counter` plugin (`yet-another-react-lightbox/plugins/counter`). If Counter plugin is unavailable in the installed version, rely on YARL's native slide description field for position context. Do NOT build a custom DOM overlay.

### Responsive breakpoints

```
> 900px    bf-album-grid: 3 columns
600-900px  bf-album-grid: 2 columns
< 600px    bf-album-grid: 1 column
```

### What NOT to do

- Do NOT modify PhotoGrid.jsx, PhotoGrid.css, or Lightbox.jsx
- Do NOT add LayoutShell wrappers inside Gallery.jsx (shell wraps all public routes already)
- Do NOT use Mobile/Desktop responsive wrapper components (deleted in D4)
- Do NOT introduce new i18n keys; reuse existing: `nav.gallery`, `gallery.groupMeta`, `gallery.filter.allOption`, `gallery.filter.dropdownAria`, `gallery.filter.placeholder`, `gallery.filter.optionMeta`, `gallery.filter.active`, `gallery.filter.clear`, `gallery.filterAria`, `gallery.empty`, `gallery.emptyFilter`, `gallery.photoFallbackLabel`, `gallery.gridLabel`
