-- R5.5: add role column to members table.
-- DEFAULT 'member' so existing rows get a valid role on apply.
-- Post-migration, scripts/migrate/update-members-roles.mjs populates roles
-- from src/data/members.json via UPDATE WHERE external_id.
ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('organizer','member','alumnus','cover-band-lead'));
CREATE INDEX idx_members_role ON members(role);
