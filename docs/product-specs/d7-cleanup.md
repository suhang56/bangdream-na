# Feature: D7 — Final Cleanup + Bug Fixes

## Product Context

D1–D6 shipped a complete visual redesign. D7 fixes eleven user-reported production
bugs (hero/news images, dead community links, dead nav routes, non-clickable stat
tiles, text wordmark instead of logo, missing tile accent stripes, truncated
UtilityBar, dark news cards, missing events band column, dark gallery placeholders,
non-band-aware news tag color), removes dead code, and adds visual smoke-test
coverage. Dark mode deferred to D8.

---

## HIGH — User-reported production bugs (primary scope)

### H1: Hero feature card + news card thumbnails show ink gradient instead of images

**Location:** `src/pages/Home.jsx` lines 88, 172

Both the hero feature card and the 4 news cards use a hardcoded `FIXED_GRADIENT`
constant as their `background` style, ignoring the `hero_image_url` field the
Worker already returns.

Fix: when `hero_image_url` is present, render it as a CSS `url(...)` background
(cover, center). Fall back to `FIXED_GRADIENT` only when null/empty.

Acceptance criteria:
- [ ] Hero feature card shows the news item's hero image when `hero_image_url` is
      non-null.
- [ ] Each of the 4 news cards shows its own hero image when `hero_image_url` is
      non-null.
- [ ] When `hero_image_url` is null/empty string, the ink gradient fallback renders
      (no broken-image box).
- [ ] Unit test: renders `url(https://example.com/img.jpg)` in background when
      hero_image_url provided; renders gradient when null.

### H2: 加入社群 section — QQ card + 4 community link tiles all href="#"

**Location:** `src/pages/Home.jsx` lines 309, 317

The QQ card `<a href="#">` and all four `COMMUNITY_LINKS` map entries use `href="#"`.
The canonical URLs are established in `App.test.jsx` mock data (source of truth):
- QQ: `https://qm.qq.com/q/Dir9OC5TYA`
- Discord: `https://discord.gg/WfMBKaW8Br`
- Xiaohongshu: `https://xhslink.com/m/1s9XmQRoAug`
- X (Twitter): `https://x.com/BandoriNACC`
- Forum: `https://forum.bangdream.org`

**Also:** `src/components/Footer/Footer.jsx` has the same class of bug — three
`EXTERNAL_LINKS` entries use `href="#"` (X, 小红书, 论坛) and one `COMMUNITY_LINKS`
entry (QQ 群 / Discord) uses `href="#"`. Fix Footer dead links in the same PR.

Fix: replace `href="#"` with real URLs. All external links must open with
`target="_blank" rel="noopener noreferrer"`. The `COMMUNITY_LINKS` in Home.jsx
already has the correct `handle` text — the URL just needs to be wired up.

Acceptance criteria:
- [ ] QQ card in HomeJoin navigates to `https://qm.qq.com/q/Dir9OC5TYA`.
- [ ] Discord tile navigates to `https://discord.gg/WfMBKaW8Br`.
- [ ] 小红书 tile navigates to `https://xhslink.com/m/1s9XmQRoAug`.
- [ ] X tile navigates to `https://x.com/BandoriNACC`.
- [ ] 论坛 tile navigates to `https://forum.bangdream.org`.
- [ ] All external links have `target="_blank" rel="noopener noreferrer"`.
- [ ] Footer external links (X, 小红书, 论坛, QQ/Discord) likewise fixed.
- [ ] Unit test: each anchor has the correct href attribute.

### H3: PrimaryNav links 现地攻略 / 出票公告 / 论坛 cause 404 or no-op

**Location:** `src/components/PrimaryNav/PrimaryNav.jsx` lines 9, 10, 14

- `/tickets` (出票公告) — no matching route in App.jsx
- `/guide` (现地攻略) — no matching route in App.jsx
- `#forum` (论坛) — hash href, no scroll target, renders as no-op

**Decision: remove these three nav items** for D7. They link to unbuilt features
and actively confuse users who click and land on a 404. Also remove from Footer's
`RESOURCE_LINKS` (`/guide`) and `EXTERNAL_LINKS` (`/tickets`).

If any test asserts the count or presence of these nav items, update the test to
match the new list.

Acceptance criteria:
- [ ] `出票公告 / TICKETS`, `现地攻略 / GUIDES`, and `论坛 / FORUM` are absent from
      the rendered nav.
- [ ] No link in PrimaryNav routes to `/tickets`, `/guide`, or `#forum`.
- [ ] Footer's `/guide` and `/tickets` internal links removed.
- [ ] `npm test -- --run` exits 0 (updated tests pass).
- [ ] Nav still contains: 首页, 新闻, 活动, 相册, 成员, 关于, 群规 (7 items).

### H4: Stats tiles (同好 / 分会 / 活动) are not clickable

**Location:** `src/pages/Home.jsx` lines 132–145 (the `bf-hh-stats` div block)

The three stat tiles are plain `<div>` elements with no interactivity. Each one
should be a navigable link.

Fix: wrap each tile in a React Router `<Link>`:
- 同好 (members count) → `/members`
- 分会 (chapters count) → `/about`
- 活动 (events count) → `/events`

Preserve all existing visual classes and content inside the link.

Acceptance criteria:
- [ ] Each stat tile is a `<Link>` (renders as `<a>`) with the correct `to`.
- [ ] Tiles are keyboard-reachable (Tab order, focus ring from existing CSS).
- [ ] Unit test: each tile's anchor element has the expected `href` attribute.
- [ ] Clicking a tile navigates to the correct route (integration test or existing
      routing test suffices).

### H5: Masthead wordmark should use logo image instead of text

**Location:** `src/components/Masthead/Masthead.jsx` lines 20–23

The masthead currently renders `.lg-1.lg-zh` with two text spans ("北美炸梦" +
"同好会"). The actual logo asset exists at `public/logo.png`.

Fix: replace the `.lg-1.lg-zh` text span block with
`<img src="/logo.png" alt="北美炸梦同好会" className="bf-logo-img" />`. Preserve:
- The outer `<Link to="/" aria-label="北美炸梦同好会">` wrapper
- The `FAN COMMUNITY` tag above (`.lg-tag`)
- The JP subtitle + EST. 2024 strip below (`.lg-strip`)

CSS: add `.bf-logo-img { height: 40px; width: auto; display: block; }` to
`Masthead.css`. At the 700px mobile breakpoint, scale to roughly match the current
`.lg-1` font-size shrink (approximately `height: 28px`).

No hover color-shift needed on the `<img>` — the Link wrapper handles focus/hover.

Acceptance criteria:
- [ ] `<img>` with `src` ending in `logo.png` is present inside the masthead Link.
- [ ] `alt` attribute is "北美炸梦同好会".
- [ ] `.lg-tag` ("F A N  C O M M U N I T Y") and `.lg-strip` (JP subtitle +
      EST. 2024) remain in the DOM.
