#!/usr/bin/env node
/**
 * R5.5 one-time data fix: populate members.role in D1 from src/data/members.json.
 *
 * Reads the JSON members list, normalizes each role to one of the four valid
 * values (organizer / member / alumnus / cover-band-lead), and runs
 * `UPDATE members SET role = ? WHERE external_id = ?` for each row.
 *
 * Idempotent — re-running yields the same final state. Skips rows whose JSON
 * role is unknown or absent (those rows keep the column DEFAULT 'member' set
 * by the 0003 migration). Skips rows where external_id is missing/blank.
 *
 * Usage:
 *   node scripts/migrate/update-members-roles.mjs --dry-run
 *   node scripts/migrate/update-members-roles.mjs --remote
 *   node scripts/migrate/update-members-roles.mjs --local
 *
 * PREREQUISITE: 0003_add_members_role.sql migration must be applied first:
 *   cd worker && npx wrangler d1 migrations apply bangdream-na-content --remote
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { executeD1 } from './shared/insert-d1.mjs'

const VALID_ROLES = new Set([
  'organizer',
  'member',
  'alumnus',
  'cover-band-lead',
])

/** Single-quote-escape a value for inline SQL. */
export function sqlString(v) {
  return `'${String(v).replace(/'/g, "''")}'`
}

/**
 * Build an UPDATE statement for a single row.
 * Returns null when role is invalid (caller should skip).
 */
export function buildUpdateSql(externalId, role) {
  if (!externalId || typeof externalId !== 'string') return null
  if (!VALID_ROLES.has(role)) return null
  return `UPDATE members SET role = ${sqlString(role)}, updated_at = strftime('%s','now') WHERE external_id = ${sqlString(externalId)};`
}

/**
 * Group + summarize JSON rows by their role bucket.
 * Returns { valid: [{external_id, role}], skippedNoExternalId, skippedBadRole }.
 */
export function classifyMembersJson(items) {
  const valid = []
  let skippedNoExternalId = 0
  let skippedBadRole = 0
  for (const item of items) {
    const externalId = typeof item.id === 'string' ? item.id.trim() : ''
    if (!externalId) {
      skippedNoExternalId++
      continue
    }
    const role = item.role
    if (!VALID_ROLES.has(role)) {
      skippedBadRole++
      continue
    }
    valid.push({ external_id: externalId, role })
  }
  return { valid, skippedNoExternalId, skippedBadRole }
}

/**
 * Build the consolidated SQL script for all valid rows.
 * Statements are separated by newlines so wrangler d1 execute can run them
 * in one invocation.
 */
export function buildBatchSql(validRows) {
  return validRows.map((r) => buildUpdateSql(r.external_id, r.role)).filter(Boolean).join('\n')
}

function parseArgs(argv) {
  const args = argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    remote: !args.includes('--local'),
    local: args.includes('--local'),
  }
}

async function main() {
  const { dryRun, remote } = parseArgs(process.argv)
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const ROOT = resolve(__dirname, '../..')
  const jsonPath = resolve(ROOT, 'src/data/members.json')

  const items = JSON.parse(readFileSync(jsonPath, 'utf8'))
  if (!Array.isArray(items)) {
    console.error(`[roles] expected array in ${jsonPath}, got ${typeof items}`)
    process.exit(1)
  }

  const { valid, skippedNoExternalId, skippedBadRole } = classifyMembersJson(items)

  console.log(`[roles] dry-run=${dryRun} remote=${remote}`)
  console.log(`[roles] ${items.length} rows in JSON; ${valid.length} updateable; ${skippedNoExternalId} missing external_id; ${skippedBadRole} unknown role`)

  // Per-bucket counts (helpful for ops verification)
  const byRole = valid.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1
    return acc
  }, {})
  console.log(`[roles] by-role buckets: ${JSON.stringify(byRole)}`)

  if (valid.length === 0) {
    console.log('[roles] nothing to do')
    return
  }

  const sql = buildBatchSql(valid)

  if (dryRun) {
    console.log('[roles] DRY RUN — first 3 statements:')
    sql.split('\n').slice(0, 3).forEach((line) => console.log(`  ${line}`))
    return
  }

  // Single batch execute — wrangler d1 execute runs statements transactionally.
  executeD1(sql, { remote, dryRun: false })
  console.log(`[roles] applied ${valid.length} role updates against ${remote ? 'remote' : 'local'} D1`)
}

// Only run main when invoked as CLI; pure helpers exported for tests.
const isCli = (() => {
  if (typeof process === 'undefined' || !process.argv?.[1]) return false
  try {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (isCli) {
  main().catch((err) => {
    console.error('[roles] FAILED:', err)
    process.exit(1)
  })
}
