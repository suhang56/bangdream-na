import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../src/db/client";
import {
  aboutSections,
  categories,
  events,
  featuredPosts,
  members,
  newsPosts,
  settings,
  socialLinks,
} from "../../src/db/schema";
import { createApp } from "../../src/index";

const PUBLIC_CACHE = "public, max-age=15, s-maxage=15, stale-while-revalidate=60";

async function clearAll() {
  const db = getDb(env);
  await db.delete(newsPosts).run();
  await db.delete(events).run();
  await db.delete(members).run();
  await db.delete(categories).run();
  await db.delete(featuredPosts).run();
  await db.delete(socialLinks).run();
  await db.delete(aboutSections).run();
  await db.delete(settings).run();
}

beforeEach(clearAll);
afterEach(clearAll);

async function seedNews(rows: Array<Partial<typeof newsPosts.$inferInsert>>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(newsPosts)
      .values({
        slug: r.slug ?? "x",
        titleZh: r.titleZh ?? "标题",
        titleEn: r.titleEn ?? null,
        bodyMd: r.bodyMd ?? "body",
        category: r.category ?? "announcement",
        heroImageUrl: r.heroImageUrl ?? null,
        tagsJson: r.tagsJson ?? "[]",
        publishedAt: r.publishedAt ?? now,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
        draft: r.draft ?? 0,
      })
      .run();
  }
}

