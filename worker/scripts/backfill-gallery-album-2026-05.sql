-- 2026-05 one-shot data backfill: redistribute the 4 legacy gallery_items
-- rows currently bucketed in album='submissions' into per-event albums
-- (or per-label albums, or the '其他' fallback) based on the JOINed
-- gallery_submissions row.
--
-- Run AFTER the approve-handler change deploys (so any in-flight approve
-- uses the new code path and does not race the backfill).
--
-- Run command:
--   wrangler d1 execute bangdream-na-content --remote \
--     --file=worker/scripts/backfill-gallery-album-2026-05.sql
--
-- Pre/post-flight verification per GALLERY-GROUP-DESIGN.md Section 2.
-- Idempotent: re-running after success is a no-op (no rows match
-- album='submissions' anymore).

-- Step 1: rows whose submission carries event_id -> bind event_id, null album.
UPDATE gallery_items
SET event_id = (
      SELECT gs.event_id
      FROM gallery_submissions gs
      WHERE gs.id = gallery_items.submission_id
    ),
    album = NULL,
    updated_at = CAST(strftime('%s','now') AS INTEGER)
WHERE album = 'submissions'
  AND submission_id IS NOT NULL
  AND (
    SELECT gs.event_id
    FROM gallery_submissions gs
    WHERE gs.id = gallery_items.submission_id
  ) IS NOT NULL;

-- Step 2: rows whose submission carries event_label (no event_id)
--   -> set album = trimmed label. Use TRIM to mirror handler defense-in-depth.
UPDATE gallery_items
SET album = TRIM(
      (SELECT gs.event_label
       FROM gallery_submissions gs
       WHERE gs.id = gallery_items.submission_id)
    ),
    updated_at = CAST(strftime('%s','now') AS INTEGER)
WHERE album = 'submissions'
  AND submission_id IS NOT NULL
  AND (
    SELECT gs.event_id
    FROM gallery_submissions gs
    WHERE gs.id = gallery_items.submission_id
  ) IS NULL
  AND TRIM(COALESCE(
        (SELECT gs.event_label
         FROM gallery_submissions gs
         WHERE gs.id = gallery_items.submission_id),
        ''
      )) <> '';

-- Step 3: any leftover (both submission.event_id AND submission.event_label
-- null, OR submission_id is null / orphaned) -> fall back to '其他'.
UPDATE gallery_items
SET album = '其他',
    updated_at = CAST(strftime('%s','now') AS INTEGER)
WHERE album = 'submissions';