- [ ] `.lg-1.lg-zh` text spans are removed.
- [ ] Logo image is 40px tall on desktop, ~28px on mobile (≤700px).
- [ ] `npm test -- --run` exits 0 (update any Masthead tests asserting old text spans).

### H6: Community link tiles missing per-link accent stripe (border-left tone)

**Location:** `src/pages/Home.jsx` ~line 26–31 (COMMUNITY_LINKS const) + line 317
(the `<a className="bf-link">` JSX); `src/pages/Home.css` line 527 (.bf-link rule)

The design (`styles.css` line 443) specifies `.bf-link { border-left: 3px solid var(--tone); }`.
Each tile passes `style={{'--tone': l.tone}}` to set the CSS custom property per
link. The current port dropped both the `tone` field from the data const and the
`style` prop from the JSX, and the CSS rule is also missing `border-left`.

**Exact tone values from design `data.jsx`** (copy verbatim):
- Discord: `#5865F2`
- QQ 群: `#12B7F5`
- 小红书: `#FF2442`
- X (Twitter): `#000000`
- 论坛: `#E8466E`

Two fixes required:

1. **Data + JSX**: restore `tone` field in `COMMUNITY_LINKS` const (Home.jsx ~line 26)
   for all 4 tile entries (discord, xhs, x, forum). Add `style={{'--tone': l.tone}}`
   to the `<a className="bf-link">` in the map (Home.jsx ~line 317). The QQ card
   is a standalone `<a>` outside the map — give it `style={{'--tone':'#12B7F5'}}` too.

2. **CSS**: add `border-left: 3px solid var(--tone, var(--accent));` to the `.bf-link`
   rule in `Home.css`. The `var(--accent)` fallback guards any tile lacking a tone.

Footer `EXTERNAL_LINKS` tiles do not use `.bf-link` class — no tone stripe needed there.

Acceptance criteria:
- [ ] Each `.bf-link` element has an inline `style` with `--tone` set to its hex.
- [ ] `.bf-link` CSS rule includes `border-left: 3px solid var(--tone, var(--accent))`.
- [ ] Visual: Discord tile has blue left stripe, 小红书 red, X black, 论坛 pink.
- [ ] Unit test: each rendered `.bf-link` anchor has `style` attribute containing
      the expected `--tone` hex value.
- [ ] Fallback: a tile with no `tone` field still renders without JS error (uses `--accent`).

### H7: UtilityBar missing "更新于" timestamp + "同好 N+ 人" count

**Location:** `src/components/UtilityBar/UtilityBar.jsx`

Design (`components.jsx` lines 13–15) shows the left side of UtilityBar has three
items: the 在线 pulse span, a "更新于 2026.05.09 14:32 JST" timestamp, and a
"同好 132+ 人" member count (with `bf-hide-mobile`). Current production only has
the 在线 span.

**Timestamp decision: Option B — render JST from `new Date()` on mount.**
Format: `更新于 YYYY.MM.DD HH:mm JST` using `Intl.DateTimeFormat` with
`timeZone: 'Asia/Tokyo'`. This accurately represents "page rendered at" time.
No `bf-hide-mobile` on timestamp (it is visible at all viewports per design).

**Member count:** hardcode `150+` to match `HARDCODED_MEMBERS` constant already
in `Home.jsx`. Use i18n key `utility.membersCount` with `{count}` substitution.
Add `bf-hide-mobile` class (design line 15 shows it hidden on mobile).

**JA language option: OPEN QUESTION for team-lead.**
`uiLanguage.js` only supports `'en'` and `'zh'` — `VALID = new Set(['en', 'zh'])`.
The design shows `简体 / 日本語 / EN` but JA strings don't exist. Three options:
- A) Add JA end-to-end (new i18n strings everywhere — out of D7 scope-budget)
- B) Show 日本語 button as visual-only / "coming soon" (is itself a dead-link antipattern, same failure mode as H3)
- C) Keep `中 / EN` only (defer JA to separate epic)

**Default: C (keep current 中/EN) unless team-lead directs otherwise.** Developer
should not implement A or B without explicit approval.

**Fix direction:**
1. Add two spans inside `.bf-uleft` after the 在线 span:
   - `<span>{formattedJstTimestamp}</span>` — computed once on mount via
     `Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12: false })`
   - `<span className="bf-hide-mobile">{t('utility.membersCount', { count: '150+' })}</span>`
2. Add i18n keys to `src/data/i18n.json`:
   - `"utility.membersCount"`: `"同好 {count} 人"` (zh) / `"{count} members"` (en)
3. No change to language toggle unless team-lead approves JA.

Acceptance criteria:
- [ ] UtilityBar left side renders "更新于 YYYY.MM.DD HH:mm JST" after mount.
- [ ] Timestamp uses `timeZone: 'Asia/Tokyo'` — never browser-local time.
- [ ] "同好 150+ 人" (or en equivalent) renders with `bf-hide-mobile` class.
- [ ] Both new spans collapse at ≤700px viewport.
- [ ] i18n keys exist in both `zh` and `en` sections of `i18n.json`.
- [ ] Unit test: after mount, timestamp span contains "更新于" + JST-formatted string.
- [ ] Unit test: member count span contains "150+".
- [ ] HIGH-1 regression test (`App.test.jsx:123`) still passes — no stylesheet order change.

### H8: /news page cards render dark background instead of paper palette

**Location:** `src/components/NewsCard/NewsCard.css` line 7

