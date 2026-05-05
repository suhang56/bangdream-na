-- Migration 0006: partial index on news_posts.category for published rows
-- Post-merge step: run `wrangler d1 migrations apply bangdream-na-content --remote`
CREATE INDEX IF NOT EXISTS idx_news_category ON news_posts(category) WHERE draft = 0;
