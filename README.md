# bangdream-na

[![CI](https://github.com/suhang56/bangdream-na/actions/workflows/test.yml/badge.svg)](https://github.com/suhang56/bangdream-na/actions/workflows/test.yml)
[![Worker deploy](https://github.com/suhang56/bangdream-na/actions/workflows/deploy-worker.yml/badge.svg)](https://github.com/suhang56/bangdream-na/actions/workflows/deploy-worker.yml)

BanG Dream! North America 中文社区站点 — https://bangdream.org

## Architecture

| Layer | Service | Domain |
|---|---|---|
| Frontend (React 19 + Vite SPA) | Cloudflare Pages | `bangdream.org` |
| Backend API (Hono on Workers) | Cloudflare Workers | `api.bangdream.org` |
| Database (SQLite at edge) | Cloudflare D1 | — |
| Image storage | Cloudflare R2 | `cdn.bangdream.org` |
| Auth | GitHub OAuth + JWT cookie | — |

All dynamic content (news, events, members, categories, posts, social links, about sections, site settings) lives in D1 and is edited via the `/admin` UI — no PR cycle for content updates.

## Repo layout

```
src/                React 19 + Vite SPA (frontend)
  pages/            route-level components
  components/       shared UI
  lib/              api client, cache, admin schemas
worker/             Cloudflare Worker (Hono backend)
  src/              routes, auth, db schema (drizzle)
  migrations/       D1 SQL migrations
  tests/            vitest-pool-workers tests
public/             static assets (chrome only)
.github/workflows/  CI: test, deploy-worker, preview-worker, cleanup
```

## Quick start

```bash
git clone https://github.com/suhang56/bangdream-na
cd bangdream-na

# Frontend (uses production API by default)
npm install
echo "VITE_API_BASE=https://api.bangdream.org" > .env.local
npm run dev          # → http://localhost:5173

# Worker (only if you're changing worker/ code)
cd worker
npm install --legacy-peer-deps
npx wrangler dev --local   # → http://localhost:8787, local D1
```

If you're only changing frontend (`src/`), the first block is enough — point at the live API and iterate against real data.

## Commands

```bash
# Frontend
npm run dev              # vite dev server
npm run build            # production build → dist/
npm run preview          # preview built dist locally
npm run lint             # eslint
npm test -- --run        # vitest single pass
npm run test:watch       # vitest watch
npm run test:coverage    # coverage report (gate: 80%)

# Worker (run from worker/)
npx wrangler dev --local       # local dev with local D1
npx wrangler deploy            # production deploy (CI does this on main push)
npx vitest run                 # worker tests
npx tsc --noEmit               # typecheck
```

## Deployment

**You don't deploy manually.** CI does it:

- Push to `main` → `deploy-worker.yml` deploys Worker to `api.bangdream.org`
- Push to `main` → Cloudflare Pages auto-deploys frontend to `bangdream.org`
- Open PR with `worker/**` changes → `preview-worker.yml` deploys preview Worker, comments URL on the PR
- Close the PR → preview Worker auto-deleted

D1 schema migrations are NEVER auto-applied. After a PR with a new `worker/migrations/*.sql` file merges, the repo owner runs `npm run d1:migrate:prod` (from `worker/`) once.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR: fork → branch → push → PR. You never need to install wrangler or touch the Cloudflare dashboard.

## License

Private fan project. Not affiliated with Bushiroad / Craft Egg / 武士道.