Root cause confirmed by reading source: `NewsCard.css` sets
`background: var(--color-bg-card)` — this is the legacy dark theme token
(`--color-bg-card: #16161f` from `theme.css`). The `<NewsCard>` component was
never ported to the D1 paper-palette tokens. The `/news` page uses `<NewsCard>`
directly, so all grid cards appear dark/navy instead of `var(--paper)` (#fbfaf6).

**Fix:** in `NewsCard.css`, replace `background: var(--color-bg-card)` with
`background: var(--paper)`. Audit the full `NewsCard.css` file and replace any
other legacy `--color-*` token references with their paper-palette equivalents:
- `--color-bg-card` → `var(--paper)`
- `--color-border` → `var(--rule)`
- `--color-text` → `var(--ink)`
- `--color-text-muted` → `var(--ink-3)`
- `--color-primary` → `var(--accent)`
- `--gradient-hero` → `FIXED_GRADIENT` (or remove; thumb has `background-image` override)

Also update `NewsCard.css` `.news-card--compact` background references.
Do NOT touch `NewsCard.jsx` logic — the fix is CSS-only.

Acceptance criteria:
- [ ] `.news-card` background resolves to `var(--paper)` (light: `#fbfaf6`).
- [ ] No `--color-bg-card`, `--color-border`, `--color-text`, `--color-text-muted`,
      `--color-primary` token references remain in `NewsCard.css`.
- [ ] `/news` page cards visually match the paper-palette look of Home page news cards.
- [ ] Unit test: rendered `.news-card` has no inline dark background; computed
      background-color is not `#16161f` or similar dark hex.
- [ ] `npm test -- --run` exits 0.

### H9: /events upcoming table missing 团体 (band) column

**Location:** `src/pages/Events.jsx` lines 111–118 (upcoming `<thead>`) and the
shared `<EventRow>` component (lines 19–47)

Root cause confirmed by reading source: the upcoming `<thead>` has columns
`[日期 | 活动名称 | 地点 | 票务]` — no 团体 column. The past table is identical.
The design (`components.jsx` line 316) shows `[日期 | 团体 | 演出名称 | 会场 | 状态]`.
The `EventRow` component also has no band badge cell.

**Scope clarification:** both upcoming AND past tables are missing 团体. Fix both.

**Column order decision:** insert 团体 between 日期 and 活动名称, matching design:
`[日期 | 团体 | 活动名称 | 地点 | 票务]`. This matches the design's live table
structure and makes band browsable at a glance.

**Band badge rendering:** use `item.bands[0]` (the adapted field from `adaptEventRow`
— `bands` is an array derived from `band_theme`). Look up the band from `BANDS`
data (same pattern as `Home.jsx` `bandFor()`). Render
`<span className="td-band" style={{background: b.color, color: b.ink}}>{b.romaji}</span>`.
If `bands` is empty/null, render `<span className="td-band">—</span>` with no color.

**Fix touches:**
1. Add `团体` `<th>` to both `<thead>` rows (upcoming + past), between 日期 and 活动名称.
   Width: 140px (matching design). Add `bf-hide-mobile` if needed for mobile — the
   design does not hide it, so leave visible by default.
2. Add the band badge `<td>` to `<EventRow>` between the date cell and the title cell.
3. Import `BANDS` data and `bandFor` helper into Events.jsx (or inline the lookup).

Acceptance criteria:
- [ ] Upcoming events table renders `团体` column header.
- [ ] Past events table renders `团体` column header.
- [ ] Each `<EventRow>` renders a band badge cell using `item.bands[0]`.
- [ ] When `bands` is empty, cell renders `—` without crash.
- [ ] Unit test: upcoming table has 5 columns; each row has band badge `<td>`.
- [ ] `npm test -- --run` exits 0.

### H10: /gallery page photo thumbnails show dark placeholder instead of images

**Location:** `src/components/Gallery/PhotoGrid.css` line 37

Root cause confirmed by reading source. The gallery is a **flat photo grid** (not
an album-thumbnail grid) — `Gallery.jsx` fetches individual photos via
`/api/gallery`, groups them by `album` field client-side, and renders each photo
via `<PhotoGrid>` → `<img src={item.imageUrl} />`. There is no band-color block
logic in the frontend code.

The reported "solid band-color blocks" are likely the button placeholder background
showing through when images fail to load from the CDN (`cdn.bangdream.org`). The
placeholder color is `var(--color-bg-card)` — the same legacy dark token bug as H8.

**Two distinct sub-issues to fix:**

1. **CSS placeholder token** (same class as H8): `PhotoGrid.css` line 37:
   `.gallery-thumb__btn { background: var(--color-bg-card); }` — replace with
   `var(--bg-2)` (paper-palette loading placeholder). Also check `PhotoGrid.css`
   for any other `--color-*` legacy token references and replace.

2. **Image load failures** (investigation required): if `item.imageUrl` values in
   the API response are null/empty/broken CDN URLs, photos will never render
   regardless of the CSS fix. Developer should:
   - Log a sample `adaptGalleryRow` output in dev to confirm `imageUrl` is a valid
     URL.
   - If `imageUrl` is null/empty for real data rows, surface to team-lead — this
     is a data-entry gap, not a code bug, and is out of D7 scope.
   - If `imageUrl` is a valid URL but images 404 on CDN, also out of D7 scope.

**Worker shape confirmed (no cover_image_url field needed):** The `/api/gallery`
route returns individual photo rows with `image_url` per row. There is no album-level
endpoint — the frontend groups by `album` string field. No worker changes required.

**Fix for D7:** CSS-only. Replace `var(--color-bg-card)` with `var(--bg-2)` in
`PhotoGrid.css`. If images still show as color blocks after this fix, Developer
must verify `imageUrl` values in the API response and report to team-lead.

Acceptance criteria:
- [ ] `.gallery-thumb__btn` placeholder background uses `var(--bg-2)` (paper tone),
      not `var(--color-bg-card)` (dark navy).
- [ ] No other `--color-*` legacy tokens remain in `PhotoGrid.css`.
- [ ] Unit test: `.gallery-thumb__btn` does not have `--color-bg-card` in its
      computed styles.
- [ ] Developer verifies in dev: sample `imageUrl` from API response is a non-null
      HTTPS URL. If null/empty, document as separate data issue and do not block PR.

### H11: Home news card EVENT tag color not band-aware

**Location:** `src/pages/Home.jsx` ~line 177 (`<span className="nc-tag">`)

**H1 clarification first:** Code re-read confirmed `FIXED_GRADIENT` is used on both
hero card (line 88) and news card thumbs (line 172) — not band-aware. The team-lead
note about "band-color gradients in production" likely reflects a different branch
or cached deploy. H1 spec stands as written: use `hero_image_url` as
`backgroundImage`, fall back to `FIXED_GRADIENT` when null.

**H11 root cause:** Home.jsx stores raw API rows (unadapted) in `newsItems`, so
`n.category`, `n.band_theme`, and `n.hero_image_url` are all available as raw
snake_case fields. The design rule (`index.html` line 70) is:
```
tagBg = n.t === 'ANNOUNCEMENT' ? '#cd2c34' : bandFor(n.band_theme).color
```
Current code (line 177) renders `<span className="nc-tag">` with no inline style,
so CSS default applies — dark/ink — for ALL tag types including EVENT.

**Fix:** add `style` prop to the `<span className="nc-tag">` using the design rule:
- `category === 'announcement'` → background `#cd2c34` (red), color `#fff`
- anything else (event, community, release, etc.) → background `bandFor(n.band_theme).color`,
  color `bandFor(n.band_theme).ink` (white or dark depending on band palette)
- if `n.band_theme` is null/missing → fall back to `var(--accent)` / `#fff`

`bandFor()` helper already exists in `Home.jsx` (line 41) and returns
`BANDS[0]` (the "all" band, ink color) as fallback — use it.

**Also audit `/news` subpage (News.jsx → NewsCard component):** `NewsCard.jsx`
renders `<span className="news-card__category news-card__category--{categoryKey}">` 
with no band-aware color — category color comes from CSS only (uses `--color-primary`
legacy token). Adapted rows don't carry `band_theme`. Fix for `/news` is
**CSS-only**: replace the `--color-primary` token in `NewsCard.css` category rules
with `var(--accent)` (paper-palette). Do NOT add band-aware colors to `NewsCard` —
the adapted shape doesn't carry enough band data for that.

Acceptance criteria:
- [ ] Home news card EVENT tag background matches the card's band color (e.g.
      Roselia purple for a Roselia news item).
