# D2 — News + NewsDetail Product Spec

**Branch:** feat/d2-news  
**Worktree:** C:/Users/WaterMelon/bangdream-na-worktrees/d2-news  
**Base:** ef396e7 (D1 foundation merged)

## Scope

Rewrite `News.jsx` + `NewsDetail.jsx` to bandori-fans subpage style.  
Delete stale split files: `News.desktop.*`, `News.mobile.*`.  
Keep `NewsCard`, `NewsList`, `Comments`, `LoadingState`, `ErrorState` — reuse, don't duplicate.

## Worker API field map

Endpoint: `GET /api/news` → `{ items: NewsRow[], total: number }`  
Endpoint: `GET /api/news/:slug` → `NewsRow`

```
NewsRow {
  id: number
  slug: string
  title_zh: string
  title_en: string | null
  body_md: string
  category: string           // 'announcement' | 'event' | 'community' | 'release'
  hero_image_url: string | null
  tags: string[]
  published_at: number       // Unix seconds
  created_at: number
  updated_at: number
}
```

**No `band_theme` field on news** — use fixed ink-gradient fallback for hero visuals (same as D1 Home).

Adapter already maps `NewsRow → { id(slug), title, body, summary, date(ISO), tag, category, image, sourceUrl }` via `adaptNewsRow` / `adaptNewsList` in `src/lib/apiAdapter.js`.

## Page hero (`.bf-page-hd`)

Token: from D1 `tokens.css` + subpage.html design.

```html
<section class="bf-page-hd">
  <div class="bf-container">
    <div>
      <span class="ph-tag">// 新闻流</span>
      <h1>新闻</h1>
    </div>
    <span class="ph-meta">{total} 条 · 北美邦现地报告 + 公告</span>
  </div>
</section>
```

CSS (new, add to `News.css`):
```css
.bf-page-hd { padding: 36px 0 24px; border-bottom: 1px solid var(--rule); background: var(--paper); }
.bf-page-hd .bf-container { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.ph-tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; color: var(--ink-3); text-transform: uppercase; display: block; margin-bottom: 6px; }
.bf-page-hd h1 { font-family: var(--display); font-weight: 600; font-size: 38px; margin: 0; letter-spacing: -.005em; line-height: 1.1; }
.ph-meta { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
```

## News page layout (`.bf-page-body` + `.bf-news-list`)

After page-hero, render a `<main class="bf-page-body">` wrapping `<div class="bf-container">`.

Inside: `bf-news-list` 2-col grid at ≥700px, 1-col at <700px.  
Cards: reuse `NewsCard` component with new `bf-news-card` wrapper CSS.

```css
.bf-page-body { padding: 32px 0 56px; }
.bf-news-list { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 700px) { .bf-news-list { grid-template-columns: 1fr; } }
```

The `NewsCard` component renders `.news-card` with existing classes — wrap in `.bf-news-list` grid. No `.bf-news-card` wrapper needed (the link+article from NewsCard is the item).

## NewsDetail layout

Structure: page-hero (title + kicker + date) → hero image → body → bf-helper boxes → Comments.

```
<section class="bf-page-hd bf-page-hd--detail">
  <div class="bf-container">
    <Link to="/news" class="nd-back">← 返回新闻列表</Link>
    <span class="ph-tag">{categoryLabel}</span>
    <h1>{title}</h1>
    <span class="ph-meta"><time>{date}</time></span>
  </div>
</section>
<main class="bf-page-body">
  <div class="bf-container bf-container--narrow">
    {hero image if present}
    <div class="bf-news-detail-body">{paragraphs}</div>
    {bf-helper if category note needed}
    {Comments}
  </div>
</main>
```

CSS additions in `NewsDetail.css`:
```css
.bf-container--narrow { max-width: 780px; }
.bf-news-detail-body { margin: 32px 0; line-height: 2; }
.bf-news-detail-body p { margin: 0 0 1.4em; }
.nd-back { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; color: var(--ink-3); display: inline-block; margin-bottom: 20px; }
.nd-back:hover { color: var(--ink); }
.nd-hero-img { width: 100%; max-height: 420px; object-fit: cover; display: block; margin-bottom: 32px; }
```

