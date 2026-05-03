// Merge Discord + QQ + WeChat (manual) name lists into src/data/members.json.
// Output: src/data/members.json
//
// Inputs (all optional — missing files are skipped):
//   scripts/.cache/discord-names.json   from pull-discord-names.mjs
//   scripts/.cache/qq-names.json         from pull-qq-names.mjs
//   scripts/.cache/wechat-names.json     manually curated, same schema as qq-names.json
//
// Output schema (per src/components/MemberCard, P3 design):
//   { id, name, role, oshiBand, pronouns, bio }
//
// Decisions:
//   - Display name only (no platform identifiers, no avatars per user choice 2026-05-02)
//   - role defaults to 'member'; admin can promote in P4 GUI
//   - oshiBand inferred from Discord role groups when matching a band marker
//     (e.g. role "Roselia 推" → oshiBand "Roselia"). Otherwise null.
//   - Dedupe: same nickname across platforms = one entry
//   - id: slugified-romanized nickname; collisions suffixed -2, -3, ...

import fs from 'node:fs/promises'
import path from 'node:path'

const BAND_MARKERS = {
  Roselia: ['Roselia', 'roselia', '罗子'],
  "Poppin'Party": ["Poppin'Party", 'PoppinParty', 'popipa', '破派', 'poppin'],
  'MyGO!!!!!': ['MyGO', 'mygo', 'mg'],
  MORFONICA: ['MORFONICA', 'Morfonica', 'morfo', '茉花'],
  Afterglow: ['Afterglow', 'afterglow', 'AG', '夕阳'],
  'Pastel*Palettes': ['Pastel*Palettes', 'PastelPalettes', 'pasupare', '帕斯帕雷'],
  'Hello, Happy, World!': ['Hello, Happy, World!', 'HHW', 'hapihapi', '哈皮'],
}

function slugify(str) {
  if (typeof str !== 'string') return 'member'
  let s = str.toLowerCase()
  s = s.replace(/[\s　_]+/g, '-')
  s = s.replace(/[^\p{Letter}\p{Number}\-]+/gu, '')
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  return s.length > 0 ? s : 'member'
}

function inferOshi(roleGroups) {
  if (!Array.isArray(roleGroups)) return null
  for (const [band, markers] of Object.entries(BAND_MARKERS)) {
    if (
      roleGroups.some((r) =>
        markers.some((m) => r.toLowerCase().includes(m.toLowerCase())),
      )
    ) {
      return band
    }
  }
  return null
}

async function loadOptional(rel) {
  try {
    const txt = await fs.readFile(path.join(process.cwd(), rel), 'utf8')
    return JSON.parse(txt)
  } catch {
    return []
  }
}

const [discord, qq, wechat] = await Promise.all([
  loadOptional('scripts/.cache/discord-names.json'),
  loadOptional('scripts/.cache/qq-names.json'),
  loadOptional('scripts/.cache/wechat-names.json'),
])

const byKey = new Map()

function add(name, oshi) {
  if (typeof name !== 'string' || name.length === 0) return
  const key = name.trim().toLowerCase()
  if (byKey.has(key)) {
    const cur = byKey.get(key)
    if (!cur.oshiBand && oshi) cur.oshiBand = oshi
    return
  }
  byKey.set(key, { rawName: name.trim(), oshiBand: oshi })
}

for (const m of discord) add(m.nickname, inferOshi(m.roleGroups))
for (const m of qq) add(m.nickname, null)
for (const m of wechat) add(m.nickname, null)

const seen = new Set()
const out = []
for (const { rawName, oshiBand } of byKey.values()) {
  let id = slugify(rawName)
  if (seen.has(id)) {
    let n = 2
    while (seen.has(id + '-' + n)) n++
    id = id + '-' + n
  }
  seen.add(id)
  out.push({
    id,
    name: rawName,
    role: 'member',
    oshiBand,
    pronouns: null,
    bio: null,
  })
}

out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

const dest = path.join(process.cwd(), 'src', 'data', 'members.json')
await fs.writeFile(dest, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(
  `Wrote ${out.length} members to ${dest} ` +
    `(discord: ${discord.length}, qq: ${qq.length}, wechat: ${wechat.length})`,
)