- [ ] Home news card ANNOUNCEMENT tag background is `#cd2c34` (red).
- [ ] When `band_theme` is null/missing, EVENT tag falls back to `var(--accent)`.
- [ ] Unit test: render HomeNews with one ANNOUNCEMENT + one EVENT (Roselia) card;
      assert ANNOUNCEMENT span has red bg style, EVENT span has Roselia band color.
- [ ] `/news` page category chip: replace `--color-primary` with `var(--accent)` in
      NewsCard.css category rules (same legacy-token cleanup as H8).

---

## MED — Cleanup items (do if D7 budget allows, same PR)

### M1: Delete dead Responsive wrapper components

Confirmed by grep: `Responsive/Mobile`, `Responsive/Desktop`, `useBreakpoint`, and
`MobileDrawer` have zero consumers outside their own test files.

Delete:
- `src/components/Responsive/Mobile.jsx` + `Mobile.test.jsx`
- `src/components/Responsive/Desktop.jsx` + `Desktop.test.jsx`
- `src/lib/useBreakpoint.js` + `useBreakpoint.test.js`
- `src/components/MobileDrawer/MobileDrawer.jsx` + `MobileDrawer.css` +
  `MobileDrawer.test.jsx`

Verify with grep before deleting. If any active consumer is found, do NOT delete —
escalate to team-lead.

Acceptance criteria:
- [ ] Deleted files have zero non-self import references.
- [ ] `npm test -- --run` exits 0.
- [ ] `npm run build` exits 0.

### M2: Fix apiAdapter.js dead doc comment reference

`src/lib/apiAdapter.js` line ~99 JSDoc references `Members.mobile.jsx` (deleted in
D5). Update the comment to reference `Members.jsx` or remove the
presentational-track parenthetical.

Acceptance criteria:
- [ ] No references to `Members.mobile.jsx` in `apiAdapter.js`.

### M3: Playwright visual smoke script

Add `scripts/smoke-screenshots.js` (plain Node + playwright) to capture all 9
routes at 1440×900 and 390×844. Routes: `/`, `/news`, `/news/<first-slug>`,
`/events`, `/events/<first-slug>`, `/gallery`, `/members`, `/about`, `/rules`.
Save to `tmp/smoke/` (gitignored). Reviewer runs this before APPROVED on any
UI-touching PR.

Add a "## Visual QA" section to README documenting usage.

Acceptance criteria:
- [ ] `node scripts/smoke-screenshots.js` (dev server running) produces 18 PNGs.
- [ ] Script exits non-zero on navigation error or JS exception.
- [ ] `tmp/` in `.gitignore`.

---

## LOW / DEFER — Push to D8

### L1: Dark mode toggle UI

Deferred from D1, now pushed again. D7 is at capacity with the four user bugs.
Implementation approach is locked (see original spec): keep ThemeContext, add a
standalone `DarkModeToggle` component writing `documentElement.dataset.theme`,
mounted in UtilityBar. No-flash inline `<script>` in `index.html`. HIGH-1
regression test must remain green. Ship in D8.

### L2: ThemeSwitcher (band palette picker) placement

`ThemeSwitcher.jsx` exists and is tested but has no render site in the new shell.
The band-palette switcher was removed from the design. Leave orphaned until user
explicitly re-requests. Do not delete without sign-off.

### L3: README — no screenshots to update

Confirmed: README contains no embedded screenshots (`![` not found). No action.

---

## Open Questions (resolved — no blocker)

1. **Community URLs**: canonical URLs confirmed from `App.test.jsx` mock data —
   these are the real production URLs. No fabrication needed.
2. **QQ group URL for Home.jsx QQ card**: same `https://qm.qq.com/q/Dir9OC5TYA`
   used in About page QQ social link.
3. **Chapters → About routing**: `分会` stat tile → `/about` is correct (About page
   covers community structure / chapter breakdown).

---

## Edge Cases to Test

- **H1 image fallback**: `hero_image_url = null`, `hero_image_url = ""`,
  `hero_image_url = undefined` — all must render gradient, not broken box.
- **H2 external links**: all must have `rel="noopener noreferrer"` to prevent
  tabnapping.
- **H3 nav removal**: verify no 404 regression for the 7 remaining nav items; verify
  `/tickets` returns the app's own 404/catch-all (not a blank screen).
- **H4 stat tiles keyboard**: Tab through hero section — all three stat tiles must
  be reachable and show focus ring.
- **H5 logo asset**: verify `public/logo.png` exists before Developer starts;
  if missing, block on asset delivery — do not substitute favicon.png.
- **M1 deletion**: grep for `Responsive/`, `useBreakpoint`, `MobileDrawer` in
  all non-deleted `src/` files before and after deletion.

---

## Designer Notes

### H1 — Hero/news image overlay treatment
- When `hero_image_url` non-null: `background: linear-gradient(135deg, rgba(31,29,26,0.30) 0%, transparent 60%), url(...) center/cover no-repeat`
- Gradient direction 135deg, ink at 30% opacity fading to transparent — keeps text readable on bright images without fully obscuring the photo
- When null/empty: fall back to `FIXED_GRADIENT` constant unchanged
- Text overlay legibility: hero card title + category tag sit on top of the gradient layer; no additional text-shadow needed given 30% ink overlay
- Do NOT add a separate dark scrim `<div>` — keep it pure CSS background shorthand

### H2 — Community link external URLs
- No UTM or tracking params on any link — plain canonical URLs verbatim from spec
- All 5 community links + Footer links: `target="_blank" rel="noopener noreferrer"` required (prevents tabnapping)
- QQ card standalone `<a>` in HomeJoin also gets `target="_blank" rel="noopener noreferrer"` — it is external
- Visual: no indicator icon needed; existing `.lk-arrow` glyph ("→") already signals external

### H3 — Dead nav removal
- Final primary nav list (7 items): 首页 / 新闻 / 活动 / 相册 / 成员 / 关于 / 群规
- Items removed: 出票公告 (`/tickets`), 现地攻略 (`/guide`), 论坛 (`#forum`)
- No CSS change required — flex nav naturally closes gaps when `<NavLink>` elements are deleted
- Footer: also remove `/guide` from RESOURCE_LINKS and `/tickets` from EXTERNAL_LINKS; no visual compensation needed

