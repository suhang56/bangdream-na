-- 0007: gallery_submissions — anonymous public submissions awaiting admin review.
-- All timestamps are unix seconds (INTEGER) per project convention.
-- r2_key tracks current R2 location: 'submissions/<uuid>.<ext>' (pending/rejected),
-- 'gallery/<uuid>.<ext>' (approved post-move). gallery_item_id back-fills after approve.

CREATE TABLE gallery_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL,
  nickname TEXT NOT NULL,
  caption TEXT,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  ua_hash TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at INTEGER,
  rejection_reason TEXT,
  gallery_item_id INTEGER REFERENCES gallery_items(id) ON DELETE SET NULL
);

-- Queue keyset pagination: pending listing in submitted_at DESC. Partial index
-- because non-pending rows rarely queried by this path.
CREATE INDEX idx_gallery_submissions_pending_time
  ON gallery_submissions(submitted_at DESC, id DESC)
  WHERE status = 'pending';

-- Rate limit / audit fallback queries. Compound (ip_hash, submitted_at) so
-- WHERE ip_hash=? AND submitted_at>=? hits the index without table scan.
CREATE INDEX idx_gallery_submissions_ip_time
  ON gallery_submissions(ip_hash, submitted_at);

-- Stats endpoint: COUNT() by status hits this constant-time per index seek.
CREATE INDEX idx_gallery_submissions_status
  ON gallery_submissions(status);
