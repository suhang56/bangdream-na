#!/usr/bin/env node
/**
 * Seed initial categories into D1.
 * Run this FIRST — news_posts.category references these slugs.
 *
 * Usage:
 *   node scripts/migrate/categories-to-d1.mjs [--dry-run] [--local]
 */

import { insertRow } from './shared/insert-d1.mjs';
import { parseCategoryRow } from './shared/parse-row.mjs';

const CATEGORIES = [
  { slug: 'announcement', display_zh: '公告', display_en: 'Announcement', accent_color: '--accent-coral',   sort_order: 0 },
  { slug: 'event',        display_zh: '活动', display_en: 'Event',        accent_color: '--accent-mint',    sort_order: 1 },
  { slug: 'community',    display_zh: '社区', display_en: 'Community',    accent_color: '--accent-lavender', sort_order: 2 },
  { slug: 'release',      display_zh: '发售', display_en: 'Release',      accent_color: '--accent-cyan',    sort_order: 3 },
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const remote = !args.includes('--local');

const nowSec = Math.floor(Date.now() / 1000);
let rowsInserted = 0;
let rowsSkipped = 0;

console.log(`[categories] dry-run=${dryRun} remote=${remote}`);
console.log(`[categories] seeding ${CATEGORIES.length} categories`);

for (const cat of CATEGORIES) {
  const row = parseCategoryRow(cat, nowSec);
  const { inserted } = insertRow('categories', row, { remote, dryRun });
  if (inserted) {
    rowsInserted++;
  } else {
    // dry-run counts as "would insert"
    if (dryRun) rowsInserted++; else rowsSkipped++;
  }
}

const summary = { categories: { rows_inserted: rowsInserted, rows_skipped: rowsSkipped } };
console.log('\n[categories] summary:');
console.log(JSON.stringify(summary, null, 2));