### H4 — Stat tile links
- Each tile: wrap existing `<div>` content in `<Link to="...">` — preserve all existing classes/children unchanged
- If `.bf-hh-stats > div` has `:hover` styles, they will NOT auto-transfer to `<Link>` if Link renders as inline `<a>`
- Fix: add `display: block` (or `display: flex`) to the Link so it inherits the div's layout; alternatively target `.bf-hh-stats a` alongside `.bf-hh-stats > div` in CSS
- Focus ring: existing `a:focus-visible` global rule covers keyboard navigation — no new CSS needed
- No tooltip or aria-label needed; tile label ("同好", "分会", "活动") is already descriptive

### H5 — Logo image
- Replace `.lg-1.lg-zh` text block with `<img src="/logo.png" alt="北美炸梦同好会" className="bf-logo-img" />`
- CSS: `.bf-logo-img { height: 40px; width: auto; display: block; }` — `display: block` removes baseline descender gap
- Mobile (≤700px): `height: 28px` — proportional scale matches former `.lg-zh` font-size shrink
- Hover: outer `<Link>` wrapper handles hover/focus; img gets `opacity: 0.85` on `.bf-logo:hover .bf-logo-img` as subtle press feedback
- Vertical alignment: `display: block` on img + `align-items: flex-start` on `.bf-logo` keeps FAN COMMUNITY tag above and .lg-strip below correctly stacked
- Pre-flight check: verify `public/logo.png` exists before starting; do NOT substitute `favicon.png`

### H6 — Tile accent stripe (border-left tone)
- Exact tone hex values (copy verbatim into COMMUNITY_LINKS data):
  - Discord: `#5865F2`
  - QQ 群: `#12B7F5`
  - 小红书: `#FF2442`
  - X (Twitter): `#000000`
  - 论坛: `#E8466E`
- CSS rule (add to existing `.bf-link` block in Home.css): `border-left: 3px solid var(--tone, var(--accent));`
- Reference source: `styles.css` line 443 — `.bf-link { border-left: 3px solid var(--tone); }` — fallback `var(--accent)` guards missing tone
- QQ standalone card: `style={{'--tone': '#12B7F5'}}` inline on its `<a>`
- Map items: `style={{'--tone': l.tone}}` on each `<a className="bf-link">`
- No other visual change to the tile layout

### H7 — UtilityBar timestamp + member count
- Timestamp span: no `bf-hide-mobile` — visible at all viewports per design (line 14 of components.jsx has no hide-mobile class)
- Font: both new spans inherit `.bf-utility` font-family (`var(--mono)`) — no extra className needed
- Member count span: `className="bf-hide-mobile"` — collapses at ≤700px
- JA decision: confirmed C — keep `中 / EN` only; do NOT render 日本語 button in any form
- Format string: `更新于 YYYY.MM.DD HH:mm JST` — `Intl.DateTimeFormat` with `timeZone: 'Asia/Tokyo'`, `hour12: false`
- i18n key `utility.membersCount`: zh = `"同好 {count} 人"`, en = `"{count} members"`; hardcode count as `"150+"`

### H8 — News page dark cards (CSS-only token swap)
- No JSX changes — `NewsCard.jsx` logic untouched
- Full token replacement map for `NewsCard.css`:
  - `--color-bg-card` → `var(--paper)` (`#fbfaf6` light)
  - `--color-border` → `var(--rule)`
  - `--color-text` → `var(--ink)`
  - `--color-text-muted` → `var(--ink-3)`
  - `--color-primary` → `var(--accent)`
  - `--gradient-hero` → remove or replace with `FIXED_GRADIENT` value if needed
- Apply same replacements to `.news-card--compact` variant
- Audit entire `NewsCard.css` — do not leave any `--color-*` legacy token behind

### H9 — Events 团体 column
- New `<th>` label: `团体` — insert between 日期 and 活动名称 in both upcoming and past `<thead>`
- Column width: `140px` — wide enough for romaji band name badge
- Badge element: `<span className="td-band" style={{background: b.color, color: b.ink}}>{b.romaji}</span>`
  - Style matches `styles.css` line 266: mono font, 10px, 2px 6px padding, uppercase, letter-spacing 0.06em
- Empty/null bands: `<span className="td-band">—</span>` with no color style — no crash
- Mobile: do NOT add `bf-hide-mobile` — design keeps it visible; table-as-card layout handles stacking natively
- `bandFor()` or inline BANDS lookup — same pattern as Home.jsx line 41

### H10 — Gallery photo placeholder (CSS-only)
- Replace `var(--color-bg-card)` with `var(--bg-2)` in `.gallery-thumb__btn` — warm paper-toned placeholder instead of dark navy
- Audit all of `PhotoGrid.css` for remaining `--color-*` legacy tokens; replace per H8 token map
- Image load verification is Developer responsibility: log sample `adaptGalleryRow` output in dev; if `imageUrl` is null/broken CDN, surface to team-lead as data issue (out of D7 scope)
- No JSX change

### H11 — News EVENT tag band-aware color
- Home.jsx `<span className="nc-tag">` inline style rule:
  - `category === 'announcement'` → `{background: '#cd2c34', color: '#fff'}`
  - all other categories → `{background: bandFor(n.band_theme).color, color: bandFor(n.band_theme).ink}`
  - null/missing `band_theme` → `bandFor()` already returns `BANDS[0]` fallback (ink color + white text)
- `bandFor()` called twice per card max — acceptable; no memoization needed for 4 cards
- `/news` subpage (NewsCard): CSS-only — replace `--color-primary` with `var(--accent)` in category chip rules; do NOT add band-aware inline styles (adapted shape has no band_theme)
- White `#fff` is legible on both `#cd2c34` (red) and any band color (bands use saturated hues with sufficient contrast)

### Cross-cutting legacy token cleanup
- Root cause shared by H8, H10, H11 fallback: `--color-bg-card`, `--color-primary`, `--color-text` etc. are dark-theme legacy tokens never ported to paper-palette
- All affected CSS files (NewsCard.css, PhotoGrid.css, any category chip rules in NewsCard.css) must be swept in the same commit
- No `--color-*` legacy tokens should remain in any file touched by D7

---

## D7 Commit Scope: Single PR (revised)

One PR (`feat/d7-cleanup`). H1–H4+H6 touch `Home.jsx`/`PrimaryNav.jsx`/`Footer.jsx`/
`Home.css`; H5 touches `Masthead.jsx`/`Masthead.css`; H7 touches `UtilityBar.jsx`/
`i18n.json`; H8 touches `NewsCard.css`; H9 touches `Events.jsx`. All tightly
scoped. M1–M3 are additive/deletion. No split needed unless M3 blocks CI review.

---

## Architect integration check

### 1. Exact file:line edit list per H1–H11

**H1** — `src/pages/Home.jsx`
- Line 88: EDIT — `style={{ background: FIXED_GRADIENT }}` on `.bf-hh-feature` Link
  → `style={{ background: featured.hero_image_url ? \`linear-gradient(135deg, rgba(31,29,26,0.30) 0%, transparent 60%), url(${featured.hero_image_url}) center/cover no-repeat\` : FIXED_GRADIENT }}`
