#!/usr/bin/env node
/**
 * R7: Migrate src/data/about.json into D1 about_sections table.
 *
 * Usage:
 *   node scripts/migrate/about-to-d1.mjs [--dry-run] [--local]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { parseAboutSectionRows } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);
const aboutData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/about.json'), 'utf8'));
const rows = parseAboutSectionRows(aboutData, nowSec);
console.log(`[about] dry-run=${dryRun} remote=${remote}`);
console.log(`[about] ${rows.length} sections derived from src/data/about.json`);

let rowsInserted = 0;
let rowsSkipped = 0;

for (const row of rows) {
  const { inserted } = insertRow('about_sections', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
}

const summary = { about: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped } };
console.log('\n[about] summary:');
console.log(JSON.stringify(summary, null, 2));
