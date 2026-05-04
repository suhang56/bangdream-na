#!/usr/bin/env node
/**
 * Migrate src/data/events.json + public/events/ images into D1 + R2.
 *
 * Usage:
 *   node scripts/migrate/events-to-d1.mjs [--dry-run] [--local]
 */

import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { uploadToR2 } from './shared/upload-r2.mjs';
import { parseEventRow } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);

const eventsData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/events.json'), 'utf8'));
console.log(`[events] dry-run=${dryRun} remote=${remote}`);
console.log(`[events] ${eventsData.length} rows found in src/data/events.json`);

let rowsInserted = 0;
let rowsSkipped = 0;
let imagesUploaded = 0;
let imagesSkipped = 0;

for (const item of eventsData) {
  const row = parseEventRow(item, nowSec);

  // Upload image to R2 if referenced
  if (item.image) {
    const imgBasename = basename(item.image);
    const r2Key = `events/${imgBasename}`;
    const localPath = resolve(ROOT, 'public', 'events', imgBasename);
    const result = uploadToR2(localPath, r2Key, { dryRun, skipIfExists: true });
    if (result.skipped) imagesSkipped++; else imagesUploaded++;
  }

  // Insert D1 row
  const { inserted } = insertRow('events', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
}

const summary = { events: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped, images_uploaded: imagesUploaded, images_skipped: imagesSkipped } };
console.log('\n[events] summary:');
console.log(JSON.stringify(summary, null, 2));
