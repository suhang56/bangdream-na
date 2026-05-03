# Member import scripts

One-shot ETL to bulk-populate `src/data/members.json` from Discord + QQ + WeChat group rosters.

**Privacy decision (2026-05-02)**: only the **display name** (group nickname) is exported. No QQ numbers, Discord usernames/discriminators, account IDs, or avatars. Members consented to be listed by name only.

## What it does

```
Discord guild members  ──┐
QQ group members  ───────┼──► merge + dedupe ──► src/data/members.json
WeChat (manual JSON)  ───┘                            (P3 schema)
```

- Same nickname across platforms = one entry
- Discord role groups (e.g. "Roselia 推") auto-fill `oshiBand` when matched
- `role` defaults to `member` — promote in P4 admin
- `id` is a slug from the name; collisions get `-2`, `-3`...

## Setup (one-time per machine)

```powershell
# Add discord.js as a dev-only dep (NOT committed to package.json)
npm i --no-save discord.js
```

NapCat is assumed already running for QQ (you have it for QQ-Group-Bot).

## Run

### 1. Discord — pull names + role groups

```powershell
$env:DISCORD_BOT_TOKEN = "your-bot-token"
$env:DISCORD_GUILD_ID  = "your-guild-id"
node scripts/pull-discord-names.mjs
```

Bot setup: see [Discord bot setup](#discord-bot-setup) below.

Output: `scripts/.cache/discord-names.json`

### 2. QQ — pull nicknames via NapCat

```powershell
$env:NAPCAT_HTTP_URL = "http://localhost:3000"
$env:NAPCAT_TOKEN    = ""             # optional
$env:QQ_GROUP_ID     = "123456789"
node scripts/pull-qq-names.mjs
```

Output: `scripts/.cache/qq-names.json`

### 3. WeChat — manual

WeChat has no official API and is explicitly off-limits for bot scraping. Curate manually:

```powershell
notepad scripts/.cache/wechat-names.json
```

Schema: `[{ "nickname": "西瓜" }, ...]` — same as QQ output.

(You can also send a Formbricks form to your WeChat group asking members to self-report nickname only.)

### 4. Merge

```powershell
node scripts/merge-members.mjs
```

Reads any of the three cache files that exist, dedupes, writes `src/data/members.json` sorted by name.

### 5. Review + commit

```powershell
git diff src/data/members.json
git add src/data/members.json
git commit -m "chore(members): bulk import from Discord + QQ + WeChat rosters"
git push
```

Or open `https://bangdream.org/admin` after merge — adjust `role` and `oshiBand` per member via the GUI.

## Discord bot setup

If you don't have a Discord bot for the BD!NA server yet:

1. Open https://discord.com/developers/applications
2. Click **New Application** → name it `BD!NA Roster Bot` → Create
3. Sidebar → **Bot** → **Add Bot** → Yes, do it
4. Under **Privileged Gateway Intents**, enable **Server Members Intent** (required to list members)
5. **Reset Token** → copy the token → that's `DISCORD_BOT_TOKEN`
6. Sidebar → **OAuth2** → **URL Generator**:
   - Scopes: `bot`
   - Bot permissions: `View Channels`, `Read Message History` (minimal — reading members only)
   - Copy the generated URL → open in browser → select the BD!NA server → Authorize
7. To get `DISCORD_GUILD_ID`: in Discord client, Settings → Advanced → enable Developer Mode. Then right-click your server icon → **Copy Server ID**.

The bot only needs to live in your server long enough to run the script. After the import, you can kick it.

## Files written

```
scripts/.cache/             ← gitignored, you can delete after import
├── discord-names.json
├── qq-names.json
└── wechat-names.json

src/data/members.json       ← committed, the live roster
```

## Re-run later

Re-running pull scripts overwrites the cache files; re-running merge overwrites `members.json`. **Be careful** — if you've manually edited `members.json` via the admin GUI between imports, those edits will be lost. The expected workflow is one-shot bulk import on day 1, then admin GUI handles all changes after.
