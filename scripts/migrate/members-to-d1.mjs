#!/usr/bin/env node
/**
 * Migrate src/data/members.json into D1 members table.
 * Uses external_id for row-level idempotency (INSERT OR IGNORE).
 *
 * PREREQUISITE: Run worker migration 0002_add_members_external_id.sql first:
 *   cd worker && npx wrangler d1 migrations apply bangdream-na-content --remote
 *
 * Usage:
 *   node scripts/migrate/members-to-d1.mjs [--dry-run] [--local]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { parseMemberRow } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);

const membersData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/members.json'), 'utf8'));

// Pre-flight: verify JSON ids are unique
const ids = membersData.map((x) => x.id);
const uniqueCount = new Set(ids).size;
if (uniqueCount !== ids.length) {
  console.error(`[members] ERROR: src/data/members.json has duplicate ids (total ${ids.length}, unique ${uniqueCount}). Cannot proceed.`);
  process.exit(1);
}

console.log(`[members] dry-run=${dryRun} remote=${remote}`);
console.log(`[members] ${membersData.length} rows found in src/data/members.json (all ids unique)`);

let rowsInserted = 0;
let rowsSkipped = 0;

for (const item of membersData) {
  const row = parseMemberRow(item, nowSec);
  const { inserted } = insertRow('members', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
}

const summary = { members: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped } };
console.log('\n[members] summary:');
console.log(JSON.stringify(summary, null, 2));
