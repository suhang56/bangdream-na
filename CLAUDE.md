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
