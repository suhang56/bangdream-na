import { describe, expect, it } from "vitest";
import {
  formatWebhookPayload,
  validateWebhookUrl,
} from "../../src/utils/webhook";

const baseComment = {
  id: 42,
  body: "Hello world",
  created_at: 1700000000,
  parent_id: null,
};

const baseUser = {
  id: 7,
  github_login: "alice",
  display_name: "Alice",
  avatar_url: "https://avatars.com/a.png",
};

const baseTarget = {
  id: 100,
  slug: "first-news",
  title_zh: "首条资讯",
  title_en: "First news",
};

describe("formatWebhookPayload", () => {
  it("produces Discord-shaped payload with embed for a normal comment", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(out.content).toContain("Alice");
    expect(out.embeds).toHaveLength(1);
    const e = out.embeds[0];
    expect(e.title).toContain("新评论");
    expect(e.title).toContain("首条资讯");
    expect(e.description).toBe("Hello world");
    expect(e.timestamp).toBe(new Date(1700000000_000).toISOString());
    expect(e.color).toBe(0x66aaff);
    expect(e.author.name).toBe("Alice");
    expect(e.author.icon_url).toBe("https://avatars.com/a.png");
    expect(e.url).toBe("https://bangdream.org/news/first-news");
    expect(e.fields.find((f) => f.name === "评论 / Comment")?.value).toBe(
      "Hello world",
    );
    expect(e.footer.text).toMatch(/bangdream\.org/);
  });

  it("uses event color and label when kind=event", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { ...baseTarget, slug: "show-2026", title_zh: "演出", title_en: "Show" },
      kind: "event",
    });
    expect(out.embeds[0].color).toBe(0xff66aa);
    expect(out.embeds[0].title).toContain("活动");
    // events use the events listing URL (no per-slug detail page yet)
    expect(out.embeds[0].url).toBe("https://bangdream.org/events");
  });

  it("marks reply when isReply=true", () => {
    const out = formatWebhookPayload({
      comment: { ...baseComment, parent_id: 1 },
      user: baseUser,
      target: baseTarget,
      kind: "news",
      isReply: true,
    });
    expect(out.content).toContain("新回复");
    expect(out.embeds[0].title).toContain("新回复");
  });

  it("truncates body longer than 300 chars with ellipsis", () => {
    const long = "x".repeat(500);
    const out = formatWebhookPayload({
      comment: { ...baseComment, body: long },
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(out.embeds[0].description.length).toBe(300);
    expect(out.embeds[0].description.endsWith("…")).toBe(true);
  });

  it("falls back to '(空)' for empty body", () => {
    const out = formatWebhookPayload({
      comment: { ...baseComment, body: "" },
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(out.embeds[0].description).toBe("(空)");
  });

  it("falls back to github_login when display_name is null", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: { ...baseUser, display_name: null },
      target: baseTarget,
      kind: "news",
    });
    expect(out.content).toContain("alice");
    expect(out.embeds[0].author.name).toBe("alice");
  });

  it("uses '匿名' when user is null/missing", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: null,
      target: baseTarget,
      kind: "news",
    });
    expect(out.content).toContain("匿名");
    expect(out.embeds[0].author.name).toBe("匿名");
    expect(out.embeds[0].author.icon_url).toBeUndefined();
  });

  it("uses '(未知目标)' when target is null", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: null,
      kind: "news",
    });
    expect(out.embeds[0].title).toContain("(未知目标)");
    expect(out.embeds[0].url).toBeUndefined();
  });

  it("composes title with both zh and en when both present", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { id: 1, slug: "x", title_zh: "活动一", title_en: "Event one" },
      kind: "news",
    });
    expect(out.embeds[0].title).toContain("活动一 / Event one");
  });

  it("uses zh only when en is missing/empty", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { id: 1, slug: "x", title_zh: "纯中文", title_en: "" },
      kind: "news",
    });
    expect(out.embeds[0].title).toContain("纯中文");
    // No `zh / en` slash-separated target title (kind label still has "资讯 / News")
    expect(out.embeds[0].title).not.toContain("纯中文 / ");
  });

  it("falls back to slug or #id when no titles available", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { id: 99, slug: "only-slug", title_zh: "", title_en: null },
      kind: "news",
    });
    expect(out.embeds[0].title).toContain("only-slug");

    const out2 = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { id: 9, slug: null, title_zh: null, title_en: null },
      kind: "news",
    });
    expect(out2.embeds[0].title).toContain("#9");
    expect(out2.embeds[0].url).toBeUndefined();
  });

  it("produces ISO timestamp matching comment.created_at", () => {
    const out = formatWebhookPayload({
      comment: { ...baseComment, created_at: 1735689600 }, // 2025-01-01T00:00:00Z
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(out.embeds[0].timestamp).toBe("2025-01-01T00:00:00.000Z");
  });

  it("falls back to current time when created_at is invalid", () => {
    const out = formatWebhookPayload({
      comment: { ...baseComment, created_at: NaN },
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(() => new Date(out.embeds[0].timestamp).toISOString()).not.toThrow();
    expect(out.embeds[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("URL-encodes slug to handle special characters", () => {
    const out = formatWebhookPayload({
      comment: baseComment,
      user: baseUser,
      target: { id: 1, slug: "hello world+", title_zh: "你好", title_en: null },
      kind: "news",
    });
    expect(out.embeds[0].url).toBe("https://bangdream.org/news/hello%20world%2B");
  });

  it("does not break when body is non-string (defensive)", () => {
    const out = formatWebhookPayload({
      comment: { ...baseComment, body: undefined as unknown as string },
      user: baseUser,
      target: baseTarget,
      kind: "news",
    });
    expect(out.embeds[0].description).toBe("(空)");
  });
});

describe("validateWebhookUrl", () => {
  it("accepts a valid https URL and normalizes", () => {
    expect(validateWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(
      "https://discord.com/api/webhooks/123/abc",
    );
  });

  it("rejects http (must be https)", () => {
    expect(validateWebhookUrl("http://discord.com/api/webhooks/123")).toBeNull();
  });

  it("rejects malformed URLs", () => {
    expect(validateWebhookUrl("not-a-url")).toBeNull();
    expect(validateWebhookUrl("//discord.com/x")).toBeNull();
  });

  it("rejects null/undefined/empty/non-string", () => {
    expect(validateWebhookUrl(null)).toBeNull();
    expect(validateWebhookUrl(undefined)).toBeNull();
    expect(validateWebhookUrl("")).toBeNull();
    expect(validateWebhookUrl("   ")).toBeNull();
    expect(validateWebhookUrl(42)).toBeNull();
    expect(validateWebhookUrl({})).toBeNull();
  });

  it("rejects ftp / file / javascript schemes", () => {
    expect(validateWebhookUrl("ftp://example.com")).toBeNull();
    expect(validateWebhookUrl("javascript:alert(1)")).toBeNull();
    expect(validateWebhookUrl("file:///etc/passwd")).toBeNull();
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(
      validateWebhookUrl("   https://example.com/hook   "),
    ).toBe("https://example.com/hook");
  });
});
