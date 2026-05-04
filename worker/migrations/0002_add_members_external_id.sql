-- R5a: add external_id to members for backfill idempotency
-- Partial unique index allows existing NULL rows; all new backfill rows must set external_id.
ALTER TABLE members ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX idx_members_external_id ON members(external_id) WHERE external_id IS NOT NULL;
