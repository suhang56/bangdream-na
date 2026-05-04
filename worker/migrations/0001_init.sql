-- R-phase initial schema (R2)
-- All timestamps are unix seconds (INTEGER). All TEXT for slugs/json strings.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_login TEXT UNIQUE NOT NULL,
  github_id INTEGER UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','member')) DEFAULT 'member',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE news_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  body_md TEXT NOT NULL,
  category TEXT NOT NULL,
  hero_image_url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  draft INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  description_md TEXT,
  hero_image_url TEXT,
  start_at INTEGER NOT NULL,
  end_at INTEGER,
  venue TEXT,
  city TEXT,
  scope TEXT,
  ticket_url TEXT,
  band_theme TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  city TEXT,
  oshi_character TEXT,
  oshi_band TEXT,
  avatar_url TEXT,
  expedition_member INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK(target_kind IN ('news','event')),
  target_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  display_zh TEXT NOT NULL,
  display_en TEXT,
  accent_color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_news_published ON news_posts(published_at DESC) WHERE draft=0;
CREATE INDEX idx_news_slug ON news_posts(slug);
CREATE INDEX idx_events_start ON events(start_at);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_comments_target ON comments(target_kind, target_id, created_at);
CREATE INDEX idx_comments_parent ON comments(parent_id);
