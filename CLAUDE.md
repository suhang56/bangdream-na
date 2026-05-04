# bangdream-na — Project Rules

## Architecture (R-phase, current)

Worker @ `api.bangdream.org` backed by D1 (SQLite) + R2 (object storage); admin UI via Worker API + GitHub OAuth; images served from `cdn.bangdream.org` (R2 custom domain). No PR cycle for admin operations — all content mutations go through the Worker API.

- **D1**: news, events, members, categories, featured_posts, social_links, about_sections, site settings
- **R2**: all images under `news/`, `events/`, `posts/`, `members/` prefixes
- **Frontend**: React 19 + Vite, reads all dynamic data via `src/lib/api.js` → Worker API
- **Admin**: `src/components/Admin*` + `src/lib/adminSchemas.js` (schema registry, stays in git build)
- **Static**: only `src/data/i18n.json` remains in git (UI chrome strings)

## Agent Pipeline

5-agent pipeline (Planner→Designer→Architect→Developer→Reviewer) via TeamCreate. NEVER dispatch developer directly without team context.

## Git Rules

- Add `.claude/` to `.gitignore` — never commit it
- No `Co-Authored-By: Claude` in commits
- Push to GitHub after every commit
- Verify worktree branches merged before branch cleanup
- No `content-updates` rolling branch — R-phase removed the PR-based admin flow

## Content Updates

Content is managed via the Admin UI at `/admin` (Worker API + D1). There is no `content-updates` branch or PR-based admin flow. Do not create one.

## CI/CD (D-phase)

- `.github/workflows/test.yml` runs on every PR + main push: frontend lint+test+build, worker tsc+vitest. Both jobs must pass.
- `.github/workflows/deploy-worker.yml` runs on main push: auto-deploys worker to `api.bangdream.org`. Requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` GitHub secrets.
- `.github/workflows/preview-worker.yml` runs on PR (worker/** changes): deploys preview Worker, comments URL on PR. Skipped for forks.
- `.github/workflows/preview-worker-cleanup.yml` deletes the preview Worker when the PR closes.
- D1 migrations are NEVER auto-applied — owner runs `wrangler d1 migrations apply bangdream-na-db --remote` manually after PR merge when schema changes are included.
- `CODEOWNERS` requires owner review for infra files (`worker/migrations/`, `worker/wrangler.toml`, `public/_redirects`, `public/_headers`, `.github/`, `CLAUDE.md`).
