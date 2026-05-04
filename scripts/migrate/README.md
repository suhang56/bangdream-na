# Migration Scripts — R5a Backfill

Backfills existing JSON content and images into D1 (database) and R2 (images) for bangdream-na.

## Prerequisites

1. Valid `worker/.dev.vars` with `WRANGLER_API_TOKEN` or `npx wrangler login` completed.
2. **Run schema migration 0002 before the first backfill run** (adds `external_id` column to members):
   ```bash
   cd worker
   npx wrangler d1 migrations apply bangdream-na-content --remote
   cd ..
   ```

## Run order

Categories must run first because `news_posts.category` references category slugs.

```bash
npm run migrate:categories   # 4 rows
npm run migrate:news         # 9 rows, 9 images
npm run migrate:events       # 5 rows, 3 images (2 events have no image)
npm run migrate:members      # 722 rows, no images
```

Or run all in sequence:

```bash
npm run migrate:all
```

## Dry-run (recommended before first real run)

Prints all planned D1 SQL statements and R2 upload operations without executing anything:

```bash
npm run migrate:dry-run
```

Expected dry-run output summary:
```json
{"categories": {"rows_inserted": 4,  "rows_skipped": 0}}
{"news":       {"rows_inserted": 9,  "rows_skipped": 0, "images_uploaded": 9, "images_skipped": 0}}
{"events":     {"rows_inserted": 5,  "rows_skipped": 0, "images_uploaded": 3, "images_skipped": 0}}
{"members":    {"rows_inserted": 722,"rows_skipped": 0}}
```

## --local flag

To run against a local D1 instance (e.g. `wrangler dev`), pass `--local`:

```bash
node scripts/migrate/news-to-d1.mjs --local
```

Note: `--local` still tries to upload images to the real R2 bucket. Image upload is always `--remote` (R2 has no local emulation in wrangler).

## Idempotency

All D1 inserts use `INSERT OR IGNORE` with unique constraints:

- `news_posts`: unique on `slug`
- `events`: unique on `slug`
- `categories`: unique on `slug`
- `members`: unique on `external_id` (added by migration 0002, partial index — only rows where `external_id IS NOT NULL`)

Re-running any script after a successful run produces `rows_inserted: 0, rows_skipped: N`.

R2 uploads are also idempotent: each image key is checked with `wrangler r2 object head` before upload; existing keys are skipped.

## Verify after migration

```bash
# Row counts
npx wrangler d1 execute bangdream-na-content --remote --command "SELECT COUNT(*) FROM news_posts"
npx wrangler d1 execute bangdream-na-content --remote --command "SELECT COUNT(*) FROM events"
npx wrangler d1 execute bangdream-na-content --remote --command "SELECT COUNT(*) FROM members"
npx wrangler d1 execute bangdream-na-content --remote --command "SELECT slug FROM categories WHERE active=1"

# Spot-check an image
curl -sI https://cdn.bangdream.org/news/%E3%80%90%E5%8F%B7%E5%A4%96%E3%80%91%E9%82%A6%E5%A4%9A%E5%88%A9%E4%B9%90%E9%98%9F%E6%97%B6%E9%9A%94%E4%BA%94%E5%B9%B4%E9%87%8D%E5%9B%9E%E5%8C%97%E7%BE%8E.png
# Expect: HTTP/2 200 + cache-control: public, max-age=31536000, immutable
```

## Rollback safety

All inserts are idempotent — re-running after partial failure is safe. To roll back manually:

```bash
npx wrangler d1 execute bangdream-na-content --remote --command "DELETE FROM news_posts"
npx wrangler d1 execute bangdream-na-content --remote --command "DELETE FROM events"
npx wrangler d1 execute bangdream-na-content --remote --command "DELETE FROM categories"
npx wrangler d1 execute bangdream-na-content --remote --command "DELETE FROM members WHERE external_id IS NOT NULL"
```
