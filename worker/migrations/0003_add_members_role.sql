-- Add role column to members table.
-- DEFAULT 'member' so existing rows get a valid role on apply.
ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('organizer','member','alumnus','cover-band-lead'));
CREATE INDEX idx_members_role ON members(role);
