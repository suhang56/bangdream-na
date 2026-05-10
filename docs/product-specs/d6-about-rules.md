# D6 — About + Rules: Claude Design Port

## Overview

Rewrite `About.jsx` / `About.css` and `Rules.jsx` / `Rules.css` to match the Bandori.fans (bf-*) design language shipped in D1. The chrome changes only — all user-visible copy is preserved exactly as fetched from the API.

---

## Scope

### About page (`/about`)

Replace the existing ad-hoc About layout with bf-* classes:

| Section | bf-* pattern | Notes |
|---|---|---|
| Page hero | `bf-page-hd` wrapper inside `bf-container` | tag `// 关于` + H1 `关于北美炸梦` + meta subtitle |
| Mission block | `bf-about-block` with `bf-helper-tag` | renders `about.mission` paragraphs |
| Join block | `bf-about-block` with `bf-helper-tag` | renders `about.joinInstructions` + QQ CTA button |
| Stats 4-col | `bf-about-stats` grid inside `bf-about-block` | member count, news count, events count, chapters |
| FAQ list | `bf-about-block` + `bf-faq` `<ul>` | each item: `<strong>` for Q, `<span>` for A |
| Disclaimer block | `bf-about-block` with `bf-helper-tag` | renders i18n disclaimer body |

**Stats values** (read from live data where available, fallback constants otherwise):
- Members: from `socialData` member count or hardcoded `50+`
- News: count not available from API → omit stat or use static label
- Events: not available at About load time → omit or static
- Chapters: static `9`

Implementors note: the reference design (`community.jsx` `AboutPage`) uses `D.MEMBERS.length`, `D.NEWS.length`, `D.EVENTS_PAST.length + D.EVENTS_UPCOMING.length`. Since About only fetches `fetchAbout()` + `fetchSite()` + `fetchSocial()`, stats section should show 4 static-ish values: use constants for events/news/chapters; member count may remain static (50+). Do NOT add new API calls to keep scope minimal.

**Tri-lingual hero preserved**: JP `<p lang="ja">` / ZH `<h1 lang="zh">` / EN `<p lang="en">` structure stays. The `bf-page-hd` header above this provides the page tag + canonical H1 (`关于北美炸梦`). Existing hero section becomes a secondary block or is folded into the mission block.

Actually: preserve the tri-lingual hero as the page hero inside `bf-page-hd` — the `ph-tag` becomes `// 关于`, H1 becomes the ZH community name, and the EN/JP names render as sub-labels.

### Rules page (`/rules`)

Replace with bf-rule numbered cards:

| Section | bf-* pattern | Notes |
|---|---|---|
| Page hero | `bf-page-hd` wrapper | tag `// 群规` + H1 `群规` + meta subtitle from i18n |
| Scope helper box | `bf-helper` box | `// 适用范围` label + scope description from `t('rules.subtitle')` |
| Rule cards | `bf-rule` articles | each paragraph = one card; `bf-rule-n` shows `①②③…` circled nums |
| Footer helper | `bf-helper` box | `// 摘要` label + footer note from `t('rules.footerNote')` |

**Numbered glyphs**: paragraphs of `coc` (split by `\n\n`) map to cards. The `bf-rule-n` displays circled Unicode numerals (① ② ③ … up to ⑳) or falls back to a plain number string. Implementors may use an array `['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳']` indexed by position.

---

## Content Preservation

- **All visible copy** is fetched from the API (About endpoint) and rendered as-is.
- **i18n keys** (`t('about.*')`, `t('rules.*')`, `t('empty.*')`, `t('btn.*')`) are unchanged.
- **No new i18n keys** introduced. Use existing keys only.
- The `coc` field text already contains circled numerals (①②③…) at the start of each paragraph — the `bf-rule-n` slot should display this leading glyph extracted from the text, OR display a generated circled number and strip the leading glyph from `bf-rule-text`. Either approach is acceptable; strip-and-display is cleaner.

---

## CSS Class Inventory

