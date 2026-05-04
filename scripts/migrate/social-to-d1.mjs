#!/usr/bin/env node
/**
 * R7: Migrate src/data/social.json into D1 social_links table.
 *
 * Usage:
 *   node scripts/migrate/social-to-d1.mjs [--dry-run] [--local]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { parseSocialLinkRow } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);
const socialData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/social.json'), 'utf8'));
console.log(`[social] dry-run=${dryRun} remote=${remote}`);
console.log(`[social] ${socialData.length} rows found in src/data/social.json`);

let rowsInserted = 0;
let rowsSkipped = 0;

socialData.forEach((item, idx) => {
  const row = parseSocialLinkRow(item, nowSec, idx);
  // Disabled rows with empty url are skipped — there's nothing useful to
  // migrate, and the platform UNIQUE constraint will block re-insert.
  if (!row.url || row.url.length === 0) {
    rowsSkipped++;
    return;
  }
  const { inserted } = insertRow('social_links', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
});

const summary = { social: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped } };
console.log('\n[social] summary:');
console.log(JSON.stringify(summary, null, 2));