## Component changes

| File | Action |
|------|--------|
| `src/pages/News.jsx` | Rewrite — single component, no Desktop/Mobile split, bf-page-hd + bf-news-list |
| `src/pages/News.css` | Rewrite — bf-page-hd + bf-news-list + ph-* tokens |
| `src/pages/News.test.jsx` | Rewrite — new DOM queries matching bf classes |
| `src/pages/NewsDetail.jsx` | Rewrite — bf-page-hd--detail + bf-news-detail-body |
| `src/pages/NewsDetail.css` | Rewrite — narrow container + nd-* classes |
| `src/pages/NewsDetail.test.jsx` | Update — fix class name assertions |
| `src/pages/News.desktop.jsx` | DELETE |
| `src/pages/News.desktop.css` | DELETE |
| `src/pages/News.desktop.test.jsx` | DELETE |
| `src/pages/News.mobile.jsx` | DELETE |
| `src/pages/News.mobile.css` | DELETE |
| `src/pages/News.mobile.test.jsx` | DELETE |

## Designer notes

Reuse from D1 tokens.css:
- `--bg`, `--paper`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--display`, `--mono`, `--sans`
- `.bf-container`, `.bf-helper`, `.bf-helper-tag`, `.bf-section`, `.bf-pill`

New CSS classes (only in News.css / NewsDetail.css — NOT touching tokens.css):
- `.bf-page-hd` — subpage header strip
- `.bf-page-hd--detail` — modifier for detail page (adds back-link space)
- `.ph-tag`, `.ph-meta` — page-header mono metadata
- `.bf-news-list` — 2-col → 1-col grid
- `.bf-news-detail-body` — article body container
- `.bf-container--narrow` — 780px max-width for detail reading column
- `.nd-back` — back navigation link
- `.nd-hero-img` — hero image in detail

No band_theme → use `var(--ink)` fallback (no gradient on news cards/detail).

## Architect integration check

- `App.jsx` already imports `News` from `./pages/News.jsx` and `NewsDetail` from `./pages/NewsDetail.jsx` — routes unchanged.
- `LayoutShell` wraps all public routes — News/NewsDetail render inside it. The bf-page-hd section renders INSIDE the LayoutShell content area (after PrimaryNav).
- MemoryRouter wrapper already used in `NewsDetail.test.jsx` — keep pattern.
- Delete stale split files to avoid dead imports.
- `News.test.jsx` currently tests Desktop/Mobile split with `window.matchMedia` — tests must be rewritten for the new single-component design.
- `newsRowToOut` in worker returns `{ id, slug, title_zh, title_en, body_md, category, hero_image_url, tags, published_at, created_at, updated_at }` — adapter handles snake→camel.

## Edge tests (≥6 mandatory)

1. **Empty list** — `fetchNews` returns `{ items: [], total: 0 }` → renders `bf-news-list` with 0 cards, no crash
2. **Missing image** — `hero_image_url: null` on NewsCard → no img/figure rendered
3. **Long title** — 200-char title → NewsCard renders without layout break (CSS clamp handles it)
4. **Malformed date** — `published_at: null` / `published_at: 'bad'` → date field omitted, no crash
5. **Missing slug** — `slug: ''` → NewsCard not linkable (no `<Link>` wrapping)
6. **Fetch error retry** — `fetchNews` rejects → ErrorState shown → retry resolves → cards rendered
7. **NewsDetail 404** — `fetchNewsBySlug` returns `null` → not-found state rendered
8. **NewsDetail URL-encoded slug** — `%E5%8C%97%E7%BE%8E` decoded before fetch call

## Standing rules (non-negotiable)

- Conventional commits, NO Co-Authored-By, NO .claude/ in git
- TDD: failing test FIRST, then implementation
- Edge tests mandatory (8 above)
- bangdream-na has NO CI for worker; Reviewer must `cd worker && npx vitest run`
- `gh pr create --base main --head feat/d2-news` explicit flags
- Push after every commit
- DO NOT auto-merge; wait for user
- No smart quotes in TS/JSX