Classes to add to `About.css` / `Rules.css` (scoped, no global pollution):

**About.css additions:**
- `.bf-page-hd` — page header wrapper (border-bottom, bg var(--paper))
- `.bf-about-block` — white card block with border
- `.bf-about-stats` — 4-col grid of stat cells
- `.bf-about-stats .num` — large display number
- `.bf-about-stats .lbl` — mono uppercase label
- `.bf-faq` — vertical FAQ list
- `.bf-faq li` — flex-col Q+A item
- `.bf-helper-tag` — already in tokens.css (use directly, do not redeclare)
- `.about-join-cta` — existing pink pill button kept as-is

**Rules.css additions:**
- `.bf-page-hd` — same page header pattern
- `.bf-rules` — flex-col container
- `.bf-rule` — grid card (60px number + 1fr text), border-left accent
- `.bf-rule-n` — large display number glyph
- `.bf-rule-text` — body text
- `.bf-helper` — already in tokens.css (use directly)

Note: `bf-helper`, `bf-helper-tag`, `bf-cta`, `bf-cta-2`, `bf-container`, `bf-pill`, `bf-divider` are declared in `src/theme/tokens.css` — import only, do not redeclare.

---

## Layout Shell Integration

- Both pages are already wrapped in `LayoutShell` via `App.jsx` routes.
- Pages render as `<main>` (or equivalent) inside `bf-shell-main`.
- Pages should NOT import `LayoutShell` directly.
- `bf-page-hd` header sits as the first child of `<main>`, before section content.
- `bf-container` wraps the inner content of `bf-page-hd` for max-width constraint.

---

## Responsive Breakpoints

- `bf-about-stats`: 4-col → 2-col at `@media (max-width: 700px)`
- `bf-rule` cards: collapse number grid at `@media (max-width: 540px)` (stack vertically)
- `bf-page-hd` text: smaller font-size at `@media (max-width: 540px)`

---

## Edge Tests (≥ 6 mandatory)

### About edge tests (`About.test.jsx` additions)

1. **Long FAQ answer** — FAQ item with answer text > 300 chars renders fully (no truncation, no crash)
2. **Empty FAQ list** — `faq: []` renders empty state `t('empty.noFaq')` text, not a broken list
3. **Missing mission** — `about.mission = ''` renders Mission block with empty body (no crash, heading still visible)
4. **Missing joinInstructions** — `joinInstructions: ''` renders Join block with no paragraphs, CTA button still shown if QQ social link active
5. **QQ CTA hidden when disabled** — social entry `platform: 'qq', enabled: false` → no CTA link rendered in Join block
6. **Stats grid renders 4 cells** — stats block always renders exactly 4 stat cells regardless of API data

### Rules edge tests (`Rules.test.jsx`)

7. **Empty rule list** — `coc: ''` renders `t('empty.noCoc')` fallback, footer helper still shown
8. **Single rule** — `coc` with one paragraph renders exactly 1 `bf-rule` card
9. **Many rules (20)** — 20 paragraphs render 20 cards; 20th card gets ⑳ glyph or '20'
10. **Long rule text** — paragraph > 500 chars renders without truncation
11. **bf-rule cards have border-left** — computed style or class check on `.bf-rule`
12. **Page hero tag visible** — `// 群规` tag text present in DOM on load

---

## Files to Create / Modify

- `src/pages/About.jsx` — rewrite
- `src/pages/About.css` — rewrite
- `src/pages/About.test.jsx` — add edge tests (preserve existing tests)
- `src/pages/Rules.jsx` — rewrite
- `src/pages/Rules.css` — rewrite
- `src/pages/Rules.test.jsx` — **new file** (Rules had no test file)

## Files NOT to touch

- `src/App.jsx` (routes unchanged)
- `src/theme/tokens.css` (already has needed bf-* tokens)
- `worker/` (no worker touchpoints expected — STOP and DM team-lead if hit)
- Any other page components

---

## Acceptance Criteria

