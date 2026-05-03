// Pull display names + role groups from a Discord server.
// Output: scripts/.cache/discord-names.json
//
// Requirements:
//   - npm i -D discord.js (run once; not added to package.json since this is dev-only)
//   - Env vars: DISCORD_BOT_TOKEN (Bot scope), DISCORD_GUILD_ID
//   - Bot must be in the guild with "Server Members Intent" enabled in
//     Discord Developer Portal -> your app -> Bot -> Privileged Gateway Intents.
//
// Usage:
//   $env:DISCORD_BOT_TOKEN="..."  # PowerShell
//   $env:DISCORD_GUILD_ID="..."
//   node scripts/pull-discord-names.mjs
//
// Notes:
//   - We DO NOT export user account IDs, usernames, discriminators, or avatars.
//     The user opted to publish only the display name (nickname) shown in group.
//   - Role groups (e.g. "Roselia 推", "MyGO 推") are exported alongside name to
//     help merge-members.mjs auto-fill `oshiBand` when a band-marker role is found.

import fs from 'node:fs/promises'
import path from 'node:path'

const TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.DISCORD_GUILD_ID

if (!TOKEN || !GUILD_ID) {
  console.error(
    'Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID env var. Set them and retry.',
  )
  process.exit(1)
}

let Client, GatewayIntentBits
try {
  ;({ Client, GatewayIntentBits } = await import('discord.js'))
} catch {
  console.error(
    'discord.js not installed. Run `npm i -D discord.js` and retry.',
  )
  process.exit(1)
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID)
    await guild.members.fetch()
    const out = guild.members.cache
      .filter((m) => !m.user.bot)
      .map((m) => ({
        nickname: m.nickname || m.user.globalName || m.user.username,
        roleGroups: m.roles.cache
          .filter((r) => r.name !== '@everyone')
          .map((r) => r.name),
      }))
      .filter((m) => typeof m.nickname === 'string' && m.nickname.length > 0)

    const cacheDir = path.join(process.cwd(), 'scripts', '.cache')
    await fs.mkdir(cacheDir, { recursive: true })
    const file = path.join(cacheDir, 'discord-names.json')
    await fs.writeFile(file, JSON.stringify(out, null, 2), 'utf8')
    console.log(`Wrote ${out.length} Discord member entries to ${file}`)
  } catch (err) {
    console.error('Failed:', err.message)
    process.exit(1)
  } finally {
    client.destroy()
  }
})

client.login(TOKEN)