async function seedCategories(slugs: string[]) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < slugs.length; i++) {
    await db
      .insert(categories)
      .values({
        slug: slugs[i],
        displayZh: slugs[i],
        displayEn: slugs[i],
        accentColor: null,
        sortOrder: i,
        active: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

describe("GET /api/news", () => {
  it("returns empty list with public cache headers + ETag + Vary", async () => {
    const res = await createApp().request("https://x/api/news", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    expect(res.headers.get("ETag")).toMatch(/^"[0-9a-f]{40}"$/);
    expect(res.headers.get("Vary")).toBe("Origin");
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body).toEqual({ items: [], total: 0 });
  });

  it("returns items sorted by published_at desc and excludes drafts", async () => {
    await seedNews([
      { slug: "draft-one", titleZh: "草稿", publishedAt: 9999, draft: 1 },
      { slug: "early", titleZh: "早", publishedAt: 1000 },
      { slug: "late", titleZh: "晚", publishedAt: 2000 },
    ]);
    const res = await createApp().request("https://x/api/news", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ slug: string; tags: string[] }>;
      total: number;
    };
    expect(body.total).toBe(2);
    expect(body.items.map((i) => i.slug)).toEqual(["late", "early"]);
    expect(body.items[0].tags).toEqual([]);
  });

  it("respects limit and offset", async () => {
    await seedNews(
      Array.from({ length: 5 }, (_, i) => ({
        slug: `n${i}`,
        titleZh: `${i}`,
        publishedAt: 1000 + i,
      })),
    );
    const res = await createApp().request("https://x/api/news?limit=2&offset=1", {}, env);
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    expect(body.total).toBe(5);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].slug).toBe("n3");
    expect(body.items[1].slug).toBe("n2");
  });

  it("rejects limit > 100 → 400", async () => {
    const res = await createApp().request("https://x/api/news?limit=101", {}, env);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects limit=0 → 400", async () => {
    const res = await createApp().request("https://x/api/news?limit=0", {}, env);
    expect(res.status).toBe(400);
  });

  it("rejects negative offset → 400", async () => {
    const res = await createApp().request("https://x/api/news?offset=-1", {}, env);
    expect(res.status).toBe(400);
  });

  it("filters by category when category exists", async () => {
    await seedCategories(["announcement", "release"]);
    await seedNews([
      { slug: "a1", titleZh: "公告1", category: "announcement", publishedAt: 1 },
      { slug: "r1", titleZh: "发售1", category: "release", publishedAt: 2 },
    ]);
    const res = await createApp().request(
      "https://x/api/news?category=announcement",
      {},
      env,
    );
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0].slug).toBe("a1");
  });

  it("rejects unknown category → 400", async () => {
    await seedCategories(["announcement"]);
    const res = await createApp().request(
      "https://x/api/news?category=nonexistent",
      {},
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects inactive (soft-deleted) category → 400", async () => {
    // A soft-deleted category exists in the DB with active=0. Public callers
    // must not be able to filter by it — same response as a fully-unknown
    // slug. Mirror the categories endpoint which also filters active=1.
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(categories)
      .values({
        slug: "retired",
        displayZh: "已退役",
        displayEn: null,
        accentColor: null,
        sortOrder: 0,
        active: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const res = await createApp().request(
      "https://x/api/news?category=retired",
      {},
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("returns 304 when If-None-Match matches", async () => {
    await seedNews([{ slug: "p1", titleZh: "x", publishedAt: 1 }]);
    const first = await createApp().request("https://x/api/news", {}, env);
    const etag = first.headers.get("ETag")!;
    const second = await createApp().request(
      "https://x/api/news",
      { headers: { "If-None-Match": etag } },
      env,
    );
    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    expect(await second.text()).toBe("");
  });

  it("supports search query q", async () => {
    await seedNews([
      { slug: "p1", titleZh: "BanG Dream 公告", publishedAt: 1 },
      { slug: "p2", titleZh: "其他", publishedAt: 2 },
    ]);
    const res = await createApp().request("https://x/api/news?q=BanG", {}, env);
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0].slug).toBe("p1");
  });

  it("search q does NOT match body_md — only title columns are scanned", async () => {
    // Row whose title does NOT contain 'uniqueterm' but body_md does.
    await seedNews([
      {
        slug: "body-only",
        titleZh: "普通标题",
        titleEn: "Normal title",
        bodyMd: "uniqueterm is buried in the body",
        publishedAt: 1,
      },
      {
        slug: "title-match",
        titleZh: "uniqueterm 在标题",
        titleEn: null,
        bodyMd: "body has nothing",
        publishedAt: 2,
      },
    ]);
    const res = await createApp().request("https://x/api/news?q=uniqueterm", {}, env);
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    // Only the title-match row should be returned; body-only must NOT match.
    expect(body.total).toBe(1);
    expect(body.items[0].slug).toBe("title-match");
  });

  it("parses tags_json into array on output", async () => {
    await seedNews([
      { slug: "p1", titleZh: "x", publishedAt: 1, tagsJson: '["a","b"]' },
    ]);
    const res = await createApp().request("https://x/api/news", {}, env);
    const body = (await res.json()) as { items: Array<{ tags: string[] }> };
    expect(body.items[0].tags).toEqual(["a", "b"]);
  });

  it("falls back to empty tags array on malformed tags_json", async () => {
    await seedNews([
      { slug: "p1", titleZh: "x", publishedAt: 1, tagsJson: "not-json" },
    ]);
    const res = await createApp().request("https://x/api/news", {}, env);
    const body = (await res.json()) as { items: Array<{ tags: string[] }> };
    expect(body.items[0].tags).toEqual([]);
  });
});

describe("GET /api/news/:slug", () => {
  it("returns single news post", async () => {
    await seedNews([{ slug: "hello", titleZh: "你好", publishedAt: 1 }]);
    const res = await createApp().request("https://x/api/news/hello", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    expect(res.headers.get("ETag")).toBeTruthy();
    const body = (await res.json()) as { slug: string; title_zh: string };
    expect(body.slug).toBe("hello");
    expect(body.title_zh).toBe("你好");
  });

  it("returns 404 when not found", async () => {
    const res = await createApp().request("https://x/api/news/missing", {}, env);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 when post is draft", async () => {
    await seedNews([{ slug: "secret", titleZh: "x", publishedAt: 1, draft: 1 }]);
    const res = await createApp().request("https://x/api/news/secret", {}, env);
    expect(res.status).toBe(404);
  });

  it("rejects slug exceeding 120-char length cap → 400", async () => {
    // Length-only validator (PR #82): only constraint is min(1)/max(120).
    // URL-reserved chars (/?#) get path-normalized before route matching so can't reach validator.
    const tooLong = "a".repeat(121);
    const res = await createApp().request(`https://x/api/news/${tooLong}`, {}, env);
    expect(res.status).toBe(400);
  });

  it("accepts CJK fullwidth punctuation in slug (regression: PR #82)", async () => {
    // U+FF5C (｜) FULLWIDTH VERTICAL LINE is \p{P} not \p{L}; old Unicode-letter-only
    // regex rejected legitimate stored slug 北美邦活动｜328-记录北美邦最长的一天.
    await seedNews([
      { slug: "北美邦活动｜328-x", titleZh: "测试", publishedAt: 1 },
    ]);
    const slug = encodeURIComponent("北美邦活动｜328-x");
    const res = await createApp().request(`https://x/api/news/${slug}`, {}, env);
    expect(res.status).toBe(200);
  });

  it("returns 304 on If-None-Match for single post", async () => {
    await seedNews([{ slug: "hello", titleZh: "x", publishedAt: 1 }]);
    const first = await createApp().request("https://x/api/news/hello", {}, env);
    const etag = first.headers.get("ETag")!;
    const second = await createApp().request(
      "https://x/api/news/hello",
      { headers: { "If-None-Match": etag } },
      env,
    );
    expect(second.status).toBe(304);
  });
});

async function seedEvents(rows: Array<Partial<typeof events.$inferInsert>>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(events)
      .values({
        slug: r.slug ?? "e",
        titleZh: r.titleZh ?? "活动",
        titleEn: r.titleEn ?? null,
        descriptionMd: r.descriptionMd ?? null,
        heroImageUrl: r.heroImageUrl ?? null,
        startAt: r.startAt ?? now,
        endAt: r.endAt ?? null,
        venue: r.venue ?? null,
        city: r.city ?? null,
        scope: r.scope ?? null,
        ticketUrl: r.ticketUrl ?? null,
        bandTheme: r.bandTheme ?? null,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
      })
      .run();
  }
}

describe("GET /api/events", () => {
  it("default scope=upcoming returns events with end_at >= now or null end_at and start_at >= now, asc by start", async () => {
    const now = Math.floor(Date.now() / 1000);
    await seedEvents([
      { slug: "past", startAt: now - 1000, endAt: now - 500 },
      { slug: "ongoing", startAt: now - 100, endAt: now + 1000 },
      { slug: "future-no-end", startAt: now + 2000, endAt: null },
      { slug: "future-no-end-but-passed", startAt: now - 5000, endAt: null },
    ]);
    const res = await createApp().request("https://x/api/events", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain("ongoing");
    expect(slugs).toContain("future-no-end");
    expect(slugs).not.toContain("past");
    expect(slugs).not.toContain("future-no-end-but-passed");
  });

  it("scope=past returns events with end_at < now, desc by start", async () => {
    const now = Math.floor(Date.now() / 1000);
    await seedEvents([
      { slug: "old1", startAt: now - 5000, endAt: now - 4000 },
      { slug: "old2", startAt: now - 3000, endAt: now - 2000 },
      { slug: "future", startAt: now + 1000, endAt: now + 2000 },
    ]);
    const res = await createApp().request("https://x/api/events?scope=past", {}, env);
    const body = (await res.json()) as { items: Array<{ slug: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.items.map((i) => i.slug)).toEqual(["old2", "old1"]);
  });

  it("scope=past also includes events with null end_at and past start_at", async () => {
    // Regression: events backfilled without an end time used to fall into a
    // filter gap — past required end_at, upcoming required future start_at, so
    // a past-start + null-end row appeared in neither response.
    const now = Math.floor(Date.now() / 1000);
    await seedEvents([
      { slug: "past-no-end", startAt: now - 1000, endAt: null },
      { slug: "past-with-end", startAt: now - 5000, endAt: now - 4000 },
      { slug: "future-no-end", startAt: now + 1000, endAt: null },
    ]);
    const past = await createApp().request("https://x/api/events?scope=past", {}, env);
    const pastBody = (await past.json()) as { items: Array<{ slug: string }>; total: number };
    expect(pastBody.items.map((i) => i.slug).sort()).toEqual(
      ["past-no-end", "past-with-end"].sort(),
    );

    const upcoming = await createApp().request("https://x/api/events?scope=upcoming", {}, env);
    const upcomingBody = (await upcoming.json()) as { items: Array<{ slug: string }>; total: number };
    expect(upcomingBody.items.map((i) => i.slug)).toEqual(["future-no-end"]);
  });

  it("rejects unknown scope → 400", async () => {
    const res = await createApp().request("https://x/api/events?scope=banana", {}, env);
    expect(res.status).toBe(400);
  });

  it("rejects limit > 100 → 400", async () => {
    const res = await createApp().request("https://x/api/events?limit=101", {}, env);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/events/:slug", () => {
  it("returns single event", async () => {
    await seedEvents([{ slug: "tour-2026", titleZh: "巡演", startAt: 1 }]);
    const res = await createApp().request("https://x/api/events/tour-2026", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string };
    expect(body.slug).toBe("tour-2026");
  });

  it("returns 404 when not found", async () => {
    const res = await createApp().request("https://x/api/events/missing", {}, env);
    expect(res.status).toBe(404);
  });

  it("rejects slug exceeding 120-char length cap → 400", async () => {
    const tooLong = "b".repeat(121);
    const res = await createApp().request(`https://x/api/events/${tooLong}`, {}, env);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/members", () => {
  it("returns all members sorted by display_name", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(members)
      .values([
        {
          displayName: "Zelda",
          city: null,
          oshiCharacter: null,
          oshiBand: null,
          avatarUrl: null,
          expeditionMember: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          displayName: "Ada",
          city: null,
          oshiCharacter: null,
          oshiBand: null,
          avatarUrl: null,
          expeditionMember: 1,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();
    const res = await createApp().request("https://x/api/members", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    const body = (await res.json()) as {
      items: Array<{ display_name: string; expedition_member: number }>;
      total: number;
    };
    expect(body.total).toBe(2);
    expect(body.items[0].display_name).toBe("Ada");
    expect(body.items[1].display_name).toBe("Zelda");
  });

  it("returns empty list when no members", async () => {
    const res = await createApp().request("https://x/api/members", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body).toEqual({ items: [], total: 0 });
  });
});

describe("GET /api/categories", () => {
  it("returns active categories sorted by sort_order then id", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(categories)
      .values([
        {
          slug: "release",
          displayZh: "发售",
          displayEn: "Release",
          accentColor: "#ff0",
          sortOrder: 2,
          active: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          slug: "announcement",
          displayZh: "公告",
          displayEn: "Announcement",
          accentColor: "#00f",
          sortOrder: 1,
          active: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          slug: "deprecated",
          displayZh: "旧",
          displayEn: null,
          accentColor: null,
          sortOrder: 0,
          active: 0,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();
    const res = await createApp().request("https://x/api/categories", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    expect(body.items.map((i) => i.slug)).toEqual(["announcement", "release"]);
  });
});

// ── R7: featured_posts / social_links / about_sections / site (settings) ────

async function seedFeaturedPost(rows: Array<Partial<typeof featuredPosts.$inferInsert>>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(featuredPosts)
      .values({
        slug: r.slug ?? "x",
        titleZh: r.titleZh ?? null,
        titleEn: r.titleEn ?? null,
        bodyMd: r.bodyMd ?? null,
        imageUrl: r.imageUrl ?? null,
        linkUrl: r.linkUrl ?? null,
        publishedAt: r.publishedAt ?? null,
        sortOrder: r.sortOrder ?? 0,
        active: r.active ?? 1,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
      })
      .run();
  }
}

async function seedSocialLink(rows: Array<Partial<typeof socialLinks.$inferInsert>>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(socialLinks)
      .values({
        platform: r.platform ?? "x",
        labelZh: r.labelZh ?? "label",
        labelEn: r.labelEn ?? null,
        url: r.url ?? "https://example.com",
        icon: r.icon ?? null,
        sortOrder: r.sortOrder ?? 0,
        active: r.active ?? 1,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
      })
      .run();
  }
}

async function seedAboutSection(rows: Array<Partial<typeof aboutSections.$inferInsert>>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(aboutSections)
      .values({
        slug: r.slug ?? "x",
        titleZh: r.titleZh ?? "title",
        titleEn: r.titleEn ?? null,
        bodyMd: r.bodyMd ?? "body",
        sortOrder: r.sortOrder ?? 0,
        active: r.active ?? 1,
        createdAt: r.createdAt ?? now,
        updatedAt: r.updatedAt ?? now,
      })
      .run();
  }
}

async function seedSettings(rows: Array<{ key: string; value: string }>) {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  for (const r of rows) {
    await db
      .insert(settings)
      .values({ key: r.key, value: r.value, updatedAt: now })
      .run();
  }
}

describe("Public /api/posts", () => {
  it("returns 200 with active rows sorted by sort_order", async () => {
    await seedFeaturedPost([
      { slug: "post-a", titleZh: "A", sortOrder: 5 },
      { slug: "post-b", titleZh: "B", sortOrder: 1 },
      { slug: "post-hidden", titleZh: "Hidden", active: 0 },
    ]);
    const res = await createApp().request("https://x/api/posts", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    expect(res.headers.get("ETag")).toBeTruthy();
    const body = (await res.json()) as {
      items: Array<{ slug: string }>;
      total: number;
    };
    expect(body.items.map((i) => i.slug)).toEqual(["post-b", "post-a"]);
    expect(body.total).toBe(2);
  });

  it("returns 304 when If-None-Match matches", async () => {
    await seedFeaturedPost([{ slug: "post-a" }]);
    const first = await createApp().request("https://x/api/posts", {}, env);
    const etag = first.headers.get("ETag");
    expect(etag).toBeTruthy();
    const second = await createApp().request(
      "https://x/api/posts",
      { headers: { "If-None-Match": etag! } },
      env,
    );
    expect(second.status).toBe(304);
  });
});

describe("Public /api/social", () => {
  it("returns 200 with active rows sorted", async () => {
    await seedSocialLink([
      { platform: "discord", labelZh: "Discord", sortOrder: 1 },
      { platform: "qq", labelZh: "QQ群", sortOrder: 0 },
      { platform: "wechat", labelZh: "微信", active: 0 },
    ]);
    const res = await createApp().request("https://x/api/social", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ platform: string }>;
      total: number;
    };
    expect(body.items.map((i) => i.platform)).toEqual(["qq", "discord"]);
    expect(body.total).toBe(2);
  });
});

describe("Public /api/about", () => {
  it("returns 200 with active sections sorted", async () => {
    await seedAboutSection([
      { slug: "join", titleZh: "加入", sortOrder: 10 },
      { slug: "mission", titleZh: "使命", sortOrder: 0 },
      { slug: "old", titleZh: "旧", active: 0 },
    ]);
    const res = await createApp().request("https://x/api/about", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ slug: string }>;
    };
    expect(body.items.map((i) => i.slug)).toEqual(["mission", "join"]);
  });
});

describe("Public /api/site", () => {
  it("returns 200 with site.* keys only", async () => {
    await seedSettings([
      { key: "site.communityName", value: "BanG Dream NA" },
      { key: "site.communityNameZh", value: "北美炸梦同好会" },
      { key: "webhook.comment.url", value: "https://hook.example/" },
    ]);
    const res = await createApp().request("https://x/api/site", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ key: string; value: string }>;
    };
    const keys = body.items.map((i) => i.key);
    expect(keys).toContain("site.communityName");
    expect(keys).toContain("site.communityNameZh");
    expect(keys).not.toContain("webhook.comment.url");
  });

  it("returns empty list when no site.* settings exist", async () => {
    const res = await createApp().request("https://x/api/site", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });
});
