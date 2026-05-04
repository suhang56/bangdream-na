import { describe, it, expect } from 'vitest';
import { rewriteImageUrl } from '../shared/parse-row.mjs';
import { buildInsertSql } from '../shared/insert-d1.mjs';

// ─── rewriteImageUrl ──────────────────────────────────────────────────────────
describe('rewriteImageUrl', () => {
  it('rewrites /news/foo.png to CDN URL', () => {
    expect(rewriteImageUrl('/news/foo.png')).toBe('https://cdn.bangdream.org/news/foo.png');
  });

  it('rewrites /events/bar.png to CDN URL', () => {
    expect(rewriteImageUrl('/events/bar.png')).toBe('https://cdn.bangdream.org/events/bar.png');
  });

  it('preserves already-absolute https URL', () => {
    const url = 'https://example.com/image.jpg';
    expect(rewriteImageUrl(url)).toBe(url);
  });

  it('preserves already-absolute http URL', () => {
    const url = 'http://cdn.example.com/img.png';
    expect(rewriteImageUrl(url)).toBe(url);
  });

  it('returns null for empty string', () => {
    expect(rewriteImageUrl('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(rewriteImageUrl(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(rewriteImageUrl(undefined)).toBeNull();
  });

  it('handles path without leading slash', () => {
    expect(rewriteImageUrl('news/foo.png')).toBe('https://cdn.bangdream.org/news/foo.png');
  });

  it('handles filename with spaces (URL encoding not needed — just pass through)', () => {
    // URLs with spaces preserved; they will be URL-encoded at request time
    expect(rewriteImageUrl('/news/foo bar.png')).toBe('https://cdn.bangdream.org/news/foo bar.png');
  });

  it('handles Chinese filename', () => {
    const result = rewriteImageUrl('/news/北美邦花篮-53萝p.jpg');
    expect(result).toBe('https://cdn.bangdream.org/news/北美邦花篮-53萝p.jpg');
  });

  it('handles CDN URL that is already rewritten (idempotent pass-through)', () => {
    const url = 'https://cdn.bangdream.org/news/foo.png';
    expect(rewriteImageUrl(url)).toBe(url);
  });
});

// ─── buildInsertSql ───────────────────────────────────────────────────────────
describe('buildInsertSql', () => {
  it('builds correct INSERT OR IGNORE SQL', () => {
    const sql = buildInsertSql('news_posts', { slug: 'test', title_zh: 'Hello', draft: 0 });
    expect(sql).toBe("INSERT OR IGNORE INTO news_posts (slug, title_zh, draft) VALUES ('test', 'Hello', 0);");
  });

  it('encodes NULL for null values', () => {
    const sql = buildInsertSql('events', { slug: 'ev', end_at: null });
    expect(sql).toContain('NULL');
  });

  it('escapes single quotes in string values', () => {
    const sql = buildInsertSql('news_posts', { slug: "it's-a-test", title_zh: "O'Brien" });
    expect(sql).toContain("'it''s-a-test'");
    expect(sql).toContain("'O''Brien'");
  });

  it('handles integer values without quotes', () => {
    const sql = buildInsertSql('members', { created_at: 1746230400 });
    expect(sql).toContain('1746230400');
    expect(sql).not.toContain("'1746230400'");
  });

  it('handles empty string value', () => {
    const sql = buildInsertSql('news_posts', { body_md: '' });
    expect(sql).toContain("''");
  });

  it('handles boolean true as 1', () => {
    const sql = buildInsertSql('news_posts', { draft: true });
    expect(sql).toContain('1');
  });

  it('handles boolean false as 0', () => {
    const sql = buildInsertSql('news_posts', { draft: false });
    expect(sql).toContain('0');
  });

  it('handles Chinese characters in title', () => {
    const sql = buildInsertSql('news_posts', { title_zh: '北美邦花篮' });
    expect(sql).toContain('北美邦花篮');
  });

  it('builds SQL for members table with external_id', () => {
    const sql = buildInsertSql('members', { display_name: 'Test', external_id: 'sherry', expedition_member: 0 });
    expect(sql).toContain("external_id");
    expect(sql).toContain("'sherry'");
    expect(sql).toMatch(/^INSERT OR IGNORE INTO members/);
  });
});