- [ ] `npx vitest run` passes (all existing + new tests green)
- [ ] `npm run build` passes (no TS/lint errors)
- [ ] `/about` visually: bf-about-block sections visible, stats 4-col grid, FAQ list with Q+A
- [ ] `/rules` visually: bf-rule cards with circled number + text, border-left accent
- [ ] No raw `color:` or `background:` hardcoded in JSX inline styles (use CSS classes)
- [ ] No smart quotes in TS/JSX source

## Designer notes

### Class reuse confirmation

All bf-* classes listed below are **already declared in `src/theme/tokens.css`** and must be imported, not redeclared:

| Class | Source | Usage |
|---|---|---|
| `.bf-helper` | tokens.css | Scope + footer helper boxes in Rules |
| `.bf-helper-tag` | tokens.css | `// 使命` `// 群规` etc. tags |
| `.bf-cta` | tokens.css | Join QQ button (replaces `.about-join-cta` pink pill) |
| `.bf-cta-2` | tokens.css | Secondary link variant |
| `.bf-container` | tokens.css | max-width inner wrapper |
| `.bf-pill` | tokens.css | inline tag chips |

Classes declared in `About.css` / `Rules.css` (page-scoped, not in tokens):

| Class | File | Notes |
|---|---|---|
| `.bf-page-hd` | Both | Page header strip — border-bottom, paper bg |
| `.bf-about-block` | About.css | White card block with 1px rule border |
| `.bf-about-stats` | About.css | 4-col → 2-col responsive grid |
| `.bf-about-stats .num` | About.css | Large display number (28px, accent color) |
| `.bf-about-stats .lbl` | About.css | Mono uppercase label |
| `.bf-faq` | About.css | Vertical list, 14px gap |
| `.bf-faq li` | About.css | Flex-col Q+A, 3px gap |
| `.bf-faq strong` | About.css | Question text (13.5px, ink) |
| `.bf-faq span` | About.css | Answer text (12.5px, ink-2, 1.7 line-height) |
| `.bf-rules` | Rules.css | Flex-col container, 14px gap |
| `.bf-rule` | Rules.css | Grid 60px + 1fr, paper bg, border-left 3px accent |
| `.bf-rule-n` | Rules.css | 36px display numeral, accent color |
| `.bf-rule-text` | Rules.css | Body text 13px, 1.8 line-height |

### About join button

