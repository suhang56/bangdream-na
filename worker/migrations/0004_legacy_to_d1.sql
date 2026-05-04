-- R7: migrate file-backed legacy content (posts/social/about) to D1.
-- Site metadata reuses the existing `settings` table under `site.*` key prefix.
-- All timestamps are unix seconds (INTEGER).

CREATE TABLE featured_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_zh TEXT,
  title_en TEXT,
  body_md TEXT,
  image_url TEXT,
  link_url TEXT,
  published_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_featured_posts_sort ON featured_posts(active, sort_order);

CREATE TABLE social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT UNIQUE NOT NULL,
  label_zh TEXT NOT NULL,
  label_en TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_social_links_sort ON social_links(active, sort_order);

CREATE TABLE about_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  body_md TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_about_sections_sort ON about_sections(active, sort_order);
