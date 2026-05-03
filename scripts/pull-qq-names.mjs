// Pull display names from a QQ group via NapCat (OneBot 11).
// Output: scripts/.cache/qq-names.json
//
// Supports both HTTP and WebSocket NapCat endpoints. Set NAPCAT_WS_URL to use
// WebSocket (matches QQ-Group-Bot's existing config), or NAPCAT_HTTP_URL for HTTP.
//
// Env vars:
//   NAPCAT_WS_URL    e.g. ws://127.0.0.1:3001    (preferred — reuses QQ-Bot's connection)
//   NAPCAT_HTTP_URL  e.g. http://localhost:3000  (alternative — HTTP server)
//   NAPCAT_TOKEN     access token if NapCat has one configured
//   QQ_GROUP_ID      target group number
//
// We DO NOT export QQ numbers, sex, level, or any account identifier.
// Only group display name (card if set, else nickname).

import fs from 'node:fs/promises'
import path from 'node:path'

const WS_URL = process.env.NAPCAT_WS_URL
const HTTP_URL = process.env.NAPCAT_HTTP_URL
const TOKEN = process.env.NAPCAT_TOKEN || ''
const GROUP = process.env.QQ_GROUP_ID

if (!GROUP || (!WS_URL && !HTTP_URL)) {
  console.error(
    'Missing env vars. Set QQ_GROUP_ID and either NAPCAT_WS_URL or NAPCAT_HTTP_URL.',
  )
  process.exit(1)
}

async function fetchViaHttp() {
  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
  }
  const res = await fetch(HTTP_URL.replace(/\/$/, '') + '/get_group_member_list', {
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
  return Array.isArray(json.data) ? json.data : json
}

function fetchViaWs() {
  return new Promise((resolve, reject) => {
    if (typeof WebSocket === 'undefined') {
      reject(
        new Error(
          'WebSocket not available. Use Node 22+ (current: ' + process.version + ')',
        ),
      )
      return
    }
    const url =
      WS_URL + (TOKEN ? (WS_URL.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(TOKEN) : '')
    const ws = new WebSocket(url)
    const echo = 'pull-qq-names-' + Date.now()
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('WebSocket timeout after 15s'))
    }, 15000)

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          action: 'get_group_member_list',
          params: { group_id: Number(GROUP), no_cache: true },
          echo,
        }),
      )
    })
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString())
        if (msg.echo !== echo) return
        clearTimeout(timeout)
        ws.close()
        if (msg.status !== 'ok' || !Array.isArray(msg.data)) {
          reject(new Error('NapCat WS returned: ' + JSON.stringify(msg)))
          return
        }
        resolve(msg.data)
      } catch (err) {
        clearTimeout(timeout)
        ws.close()
        reject(err)
      }
    })
    ws.addEventListener('error', (ev) => {
      clearTimeout(timeout)
      reject(new Error('WebSocket error: ' + (ev.message || 'connection failed')))
    })
  })
}

try {
  const members = WS_URL ? await fetchViaWs() : await fetchViaHttp()
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
