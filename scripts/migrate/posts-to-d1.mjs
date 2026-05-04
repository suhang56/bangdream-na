#!/usr/bin/env node
/**
 * R7: Migrate src/data/posts.json + public/posts/ images into D1 + R2.
 *
 * Usage:
 *   node scripts/migrate/posts-to-d1.mjs [--dry-run] [--local]
 *
 * Default target is --remote (production). Pass --local to apply against
 * a wrangler-managed local D1.
 */

import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertRow } from './shared/insert-d1.mjs';
import { uploadToR2 } from './shared/upload-r2.mjs';
import { parseFeaturedPostRow } from './shared/parse-row.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);
const postsData = JSON.parse(readFileSync(resolve(ROOT, 'src/data/posts.json'), 'utf8'));
console.log(`[posts] dry-run=${dryRun} remote=${remote}`);
console.log(`[posts] ${postsData.length} rows found in src/data/posts.json`);

let rowsInserted = 0;
let rowsSkipped = 0;
let imagesUploaded = 0;
let imagesSkipped = 0;

postsData.forEach((item, idx) => {
  const row = parseFeaturedPostRow(item, nowSec, idx);
  if (item.image) {
    const imgBasename = basename(item.image);
    const r2Key = `posts/${imgBasename}`;
    const localPath = resolve(ROOT, 'public', 'posts', imgBasename);
    const result = uploadToR2(localPath, r2Key, { dryRun, skipIfExists: true });
    if (result.skipped) imagesSkipped++; else imagesUploaded++;
  }
  const { inserted } = insertRow('featured_posts', row, { remote, dryRun });
  if (inserted || dryRun) rowsInserted++; else rowsSkipped++;
});

const summary = {
  posts: {
    rows_inserted: rowsInserted,
    rows_skipped: rowsSkipped,
    images_uploaded: imagesUploaded,
    images_skipped: imagesSkipped,
  },
};
console.log('\n[posts] summary:');
console.log(JSON.stringify(summary, null, 2));
