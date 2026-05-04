#!/usr/bin/env node
/**
 * R7: Migrate src/data/site.json into the existing D1 settings table
 * under the `site.*` key namespace. No new table needed.
 *
 * Usage:
 *   node scripts/migrate/site-to-d1.mjs [--dry-run] [--local]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { parseSiteSettings } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);
const siteData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/site.json'), 'utf8'));
const rows = parseSiteSettings(siteData, nowSec);
console.log(`[site] dry-run=${dryRun} remote=${remote}`);
console.log(`[site] ${rows.length} settings rows derived from src/data/site.json`);

let rowsInserted = 0;
let rowsSkipped = 0;

for (const row of rows) {
  const { inserted } = insertRow('settings', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
}

const summary = { site: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped } };
console.log('\n[site] summary:');
console.log(JSON.stringify(summary, null, 2));
