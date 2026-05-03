// Pull display names from a QQ group via NapCat HTTP API.
// Output: scripts/.cache/qq-names.json
//
// Env vars:
//   NAPCAT_HTTP_URL  e.g. http://localhost:3000
//   NAPCAT_TOKEN     (optional; if your NapCat instance has access_token configured)
//   QQ_GROUP_ID      target group number
//
// We DO NOT export QQ numbers, sex, level, or any account identifier.
// Only group display name (card if set, else nickname).

import fs from 'node:fs/promises'
import path from 'node:path'

const NAPCAT = process.env.NAPCAT_HTTP_URL
const TOKEN = process.env.NAPCAT_TOKEN || ''
const GROUP = process.env.QQ_GROUP_ID

if (!NAPCAT || !GROUP) {
  console.error(
    'Missing NAPCAT_HTTP_URL or QQ_GROUP_ID env var. Set them and retry.',
  )
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
}

try {
  const res = await fetch(NAPCAT.replace(/\/$/, '') + '/get_group_member_list', {
    method: 'POST',
    headers,
    body: JSON.stringify({ group_id: Number(GROUP), no_cache: true }),
  })
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ': ' + (await res.text()))
  }
  const json = await res.json()
  if (json.status !== 'ok' && !Array.isArray(json.data)) {
    throw new Error('NapCat returned: ' + JSON.stringify(json))
  }
  const members = Array.isArray(json.data) ? json.data : json
  const out = members
    .map((m) => {
      const card = typeof m.card === 'string' ? m.card.trim() : ''
      const nickname = typeof m.nickname === 'string' ? m.nickname.trim() : ''
      const name = card.length > 0 ? card : nickname
      return { nickname: name }
    })
    .filter((m) => typeof m.nickname === 'string' && m.nickname.length > 0)

  const cacheDir = path.join(process.cwd(), 'scripts', '.cache')
  await fs.mkdir(cacheDir, { recursive: true })
  const file = path.join(cacheDir, 'qq-names.json')
  await fs.writeFile(file, JSON.stringify(out, null, 2), 'utf8')
  console.log(`Wrote ${out.length} QQ member entries to ${file}`)
} catch (err) {
  console.error('Failed:', err.message)
  process.exit(1)
}
