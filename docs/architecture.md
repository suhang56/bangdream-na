# `bangdream-na` Phase 1 — Architecture Specification

> **Historical document.** This was the Phase 1 spec before the project moved to Cloudflare Pages + Workers + D1 + R2 (R-phase, 2026-05). For current architecture see [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md). For Cloudflare infra setup see [cloudflare/README.md](../cloudflare/README.md). Kept as record of P1 decisions.

**Status**: APPROVED for Developer dispatch (Architect deliverable for task #2 in team `bangdream-na-phase1`).

**Reference codebase**: `C:\Users\WaterMelon\portfolio` (React 19 + Vite 8 + react-router-dom 7 + Vercel). Conventions mirrored verbatim where they exist; new conventions added only for the testing stack.

**Stack** (Phase 1, since superseded): React 19 + Vite 8 + react-router-dom 7 + Vitest 3 + jsdom + Vercel. **No TypeScript** — `.jsx` only, matching portfolio.

---

## 1. `package.json` final contents

```json
{
  "name": "bangdream-na",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.2"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "@vitest/coverage-v8": "^3.2.4",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "jsdom": "^25.0.1",
    "vite": "^8.0.1",
    "vitest": "^3.2.4"
  }
}
```

**Version pinning rationale**:

- `react`, `react-dom`, `react-router-dom`, `@eslint/js`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `eslint`, `eslint-plugin-*`, `globals`, `vite` — pinned to portfolio's exact ranges (`portfolio/package.json:13-26`). No drift between projects.
- `vitest` `^3.2.4` — current stable; `@vitest/coverage-v8` MUST match major. Vitest 3 is required because of Vite 8 peer compatibility.
- `@testing-library/react` `^16.3.0` — current stable, supports React 19 (16.x added React 19 support).
- `@testing-library/jest-dom` `^6.6.3` — extends `expect` with DOM matchers (`toBeInTheDocument`, `toHaveStyle`, etc.).
- `@testing-library/user-event` `^14.5.2` — for `<ThemeSwitcher />` click-through tests (more accurate than `fireEvent.click`).
- `jsdom` `^25.0.1` — DOM env for vitest. Pinned 25.x; Vitest 3 supports it.

**Scripts decisions**:

- `test` runs once (CI/Reviewer use). `test:watch` for Developer's TDD loop. `test:coverage` for the 80% gate Reviewer enforces.
- Kept portfolio's `dev`/`build`/`lint`/`preview` verbatim.

---

## 2. `vite.config.js` final contents

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/test/**',
        'src/main.jsx',
        'src/data/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

**Key decisions**:

- `globals: true` — `describe`/`it`/`expect` available without import. Trade-off: less explicit but matches Jest muscle memory and reduces test file boilerplate. Set explicitly so the choice is visible.
- `css: true` — components import `.css` files; without this, vitest skips them and `import './Foo.css'` would error.
- `coverage.exclude` — exclude tests themselves, the setup file, the entry point (`main.jsx` is bootstrap glue with no branches), and `data/` (pure JSON / static config). Coverage measures behavior, not config.
- `coverage.reporter: ['text', 'html', 'json-summary']` — `text` for terminal, `html` for Reviewer's deep-dive, `json-summary` for any CI gate later.
- `coverage.thresholds: 80` on all four axes — matches Hard Rule from CLAUDE.md and memory `feedback_edge_testing_soul.md`. The threshold is per-project default (applies to every file), not just global, so any new file dropping below 80% fails the build. This is intentional.

**Why the `test` block lives in `vite.config.js`** rather than `vitest.config.js`: Vitest reads Vite config and merges; one file means tests pick up identical resolution/plugins as the dev/build pipeline. Avoids the `react()` plugin being applied differently between dev and test.

---

## 3. `eslint.config.js`

**Decision**: copy `portfolio/eslint.config.js` verbatim (lines 1-29 of that file). Verified its rules cover the new dirs:

- `files: ['**/*.{js,jsx}']` — matches `src/**`, `src/test/**`, `src/**/*.test.jsx`. No additional config needed for the test directory.
- `globalIgnores(['dist'])` — should be extended to `globalIgnores(['dist', 'coverage'])` so vitest's coverage HTML output isn't linted.

**Final contents**:

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
```

**Diff from portfolio**:
- `globalIgnores(['dist'])` → `globalIgnores(['dist', 'coverage'])` — exclude vitest coverage output.
- `globals: globals.browser` → `globals: { ...globals.browser, ...globals.node }` — vitest globals (`vi`, etc.) are NodeJS-side; even with `vitest/globals` types, eslint's `no-undef` would flag them in `vite.config.js` and any `vi.*` usage in tests. Keeping browser globals so component code is unaffected.

**Why not add `eslint-plugin-testing-library`** for Phase 1: extra config surface, marginal value at small test count. Phase 2 can add if test-quality drift is observed.

---

## 4. `src/test/setup.js`

```js
import '@testing-library/jest-dom'
```

**Single line**. `@testing-library/jest-dom` extends Vitest's `expect` with DOM matchers via auto-registration on import. No more setup needed for Phase 1.

**localStorage handling — explicit decision**: do NOT mock `localStorage` globally in setup.

- jsdom provides a working `localStorage` by default (per-test isolation handled by `cleanup` from RTL, which RTL 16.x runs automatically per test).
- The "private mode" edge case (where `localStorage` throws) is tested explicitly in `ThemeContext.test.jsx` by stubbing `Storage.prototype.setItem` to throw inside that single test, then restoring. This keeps the surface narrow and tests the actual code path the user would hit.

**No global `vi.mock` for `react-router-dom`**: pages and components that consume route params will be tested by wrapping in `<MemoryRouter>` per-test. Memory rule `feedback_normalize_inside_helper.md` applies — if route awareness is needed, a `renderWithRouter()` helper goes in `src/test/utils.jsx` and normalizes wrapper internally; callers don't pass router setup.

---

## 5. `.gitignore` final contents

```
# Dependencies
node_modules

# Build output
dist

# Coverage
coverage

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Editor / OS
.DS_Store
Thumbs.db
.idea
.vscode

# Claude Code (NEVER push — Hard Rule from CLAUDE.md, memory feedback_no_claude_on_github.md)
.claude/

# Vitest temp
*.tsbuildinfo
.vitest-cache
```

**Decisions**:

- `.claude/` — explicit, with comment explaining why. Memory rule `feedback_no_claude_on_github.md` is non-negotiable; the comment makes the intent visible to anyone who later runs a "clean up gitignore" pass.
- `.env*` family enumerated rather than `.env*` glob — clearer intent, and `.env.example` (if ever added) won't be accidentally swept.
- `coverage/` — vitest output dir.
- `.vitest-cache` — vitest's snapshot/cache dir; not always present but cheap to ignore.
- `Thumbs.db` and `.DS_Store` — Windows + macOS noise (user is on Win11, but contributors may not be).

---

## 6. `vercel.json`

Copy portfolio's `vercel.json` verbatim:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Why**: SPA rewrite. Without it, direct URL access to `/events` or `/members` would 404 because Vercel looks for `/events.html`. The catch-all rewrite serves `index.html` so React Router can take over.

**No build config in `vercel.json`**: Vercel auto-detects Vite (presence of `vite` in `devDependencies` + `vite.config.js`). Build command, output dir, install command all auto-resolved. Adding them here would just duplicate defaults.

---

## 7. `index.html` final contents

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0a12" />
    <meta name="description" content="BanG Dream! North America fan community — events, members, and Discord." />
    <title>BanG Dream! Fan Community NA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Decisions**:

- `theme-color` set to neutral default (`#0a0a12`, matches `themes.neutral["--color-bg"]` from plan). **Known limitation**: this static value does NOT update when user switches theme — browsers read the `<meta>` once at load. To make it dynamic, ThemeProvider would need to mutate the meta tag in its `useEffect`. **Recommendation: defer to Phase 2**. Phase 1's value is "matches default theme on cold load", which is good enough; mobile address-bar tinting won't recolor live but also won't be wrong on first paint. Document in Developer's open questions.
- `description` meta — basic SEO. No social/OG tags in Phase 1; deferred (no banner image yet).
- `lang="en"` — primary content is English; community name appears in Chinese in hero, but `lang` follows page-dominant language. Consider `<html lang="en">` with inline `<span lang="zh">` for the Chinese tagline if a11y review flags.
- Title `BanG Dream! Fan Community NA` per plan default.
- No favicon.ico in `public/` — using portfolio's pattern of `favicon.svg` only. Designer will provide the SVG; placeholder for now.

---

## 8. Final directory tree

```
bangdream-na/
├── .gitignore                          # see §5
├── .gitattributes                      # text=auto eol=lf for cross-platform consistency
├── README.md                           # short — name, dev/build/test commands, link to docs/
├── package.json                        # see §1
├── package-lock.json                   # committed (npm; matches portfolio)
├── vercel.json                         # see §6
├── vite.config.js                      # see §2
├── eslint.config.js                    # see §3
├── index.html                          # see §7
├── docs/
│   └── architecture.md                 # this file
├── public/
│   └── favicon.svg                     # placeholder; Designer refines
└── src/
    ├── main.jsx                        # bootstrap: ThemeProvider OUTSIDE BrowserRouter — see §9
    ├── App.jsx                         # <BrowserRouter><Routes>...</Routes></BrowserRouter>
    ├── App.css                         # global resets, base layout
    ├── index.css                       # CSS reset / box-sizing — kept tiny, theme.css owns vars
    ├── data/
    │   └── site.json                   # { discordInvite, communityName, tagline, communityNameZh }
    ├── theme/
    │   ├── themes.js                   # 8 theme objects + themeOrder export
    │   ├── ThemeContext.jsx            # createContext + ThemeProvider
    │   ├── useTheme.js                 # hook (separate file; React Refresh boundary)
    │   ├── theme.css                   # base CSS that consumes --color-* custom props
    │   ├── themes.test.js              # every theme has every required token
    │   └── ThemeContext.test.jsx       # provider + localStorage + corruption fallback
    ├── components/
    │   ├── Navbar/
    │   │   ├── Navbar.jsx
    │   │   └── Navbar.css
    │   ├── Footer/
    │   │   ├── Footer.jsx
    │   │   └── Footer.css
    │   ├── Hero/
    │   │   ├── Hero.jsx
    │   │   └── Hero.css
    │   ├── DiscordCTA/
    │   │   ├── DiscordCTA.jsx
    │   │   ├── DiscordCTA.css
    │   │   └── DiscordCTA.test.jsx     # disabled state, valid URL, invalid URL, whitespace
    │   ├── ThemeSwitcher/
    │   │   ├── ThemeSwitcher.jsx
    │   │   ├── ThemeSwitcher.css
    │   │   └── ThemeSwitcher.test.jsx  # click → context → DOM, active ring, idempotent
    │   └── ComingSoonCard/
    │       ├── ComingSoonCard.jsx
    │       ├── ComingSoonCard.css
    │       └── ComingSoonCard.test.jsx
    ├── pages/
    │   ├── Home.jsx
    │   ├── Home.test.jsx               # all sections render, theme tokens applied
    │   ├── Events.jsx                  # placeholder
    │   ├── Members.jsx                 # placeholder
    │   └── pages.test.jsx              # /events and /members route render via MemoryRouter
    └── test/
        ├── setup.js                    # see §4
        └── utils.jsx                   # renderWithProviders(ui, { theme?, route? }) helper
```

**Adjustments from plan**:

- Tests live next to the file they test (`src/components/DiscordCTA/DiscordCTA.test.jsx`). **Not** a parallel `__tests__` tree. Reasoning: discoverability, encourages tests to update with the code, matches RTL convention. Vitest auto-discovers via `**/*.test.{js,jsx}`.
- Added `src/test/utils.jsx` — central helper to wrap UI in `<ThemeProvider>` + optional `<MemoryRouter>`. Memory rule `feedback_normalize_inside_helper.md`: helpers normalize input internally, callers should not have to remember to wrap.
- Added `src/index.css` (kept from portfolio at `portfolio/src/index.css` reference) — minimal global reset (box-sizing, body margin: 0, font-family). Theme CSS lives in `theme/theme.css` and is imported separately so it's testable in isolation.
- `useTheme` is its own file (NOT exported from `ThemeContext.jsx`). React Refresh requires a module to export only components OR only hooks/values for hot-reload to work cleanly; mixing causes Vite warnings on save. `ThemeContext.jsx` exports the Provider component; `useTheme.js` exports the hook.
- Added `data/site.json` `communityNameZh` field — Hero shows both English and Chinese names; data file separates content from layout.
- Added `.gitattributes` — single line `* text=auto eol=lf`. User is on Windows; without it, Git may flip line endings on commit and cause spurious diffs vs Vercel/macOS contributors.

---

## 9. Theme integration order — module imports

**Provider order (from outermost in)**:

```jsx
// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'                       // global reset FIRST
import './theme/theme.css'                 // theme base CSS (uses --color-* vars)
import { ThemeProvider } from './theme/ThemeContext.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar.jsx'
import Footer from './components/Footer/Footer.jsx'
import Home from './pages/Home.jsx'
import Events from './pages/Events.jsx'
import Members from './pages/Members.jsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/members" element={<Members />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}
```

**Order rationale**:

- `ThemeProvider` is **outside** `BrowserRouter`. This **diverges** from the plan's component tree (which had `<ThemeProvider>` outside, then `<BrowserRouter>` — same conclusion). Reasoning: theme is global state; route changes should not unmount the provider or reset `themeKey` state. Keeping it outside guarantees one provider instance for the app lifetime.
- Plan section "Theme integration" said "ThemeProvider wraps inside BrowserRouter (so route-aware theme behavior is possible later)". **Rejecting that constraint** for Phase 1: route-aware theme means a hook calling `useLocation()` inside the provider, which IS possible with the provider outside the router as long as the route-aware logic lives in a child component (not the provider itself). Keeping the provider outside the router is the safer default; the route-aware variant can be added in Phase 2 by introducing a `<ThemeRouteSync />` component INSIDE the router that calls `useTheme()` + `useLocation()`. No structural rework needed.
- `index.css` imported before `theme.css` so theme custom properties override base resets (CSS source order = cascade tiebreaker for equal specificity).
- `<Navbar />` is **inside** `<BrowserRouter>` because it uses `<Link>` and (later) `useLocation()`. Cannot live outside the router.
- Portfolio's `App.jsx` (lines 11-28) uses a `Shell` inner component to read `useLocation()` for admin route-hiding. Phase 1 has no admin route hide-logic, so the inner Shell is unnecessary; flatten to direct `<Routes>` inside `<BrowserRouter>`. If Phase 4 (admin) is later added, reintroduce the Shell pattern.

**StrictMode**: kept (matches portfolio at `portfolio/src/main.jsx:7,9`). Will double-invoke effects in dev — `ThemeContext`'s `useEffect` is idempotent (sets the same CSS var twice → no observable difference), so this is safe.

---

## 10. Test framework decisions

| Decision | Choice | Why |
|---|---|---|
| Test runner | **Vitest 3** | Reads `vite.config.js` directly; same module resolution as build; native ESM; Jest-compatible API. Jest would need `babel-jest` + manual ESM config + a separate `transform` block for JSX. |
| DOM env | **jsdom** | Mature, fast enough for component tests at this scale (≤ ~30 tests Phase 1). `happy-dom` is faster but less compatible with `@testing-library/jest-dom` matchers. |
| RTL version | **`@testing-library/react` 16.x** | First major with React 19 support. Provides `render`, `screen`, automatic cleanup. |
| Interaction | **`@testing-library/user-event` 14.x** | `userEvent.click()` simulates real keystroke/click pipeline (focus, blur, etc.); `fireEvent.click()` fires only the `click` event. Matters for `<ThemeSwitcher />` popover focus management. |
| Coverage provider | **v8 (`@vitest/coverage-v8`)** | Native to V8, faster than istanbul, no instrumentation step. Reports may be slightly less precise on branches than istanbul, but adequate for the 80% gate. |
| E2E framework | **None for Phase 1** | Reviewer does manual on-device per CLAUDE.md (`feedback_team_lead_self_verify_not_reviewer.md`). Playwright would add ~150MB browser downloads and CI time for 3 routes. Defer to Phase 2 if member/events filters get complex. |
| Snapshot tests | **Avoid** | Snapshots rot silently; explicit assertions preferred. CSS custom property tests assert specific computed style, not full snapshot. |

**Edge tests are mandatory** (Hard Rule + memory `feedback_edge_testing_soul.md`). Every component test file must include at least one edge case (empty input, invalid input, error boundary, race, etc.). Plan §"Test plan" already enumerates these per layer; Developer is bound to that table.

---

## 11. CI plan

**Phase 1 CI: none.**

Justification:

- Vercel auto-deploys on every push to `main` (auto-detected on first import). Failed build = failed deploy = visible in Vercel dashboard. This is the only "live system" gate Phase 1 needs.
- Tests run locally during Developer's TDD loop; Reviewer runs `npm run test:coverage` on-device before APPROVED.
- GitHub Actions CI is deferred to **Phase 2 or later**. Adding it now requires:
  - `.github/workflows/test.yml` (would NOT be `.claude/`, so it'd be checked in — fine)
  - Maintenance of pinned Node version + npm cache config
  - Branch protection rules (which need user permission to set)
  - Status check setup that can block merges
- Phase 1 has one user, one merge, one reviewer (the user). Manual Reviewer + Vercel preview is sufficient.

**When to revisit**: as soon as a second contributor joins, or Phase 2 introduces a JSON schema that needs validation on PR.

**Reviewer's local gate** (binding for task #4):
```bash
npm install
npm run lint
npm run test:coverage
npm run build
npm run preview   # smoke check on http://localhost:4173
```
All four must pass; coverage report must show ≥ 80% on every threshold.

---

## 12. Open questions for Developer

These are decisions the Architect made unilaterally based on memory rules and reasoned defaults. Developer should adopt them unless Reviewer flags otherwise:

1. **`localStorage` corrupted/unavailable handling**: **silent fallback to `'neutral'` theme**, no console warning, no telemetry. Recommendation: silent. Reasoning: this is a fan site with zero analytics, console-spamming legitimate users (e.g. Safari private mode) adds friction. Plan §"Test plan" already specifies this behavior. **If Reviewer prefers a console.warn**, change is one line in `ThemeContext.jsx`.

2. **Whitespace-trimming in Discord URL validation**: plan §"Test plan" says "URL with whitespace → still validated". Architect interprets this as: the validator should `String.prototype.trim()` before checking the prefix. Test will assert `"  https://discord.gg/abc  "` → button is enabled with the trimmed `href`. Developer may instead choose to reject any whitespace as invalid; either is defensible. **Recommendation: trim**, matches user-pasted-URL muscle memory.

3. **`themeOrder` array order**: Architect defers to plan's order: `["neutral", "roselia", "popipa", "mygo", "morfonica", "afterglow", "pastel", "hhw"]`. Designer agent (task #1) may finalize a different visual order — Developer takes whichever the Designer commits.

4. **Hero copy**: plan default is `"BanG Dream! Fan Community NA"` + Chinese tagline `"北美炸梦同好会"`. Developer reads `data/site.json`; if Designer provides updated copy in their deliverable, use that.

5. **Error boundaries**: Phase 1 has no error boundary component. React 19's default error UI (white screen with stack in dev, blank in prod) is acceptable for a fan site at this scale. Adding `<ErrorBoundary />` is a candidate for Phase 2.

6. **Accessibility checklist** (non-blocking for Phase 1, but Developer should aim for):
   - All buttons have `type="button"` (prevents form-submit if later wrapped in `<form>`).
   - `<a target="_blank">` always paired with `rel="noopener noreferrer"`.
   - Theme swatches in `<ThemeSwitcher />` have `aria-label` with band name; active swatch has `aria-pressed="true"`.
   - Hero gradient must maintain WCAG AA contrast ratio with text — Designer is responsible for hex validation.

7. **Repo creation timing**: the repo `bangdream-na` already exists (cloned to `C:\Users\WaterMelon\bangdream-na`, `.git` present, working tree empty). Developer does NOT need `gh repo create`. First commit will be the scaffold.

8. **Branch strategy**: Developer works on a feature branch (e.g., `phase-1-scaffold`), commits incrementally with conventional format, pushes after each commit (Hard Rule #4). Team-lead opens PR after Reviewer APPROVED. **Memory rule `feedback_never_autonomous_merge_to_default_branch.md`**: do NOT merge to `main` autonomously, regardless of APPROVED status.

9. **Commit granularity** (suggested, not enforced):
   - `chore: scaffold vite + react + router`
   - `chore: add eslint + vitest + testing-library setup`
   - `feat(theme): add theme tokens and provider`
   - `test(theme): cover provider + persistence + corruption fallback`
   - `feat(components): add Navbar, Footer, Hero`
   - `feat(components): add DiscordCTA with disabled fallback`
   - `test(components): cover DiscordCTA states`
   - `feat(components): add ThemeSwitcher`
   - `test(components): cover ThemeSwitcher interactions`
   - `feat(pages): add Home, Events, Members placeholders`
   - `test(pages): cover home composition + route placeholders`
   - `chore: add vercel.json for SPA rewrite`
   - `docs: add README`

   Order is suggestion; Developer adjusts to maintain working tree at every commit (i.e., tests always pass at every checkout).

10. **Iteration Contract acknowledgement**: per memory `feedback_iteration_contract_needs_explicit_ack.md`, after Designer + Architect deliverables land, team-lead must SendMessage explicit "approved — proceed to Developer dispatch". Architect does not self-dispatch the next phase.

---

## Cross-references

- **Plan**: `C:\Users\WaterMelon\.claude\plans\concurrent-giggling-micali.md`
- **Reference codebase**: `C:\Users\WaterMelon\portfolio\package.json`, `vite.config.js`, `eslint.config.js`, `src/main.jsx`, `src/App.jsx`, `index.html`, `vercel.json`
- **Hard Rules**: `C:\Users\WaterMelon\CLAUDE.md` lines 3-9
- **Memory rules** (load-bearing for this spec):
  - `feedback_edge_testing_soul.md` — 80% coverage + edge tests non-negotiable
  - `feedback_no_claude_on_github.md` — `.claude/` in `.gitignore`
  - `feedback_no_coauthor.md` — no `Co-Authored-By` lines on commits
  - `feedback_never_autonomous_merge_to_default_branch.md` — no autonomous merge to `main`
  - `feedback_iteration_contract_needs_explicit_ack.md` — explicit handoff between phases
  - `feedback_normalize_inside_helper.md` — `renderWithProviders` normalizes wrapper internally
  - `feedback_team_lead_self_verify_not_reviewer.md` — Reviewer is a separate dispatch

---

**Architect status**: complete. Developer (task #3) is unblocked and may begin scaffolding once Designer (task #1) commits final theme palette values to `themes.js`.