- Line 172: EDIT — `style={{ background: FIXED_GRADIENT }}` on `.nc-thumb` div
  → `style={{ background: n.hero_image_url ? \`linear-gradient(135deg, rgba(31,29,26,0.30) 0%, transparent 60%), url(${n.hero_image_url}) center/cover no-repeat\` : FIXED_GRADIENT }}`

**H2** — `src/pages/Home.jsx`
- Lines 26–31: EDIT `COMMUNITY_LINKS` — add `href` + `tone` fields per H6 merge (see H6); wire `href` for all 4 entries.
- Line 309: EDIT `<a href="#">` on QQ card → `<a href="https://qm.qq.com/q/Dir9OC5TYA" target="_blank" rel="noopener noreferrer"`
- Line 317: EDIT `<a key={l.id} href="#">` → `<a key={l.id} href={l.href} target="_blank" rel="noopener noreferrer"`

`src/components/Footer/Footer.jsx`
- Line 8: EDIT `{ to: '#', label: 'QQ 群 / Discord', external: true }` → split into two entries: QQ `https://qm.qq.com/q/Dir9OC5TYA` and Discord `https://discord.gg/WfMBKaW8Br`, both `external: true`
- Line 19: EDIT `{ to: '#', label: 'X @BandoriNACC ↗' }` → `{ to: 'https://x.com/BandoriNACC', label: 'X @BandoriNACC ↗' }`
- Line 20: EDIT `{ to: '#', label: '小红书 @北美炸梦 ↗' }` → `{ to: 'https://xhslink.com/m/1s9XmQRoAug', label: '小红书 @北美炸梦 ↗' }`
- Line 21: EDIT `{ to: '#', label: '论坛 forum.bangdream.org ↗' }` → `{ to: 'https://forum.bangdream.org', label: '论坛 forum.bangdream.org ↗' }`
- Lines 79–88: EDIT the `EXTERNAL_LINKS` renderer — currently `link.to.startsWith('/')` gates internal vs external; since all remaining `EXTERNAL_LINKS` are now full URLs, they fall to the `<a href={link.to}>` branch. ADD `target="_blank" rel="noopener noreferrer"` to that `<a>` element.

**H3** — `src/components/PrimaryNav/PrimaryNav.jsx`
- Lines 9, 10, 14: DELETE the three entries `{ id: 'tickets', ... }`, `{ id: 'guides', ... }`, `{ id: 'forum', ... }` from `NAV_ITEMS`. Result: 7-item array.

`src/components/Footer/Footer.jsx`
- Line 15: DELETE `{ to: '/guide', label: '现地攻略', external: false }` from `RESOURCE_LINKS`
- Line 22: DELETE `{ to: '/tickets', label: '出票公告' }` from `EXTERNAL_LINKS`

`src/components/PrimaryNav/PrimaryNav.test.jsx`
- Line 26: UPDATE assertion `links.length >= 10` → `links.length === 7` (7 nav items post-removal)
- Line 58: DELETE or update the assertion checking for `a[href$="#forum"]` — forum link no longer exists

**H4** — `src/pages/Home.jsx`
- Lines 133–145 (`.bf-hh-stats` div block): EDIT — wrap each of the three `<div>` children in `<Link to="...">`:
  - First `<div>` (HARDCODED_MEMBERS / 同好) → `<Link to="/members" className="..." style="display:block">`
  - Second `<div>` (HARDCODED_CHAPTERS / 分会) → `<Link to="/about" ...>`
  - Third `<div>` (eventsTotal / 活动) → `<Link to="/events" ...>`
- ADD `import { Link } from 'react-router-dom'` is already present at line 2. No new import needed.

**H5** — `src/components/Masthead/Masthead.jsx`
- Lines 20–23: DELETE `<span className="lg-1 lg-zh">` block containing `.lg-bandori` and `.lg-fans` spans
- ADD in place: `<img src="/logo.png" alt="北美炸梦同好会" className="bf-logo-img" />`

`src/components/Masthead/Masthead.css`
- ADD new rule after existing `.bf-logo` block:
  `.bf-logo-img { height: 40px; width: auto; display: block; }`
- ADD inside existing `@media (max-width: 700px)` block (or create new one):
  `.bf-logo-img { height: 28px; }`
- ADD hover feedback: `.bf-logo:hover .bf-logo-img { opacity: 0.85; }`

`src/components/Masthead/Masthead.test.jsx`
- Lines 22–30: UPDATE test `'renders logo lockup with CN wordmark + tag + strip'`
  - DELETE assertions for `.lg-bandori`, `.lg-fans`, `textContent contains '北美炸梦'`, `textContent contains '同好会'`
  - ADD assertion: `container.querySelector('img.bf-logo-img')` is in document
  - ADD assertion: `img.getAttribute('src')` ends with `'logo.png'`
  - ADD assertion: `img.getAttribute('alt')` === `'北美炸梦同好会'`
  - KEEP assertions for `.lg-tag` and `.lg-strip`

**H6** — `src/pages/Home.jsx`
- Lines 26–31: EDIT `COMMUNITY_LINKS` const — add `href` and `tone` to each entry:
  ```js
  { id: 'discord', name: 'Discord', handle: '...', desc: '...', href: 'https://discord.gg/WfMBKaW8Br', tone: '#5865F2' },
  { id: 'xhs', name: '小红书', ..., href: 'https://xhslink.com/m/1s9XmQRoAug', tone: '#FF2442' },
  { id: 'x', name: 'X (Twitter)', ..., href: 'https://x.com/BandoriNACC', tone: '#000000' },
  { id: 'forum', name: '论坛', ..., href: 'https://forum.bangdream.org', tone: '#E8466E' },
  ```
- Line 309 (QQ card `<a>`): ADD `style={{'--tone': '#12B7F5'}}` inline prop
- Line 317 (map `<a className="bf-link">`): ADD `style={{'--tone': l.tone}}`

`src/pages/Home.css`
- Find existing `.bf-link` rule (line ~527): ADD `border-left: 3px solid var(--tone, var(--accent));`

**H7** — `src/components/UtilityBar/UtilityBar.jsx`
- Lines 27–30: EDIT `.bf-uleft` div — ADD two new `<span>` elements after the existing 在线 span:
  1. `<span>{formattedJstTimestamp}</span>` (computed once on mount via `useState` + `useEffect`)
  2. `<span className="bf-hide-mobile">{t('utility.membersCount', { count: '150+' })}</span>`
- ADD `import { useState, useEffect } from 'react'` (currently only `useSyncExternalStore` is imported)
- ADD `useEffect` on mount to compute JST timestamp:
  ```js
  const [ts, setTs] = useState('')
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const parts = fmt.formatToParts(new Date())
    // build: 更新于 YYYY.MM.DD HH:mm JST
    const y = parts.find(p => p.type === 'year').value
    const mo = parts.find(p => p.type === 'month').value
    const d = parts.find(p => p.type === 'day').value
    const h = parts.find(p => p.type === 'hour').value
    const mi = parts.find(p => p.type === 'minute').value
    setTs(`更新于 ${y}.${mo}.${d} ${h}:${mi} JST`)
  }, [])
  ```