Replace the existing `.about-join-cta` pink pill with `.bf-cta` from tokens. The pink (#f31864) is an older design; the bf-* system uses `var(--accent)` for CTAs. If the brand requirement is pink specifically, declare a `.about-join-cta` override in `About.css` that inherits `.bf-cta` styles but overrides background.

Decision: **keep `.about-join-cta` as a local override** (pink pill) for brand continuity. Existing tests reference the QQ join button behavior, not its color.

### Stats 4-col responsive behavior

```
/* Already defined in D1 tokens comment: 4-col → 2-col @ 700px */
.bf-about-stats { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 700px) { .bf-about-stats { grid-template-columns: repeat(2, 1fr); } }
```

### FAQ: `<details>` vs `<ul>` decision

The existing `About.jsx` uses `<details><summary>` accordion. The design reference uses a plain `<ul>` list with Q bold + A span. **Keep `<details>` accordion** to preserve existing test coverage (tests assert `details` elements exist). The `<ul>` pattern would require rewriting all existing About tests — out of scope.

Applied class change: wrap the `<div className="about-faq-list">` → `<ul className="bf-faq">` with `<li>` items keeping `<details>` inside, OR keep `about-faq-list` / `about-faq-item` CSS. Designer recommends: keep `<details>` DOM, apply `bf-faq`-adjacent styling in `About.css`. Do not rename DOM structure that existing tests depend on.

### Page header (`bf-page-hd`) structure

```jsx
<header className="bf-page-hd">
  <div className="bf-container">
    <div>
      <span className="ph-tag">// 关于</span>
      <h1>{/* ZH community name or fallback */}</h1>
    </div>
    <span className="ph-meta">{/* EN name or subtitle */}</span>
  </div>
</header>
```

The `ph-tag` and `ph-meta` classes are page-scoped (not in tokens). Declare in About.css / Rules.css.

### bf-rule circled numbers

Use the Unicode circled number array. Strip leading `①②…` glyph from raw `coc` paragraphs if present (detect `/^[①-⑳]\s*/` prefix), then display the extracted glyph in `.bf-rule-n`. If no leading glyph, generate from index. This preserves the existing content exactly while providing structured visual layout.

## Architect integration check

### Route verification

`src/App.jsx` lines 28–29 confirm:
```jsx
<Route path="/about" element={<About />} />
<Route path="/rules" element={<Rules />} />
```
Routes are unaffected. No changes to `App.jsx` required or permitted.

### LayoutShell wrapping

Both pages render inside `LayoutShell` via `App.jsx`. The `LayoutShell` wraps all public routes. Pages must NOT import or render `LayoutShell` themselves — the shell wraps from outside. Pages render as children of `bf-shell-main` div.

### Test harness

`src/test/utils.jsx` exports `renderWithProviders(ui, { route })` which wraps with `MemoryRouter` + `ThemeProvider`. All tests use this — no changes needed.

### API data flow

About page fetches: `fetchAbout()` + `fetchSite()` + `fetchSocial()` → adapted via `adaptAboutSections()`, `adaptSiteSettings()`, `adaptSocialList()`.

Rules page fetches: `fetchAbout()` → `adaptAboutSections().coc` string.

No new API endpoints or worker routes needed.

### Content text preservation

The `adaptAboutSections()` function returns:
- `mission: string` — rendered in Mission block
- `joinInstructions: string` — rendered in Join block  
- `coc: string` — multi-paragraph, split by `\n\n+` for Rules cards
- `faq: Array<{q, a}>` — rendered in FAQ accordion

All text passes through unchanged. JSX only wraps in bf-* class elements.

### Files to delete

None. D6 is a chrome-only rewrite of existing single-file pages. No component extractions, no file renames.

### i18n keys in use (no changes)

```
t('about.missionHeading')      // "Mission" / "使命"
t('about.joinHeading')         // "How to Join" / "如何加入"
t('about.faqHeading')          // "FAQ"
t('about.disclaimerHeading')   // "Disclaimer" / "免责声明"
t('about.disclaimerBody')      // disclaimer text
t('rules.title')               // "Community Rules" / "群规"
t('rules.subtitle')            // subtitle text
t('rules.footerNote')          // footer note text
t('empty.noFaq')               // empty FAQ message
t('empty.noCoc')               // empty rules message
t('btn.joinQQ')                // "加入 QQ 群"
```

### bf-page-hd — not in tokens.css

`bf-page-hd` and its child classes (`ph-tag`, `ph-meta`) are NOT in `tokens.css`. Developer must declare them in both `About.css` and `Rules.css`. Reference CSS from design snapshot:

```css
.bf-page-hd {
  padding: 36px 0 24px;
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
}
.bf-page-hd .bf-container {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.ph-tag {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  color: var(--ink-3);
  text-transform: uppercase;
  display: block;
  margin-bottom: 6px;
}
.bf-page-hd h1 {
  font-family: var(--display);
  font-weight: 600;
  font-size: 38px;
  margin: 0;
  letter-spacing: -0.005em;
  line-height: 1.1;
}
.ph-meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
}
```

### Worker touchpoints

None expected. If any worker import or `worker/` file change is needed, STOP and DM team-lead immediately.

### Iteration contract

Developer is cleared to proceed with TDD red→green on:
1. `Rules.test.jsx` (new file) — write failing tests first
2. `About.test.jsx` additions — add edge tests after existing ones
3. Implement `About.jsx` + `About.css`
4. Implement `Rules.jsx` + `Rules.css`
5. Verify `npx vitest run` + `npm run build` both green
6. Commit with `feat(design): D6 about + rules — claude design port`
7. Push + open PR `--base main --head feat/d6-about-rules`
