# Contributing to bangdream-na

欢迎贡献！这份文档面向想添加功能的朋友。**你不需要安装 Cloudflare、wrangler，也不需要碰任何生产配置** — 整个流程就是 fork → branch → push → PR，剩下的自动化会搞定。

Welcome! This guide is written for friends adding features. **You never need to install wrangler, touch the Cloudflare dashboard, or run any migrations** — the full flow is fork → branch → push → PR, and automation handles the rest.

---

## Quick start

```bash
git clone https://github.com/suhang56/bangdream-na
cd bangdream-na

# Frontend (runs against production API by default)
npm install
echo "VITE_API_BASE=https://api.bangdream.org" > .env.local
npm run dev       # → http://localhost:5173

# Worker backend — only needed if you're changing worker/ code
cd worker
npm install --legacy-peer-deps
npx wrangler dev --local   # → http://localhost:8787, uses local D1 (no prod data)
```

If you're only changing frontend (`src/`), you only need the first block. Point `.env.local` at the live API and iterate against real data without any backend setup.

---

## Repo layout

```
src/                    React 19 + Vite SPA frontend
  components/           UI components (MobileXxx / DesktopXxx pairs)
  pages/                Page shells — fetch from src/lib/api.js
  lib/api.js            Worker API wrappers (frontend side)
  data/i18n.json        UI chrome strings (zh + en keys)

worker/                 Cloudflare Worker backend (Hono + D1 + R2)
  src/routes/           Public + admin route handlers
  src/db/schema.ts      Drizzle ORM schema
  migrations/           D1 schema migrations (0001–0004) — owner-managed

public/                 Static assets (_redirects, _headers, favicon)
cloudflare/             Infra setup notes (read-only reference)
scripts/migrate/        One-time backfill scripts (historical, don't run)
```

---

## How to add a feature

This is the entire flow — no Cloudflare access needed at any step:

1. **Fork** the repo (or branch directly if you're a collaborator)
2. **Create a branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or for a fix:
   git checkout -b fix/what-you-fixed
   ```
3. **Make your changes** (see sections below for frontend vs worker)
4. **Run tests locally** before pushing:
   ```bash
   # Always run:
   npm test -- --run

   # Also run if you touched worker/:
   cd worker && npx vitest run
   ```
5. **Commit** with a conventional message:
   ```bash
   git commit -m "feat: add concert date display to events page"
   git commit -m "fix: member card overflow on mobile"
   ```
6. **Push** and **open a PR**:
   ```bash
   git push -u origin feat/your-feature-name
   gh pr create --base main
   ```
7. **CI runs automatically** — you'll see `test / frontend` and `test / worker` checks on the PR. Fix any failures and push again.
8. If you changed `worker/` code, a bot will comment a **preview Worker URL** on your PR (non-fork PRs only). Use it to smoke-test GET endpoints — read-only only (see warning below).
9. **Owner reviews and merges**. You're done.

You do **not** need to deploy anything. You do **not** need a Cloudflare account. CI deploys the worker to production automatically when main is updated.

---

## Adding a frontend feature

Most features live in `src/`. The frontend reads all dynamic data from `src/lib/api.js`, which calls the Worker API at `api.bangdream.org`.

- Add new components under `src/components/`
- Add new pages under `src/pages/` and wire up routes in `src/App.jsx`
- Every visible UI string needs entries in **both** `zh` and `en` in `public/i18n.json`
- Follow the Mobile/Desktop component pattern already in use (see `src/components/News*` for examples)
- Test: `npm test -- --run` — must pass before PR

## Adding a worker (backend) feature

Worker changes live in `worker/src/`. The backend uses Hono + Drizzle ORM against Cloudflare D1.

- Add/modify route handlers in `worker/src/routes/`
- Update `worker/src/db/schema.ts` if you need new columns or tables
- **If you need a schema change**: write a migration file in `worker/migrations/` (follow the `0001-...sql` naming pattern). **Do not run it yourself** — the owner applies migrations to production manually after your PR merges. CI will tell you if the TypeScript doesn't compile.
- Test: `cd worker && npx vitest run` — must pass before PR

---

## Local dev environment

### Frontend env

Create `.env.local` at repo root:
```
VITE_API_BASE=https://api.bangdream.org
```
This points your local frontend at the live API. Or set it to `http://localhost:8787` if you're running `wrangler dev --local` locally.

### Worker env

If you're running the worker locally, create `worker/.dev.vars` from the template:
```bash
cp worker/.dev.vars.example worker/.dev.vars
```
Then ask the owner for dev secret values. The `.dev.vars` file is gitignored — never commit it.

---

## Testing

| What to run | When |
|---|---|
| `npm test -- --run` | Always — before every push |
| `cd worker && npx vitest run` | When you changed anything in `worker/` |

Both are required to pass in CI. Fix failures before pushing — it's faster than waiting for CI to tell you.

---

## PR conventions

- **Conventional commits** (mandatory): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **No `Co-Authored-By:` trailers** — project policy, please strip these if your tooling adds them
- **Bilingual UI strings** — every new visible string needs `zh` + `en` in `public/i18n.json`
- **Tests for new features** — new components should have corresponding test files in `src/`

---

## What NOT to do

- **Don't run `wrangler deploy`** — CI handles production deploys automatically on main merge
- **Don't apply D1 migrations to production** — the owner does this manually; just include the `.sql` file in your PR
- **Don't push to `main` directly** — always via PR so CI can catch issues
- **Don't commit `.dev.vars`** — it's gitignored but double-check anyway; it contains secrets
- **Don't commit `.claude/`** — gitignored; internal project tooling
- **Don't touch `worker/wrangler.toml`** unless you have an explicit reason — it's owner-protected via CODEOWNERS
- **Don't run wrangler commands against production** — you shouldn't have a token for this, and CI owns that flow

---

## Architecture notes

R-phase (current) migrated all content to **D1 + R2**. Admin operations go through the Worker API + GitHub OAuth at `/admin`. There is no PR-based content-update flow — content is edited live via the admin UI.

For full architecture details, see [CLAUDE.md](CLAUDE.md).

---

## Getting help

Open an issue on GitHub, or ping the owner on QQ (see site footer for contact).