`src/data/i18n.json`
- ADD to `en` section: `"utility.membersCount": "{count} members"`
- ADD to `zh` section: `"utility.membersCount": "同好 {count} 人"`

**H8** — `src/components/NewsCard/NewsCard.css`
Token replacements (all occurrences):
- Line 7: `background: var(--color-bg-card)` → `background: var(--paper)`
- Line 8: `border: 1px solid var(--color-border)` → `border: 1px solid var(--rule)`
- Line 17 (hover): `border-color: var(--color-primary)` → `border-color: var(--accent)`
- Line 22: `background-image: var(--gradient-hero)` → remove line (no active gradient on thumb; covered by inline style or kept empty)
- Line 40: `color: var(--color-text-muted)` → `color: var(--ink-3)`
- Line 52: `background: color-mix(in srgb, var(--color-primary) 18%, transparent)` → `background: color-mix(in srgb, var(--accent) 18%, transparent)`
- Line 53: `color: var(--color-text)` → `color: var(--ink)`
- Line 54: `border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)` → `border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent)`
- Line 69: `color: var(--color-text)` → `color: var(--ink)`
- Line 75: `color: var(--color-text-muted)` → `color: var(--ink-3)`
- Line 96: `.news-card--compact .news-card__thumb`: `background-color: var(--color-bg-card)` → `background-color: var(--paper)`
- Line 110: `color: var(--color-text-muted)` → `color: var(--ink-3)`
- Line 138: `.news-card-link:focus-visible`: `outline: 2px solid var(--color-primary)` → `outline: 2px solid var(--accent)`
Also for H11 NewsCard category chip (same file):
- Lines 57–59: `.news-card__category--event` references `--color-accent` (not a legacy token, fine as-is if `--color-accent` resolves; but spec says replace `--color-primary` with `var(--accent)` for consistency)

**H9** — `src/pages/Events.jsx`
- Lines 111–118 upcoming `<thead>`: ADD `<th style={{ width: 140 }}>团体</th>` between `<th style={{ width: 120 }}>日期</th>` and `<th>活动名称</th>`
- Lines 133–139 past `<thead>`: same insertion
- `<EventRow>` component (lines 19–47): ADD band badge `<td>` between date `<td>` and title `<td>`:
  ```jsx
  const b = item.bands && item.bands.length > 0 ? bandFor(item.bands[0]) : null
  // in JSX:
  <td>{b ? <span className="td-band" style={{background: b.color, color: b.ink}}>{b.romaji}</span> : <span className="td-band">—</span>}</td>
  ```
- ADD `import { BANDS } from '../data/bands.js'` and `function bandFor(id) { return BANDS.find(b => b.id === id) || BANDS[0] }` — OR re-export `bandById` from `bands.js` (it already exports `bandById`; use that directly).
- Verify `adaptEventList` output shape has `bands` field — check `src/lib/apiAdapter.js` for `adaptEventRow`. If `bands` is not in adapted shape, ADD it from `band_theme` field (single-element array `[band_theme]` or `[]` when null).

**H10** — `src/components/Gallery/PhotoGrid.css`
- Line 37: `background: var(--color-bg-card)` → `background: var(--bg-2)`
- Line 55: `outline: 2px solid var(--color-primary)` → `outline: 2px solid var(--accent)`
  (only two legacy token references in this file; both replaced)

**H11** — `src/pages/Home.jsx`
- Line 177 `<span className="nc-tag">`: ADD `style` prop:
  ```jsx
  style={
    (n.category || '').toLowerCase() === 'announcement'
      ? { background: '#cd2c34', color: '#fff' }
      : { background: bandFor(n.band_theme).color, color: bandFor(n.band_theme).ink }
  }
  ```
  `bandFor()` already defined at line 41. No new import needed.

**M1 — Files to delete** (source files only; test files co-located with them must be deleted too):
- `src/components/Responsive/Mobile.jsx` — CONFIRMED ABSENT (source already deleted; only test file remains)
- `src/components/Responsive/Desktop.jsx` — CONFIRMED ABSENT
- `src/lib/useBreakpoint.js` — CONFIRMED ABSENT
- `src/components/MobileDrawer/MobileDrawer.jsx` + `MobileDrawer.css` — CONFIRMED ABSENT

Their test files STILL EXIST (found by glob):
- `src/components/Responsive/Desktop.test.jsx` — DELETE
- `src/components/Responsive/Mobile.test.jsx` — DELETE
- `src/lib/useBreakpoint.test.js` — DELETE
- `src/components/MobileDrawer/MobileDrawer.test.jsx` — DELETE

Developer must verify these tests all fail (referencing deleted source) before deleting them, confirming zero live consumers.

**M2** — `src/lib/apiAdapter.js`
- Line ~1 JSDoc: EDIT reference `Members.mobile.jsx` → `Members.jsx` or remove the parenthetical

---

### 2. Worker touchpoints check

**NONE.** All 11 HIGH bugs are frontend-only (JSX, CSS, i18n.json). No changes required to `worker/` directory. H10 sub-issue (imageUrl null from API) is flagged as a potential data-entry gap but the frontend code change is CSS-only. Worker is clean.

---

### 3. Test scaffolding — MemoryRouter wrapper precedent

All Home, PrimaryNav, UtilityBar, and Masthead tests already use `MemoryRouter` or `MemoryRouter` + `Routes`. Canonical pattern from `src/pages/Home.test.jsx:9–17`:

```jsx
render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  </MemoryRouter>
)
```

For component-only tests (no routing needed): `src/components/Masthead/Masthead.test.jsx:8` uses bare `<MemoryRouter>` wrapper. New tests for `Events.jsx` and `UtilityBar.jsx` additions follow the same pattern.

---

### 4. New i18n keys (full enumeration)

Two new keys required in `src/data/i18n.json`:

| Key | `en` value | `zh` value |
|-----|-----------|-----------|
| `utility.membersCount` | `"{count} members"` | `"同好 {count} 人"` |

No other new keys. H2, H3, H4, H6, H8, H9, H10, H11 are code/CSS changes only. H5 is a JSX substitution with a hardcoded alt string (site-chrome carve-out, no i18n needed). JA decision locked to option C — no JA keys added.

---

### 5. Edge tests enumerated (minimum 15 new tests)

**H1 — 3 tests** (`src/pages/Home.test.jsx`):
1. `hero_image_url` provided → background style contains `url(https://...)` on `.bf-hh-feature`
2. `hero_image_url = null` → background style equals `FIXED_GRADIENT` constant, no broken-image box
3. `hero_image_url = ""` (empty string) → falls back to `FIXED_GRADIENT` (empty string is falsy)

