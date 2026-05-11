-- 0009: gallery_submissions -- free-form event_label + taken_on for photos
-- whose event isn't in events table; capture when photo was actually taken
-- (vs uploaded). Both NULL-safe -- existing rows unaffected.
-- Also adds gallery_items.submission_id back-pointer so future public/admin
-- surfaces can JOIN to retrieve the free-form label without a slow scan.
--
-- Per memory feedback_verify_entity_ownership_before_adding_column: NO
-- `title` column anywhere. Events table owns titles; gallery_submissions
-- only owns the free-form label as user-typed metadata.
--
-- No backfill: NULL is correct for pre-migration rows (event-only submissions
-- pre-0009 keep their event_id; pre-0009 gallery_items have no submission_id).
-- ADD COLUMN is forward-compatible -- rollback is column-drop which sqlite
-- does NOT support; revert path is "stop reading the columns" not "drop them".

ALTER TABLE gallery_submissions ADD COLUMN event_label TEXT;
ALTER TABLE gallery_submissions ADD COLUMN taken_on TEXT;
ALTER TABLE gallery_items ADD COLUMN submission_id INTEGER
  REFERENCES gallery_submissions(id) ON DELETE SET NULL;
