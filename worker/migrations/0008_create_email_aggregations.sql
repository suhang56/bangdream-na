-- 0008: email_aggregations — pending-digest queue for triggers that batch
-- (currently gallery-submission-notify; future member-signup-digest, etc.).
-- A row represents "send this digest at or after scheduled_at". Cron scans
-- WHERE status='pending' AND scheduled_at<=now, sends, marks sent.

CREATE TABLE email_aggregations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','superseded')),
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  error TEXT
);

CREATE INDEX idx_email_aggregations_pending_due
  ON email_aggregations(scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_email_aggregations_trigger_status
  ON email_aggregations(trigger, status);