**H2 — 2 tests** (new `src/pages/Home.test.jsx` section):
4. QQ card `<a>` has `href="https://qm.qq.com/q/Dir9OC5TYA"` + `rel="noopener noreferrer"`
5. All 4 community link `<a>` elements have non-`#` hrefs matching the canonical URL list

**H3 — 2 tests** (`src/components/PrimaryNav/PrimaryNav.test.jsx` UPDATE):
6. Nav renders exactly 7 links (replaces current `>= 10` assertion)
7. No link with `href="/tickets"`, `href="/guide"`, or `href$="#forum"` exists in nav DOM

**H4 — 2 tests** (`src/pages/Home.test.jsx`):
8. `.bf-hh-stats` 同好 tile renders as `<a href="/members">`
9. `.bf-hh-stats` 活动 tile renders as `<a href="/events">`

**H5 — 2 tests** (`src/components/Masthead/Masthead.test.jsx` UPDATE):
10. `img.bf-logo-img` present with `src` ending in `logo.png` and `alt="北美炸梦同好会"`
11. `.lg-bandori` and `.lg-fans` text spans are ABSENT from DOM

**H6 — 1 test** (`src/pages/Home.test.jsx`):
12. Each `.bf-link` element has inline `style` with `--tone` hex; QQ card has `--tone:#12B7F5`

**H7 — 2 tests** (`src/components/UtilityBar/UtilityBar.test.jsx`):
13. After mount, `.bf-uleft` contains span with text matching `更新于` + JST date pattern (`YYYY.MM.DD`)
14. `.bf-uleft` contains span with `bf-hide-mobile` class containing `150+`

**H9 — 2 tests** (`src/pages/Events.test.jsx`):
15. Upcoming table header has 5 `<th>` elements; third header text is `团体`
16. `EventRow` with `bands = []` renders `<span className="td-band">—</span>` without crash

**H11 — 1 test** (`src/pages/Home.test.jsx`):
17. HomeNews renders ANNOUNCEMENT card → `nc-tag` span has `style.background === '#cd2c34'`
18. HomeNews renders EVENT card with `band_theme: 'roselia'` → `nc-tag` span has Roselia color `#3a3f7a`

**Cross-cutting regression** — 1 test:
19. `npm test -- --run` exits 0 with all existing tests (App.test.jsx HIGH-1 regression test still passes)

Total: 19 new/updated tests, exceeding the minimum 15.

---

### 6. Files to delete (M1)

Source files already deleted (confirmed absent from worktree glob):
- `src/components/Responsive/Mobile.jsx`
- `src/components/Responsive/Desktop.jsx`
- `src/lib/useBreakpoint.js`
- `src/components/MobileDrawer/MobileDrawer.jsx`
- `src/components/MobileDrawer/MobileDrawer.css`

Orphaned test files that MUST be deleted (confirmed present):
- `src/components/Responsive/Desktop.test.jsx`
- `src/components/Responsive/Mobile.test.jsx`
- `src/lib/useBreakpoint.test.js`
- `src/components/MobileDrawer/MobileDrawer.test.jsx`

Developer must run `grep -r "Responsive\|useBreakpoint\|MobileDrawer" src/ --include="*.{jsx,js,ts,tsx}"` (excluding the test files themselves) to confirm zero live imports before deleting tests.

---

### 7. Cross-cutting legacy token sweep

Files containing `--color-bg-card`:
- `src/components/NewsCard/NewsCard.css` lines 7, 96 → replace with `var(--paper)` (H8)
- `src/components/Gallery/PhotoGrid.css` line 37 → replace with `var(--bg-2)` (H10)

Files containing `--color-primary`:
- `src/components/NewsCard/NewsCard.css` lines 17, 52, 54, 138 → replace with `var(--accent)` (H8)
- `src/components/Gallery/PhotoGrid.css` line 55 → replace with `var(--accent)` (H10)

Files containing `--color-text` / `--color-text-muted`:
- `src/components/NewsCard/NewsCard.css` lines 40, 53, 69, 75, 110 → `var(--ink-3)` or `var(--ink)` per token map (H8)

Files containing `--color-border`:
- `src/components/NewsCard/NewsCard.css` line 8 → replace with `var(--rule)` (H8)

Files containing `--gradient-hero`:
- `src/components/NewsCard/NewsCard.css` line 22 → remove line or replace with empty (no gradient on thumb by default; `FIXED_GRADIENT` applied inline when needed)

Paper-palette equivalents reference:
| Legacy token | Paper-palette replacement |
|---|---|
| `--color-bg-card` | `var(--paper)` (#fbfaf6) |
| `--color-border` | `var(--rule)` |
| `--color-text` | `var(--ink)` |
| `--color-text-muted` | `var(--ink-3)` |
| `--color-primary` | `var(--accent)` |
| `--gradient-hero` | remove / inline override |

No other CSS files were found to contain these legacy tokens in this worktree. Token sweep is contained to `NewsCard.css` and `PhotoGrid.css`.

---

### 8. Pre-flight checks for Developer

**public/logo.png** — CONFIRMED EXISTS at `C:/Users/WaterMelon/bangdream-na-worktrees/d7-cleanup/public/logo.png`. Not a blocker. Developer may proceed with H5.

**socialLinks.json** — CONFIRMED ABSENT. H2 URLs sourced from `App.test.jsx` mock data (canonical, as per Planner decision). No file lookup needed.

---

### 9. Legacy token cleanup: ship in this PR

Decision: **SHIP IN PR.** H8 and H10 are pure token swaps already in scope. Splitting them out creates a separate PR for 2-file CSS edits with no independent value. The token cleanup is what FIXES the visible bugs — it is the fix, not a cleanup pass.

---

### 10. PR scope: ship as one PR

Decision: **SHIP AS ONE PR.** All 11 HIGH bugs share cross-cutting legacy tokens and the same pages. Splitting would require coordinated merges with token deps. Reviewer audits by section (H1 through H11). M1 deletion is additive-only (no production code changed). M3 (smoke script) is pure-add and does not affect any test or build.

Risk acknowledgement: 11 HIGH bugs is a large diff. Mitigations:
- All changes are UI-layer only; no data model or Worker changes
- Each H finding is independently reverted without cascading side effects
- Reviewer uses the smoke-screenshots script (M3) to visually validate each section before APPROVED

---

### GO / NO-GO for Developer

**GO.** All pre-flight conditions met:
- `public/logo.png` exists
- No worker touchpoints
- MemoryRouter wrapper pattern established
- i18n.json keys enumerated
- Legacy token sweep bounded to 2 CSS files
- M1 source files already deleted; only orphaned test files remain to delete

Developer can begin implementing H1–H11 + M1–M3 against worktree `C:/Users/WaterMelon/bangdream-na-worktrees/d7-cleanup`.
