-- G-phase: gallery_items table for activity photos + standalone albums.
-- All timestamps are unix seconds (INTEGER) per project convention.
-- CHECK constraint enforces "at least one of (event_id, album)" so every
-- row belongs to a logical group surface in the public UI.

CREATE TABLE gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  caption TEXT,
  taken_at INTEGER,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  album TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (event_id IS NOT NULL OR album IS NOT NULL)
);

CREATE INDEX idx_gallery_event ON gallery_items(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_gallery_album ON gallery_items(album) WHERE album IS NOT NULL;
CREATE INDEX idx_gallery_taken ON gallery_items(taken_at DESC);

-- Pre-DELETE trigger: when an event row is deleted, copy its title_zh into
-- gallery_items.album for any photos pointing at it BEFORE the FK cascade
-- nulls event_id. Without this, ON DELETE SET NULL would leave the row
-- with both event_id IS NULL and album IS NULL, violating the CHECK
-- constraint and aborting the cascade.
CREATE TRIGGER trg_gallery_orphan_to_album
BEFORE DELETE ON events
FOR EACH ROW
BEGIN
  UPDATE gallery_items
  SET album = COALESCE(album, OLD.title_zh),
      updated_at = CAST(strftime('%s','now') AS INTEGER)
  WHERE event_id = OLD.id AND album IS NULL;
END;
