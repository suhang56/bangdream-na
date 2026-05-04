import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import {
  comments,
  events,
  newsPosts,
  settings,
  users,
} from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";
const PUBLIC_CACHE = "public, max-age=15, s-maxage=15, stale-while-revalidate=60";

async function clearAll() {
  const db = getDb(env);
  await db.delete(comments).run();
  await db.delete(newsPosts).run();
  await db.delete(events).run();
  await db.delete(settings).run();
  await db.delete(users).run();
}

beforeEach(async () => {
  await clearAll();
  vi.restoreAllMocks();
});
afterEach(clearAll);

async function seedUser(role: "admin" | "member", uid?: number): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const idSuffix = uid ?? Math.floor(Math.random() * 1_000_000);
  const row = await db
    .insert(users)
    .values({
      githubLogin: `${role}-${idSuffix}`,
      githubId: idSuffix,
      role,
      displayName: `${role} ${idSuffix}`,
      avatarUrl: `https://avatars.com/${idSuffix}.png`,
      createdAt: now,
    })
    .returning({ id: users.id })
    .get();
  return row.id;
}

async function cookieFor(uid: number, role: "admin" | "member"): Promise<string> {
  const jwt = await signJwt(
    { uid, role, exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

async function seedNewsRow(slug: string): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(newsPosts)
    .values({
      slug,
      titleZh: "标题",
      titleEn: "Title",
      bodyMd: "body",
      category: "announcement",
      tagsJson: "[]",
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: newsPosts.id })
    .get();
  return row.id;
}

async function seedEventRow(slug: string): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(events)
    .values({
      slug,
      titleZh: "活动",
      titleEn: "Event",
      startAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: events.id })
    .get();
  return row.id;
}

async function seedComment(
  userId: number,
  newsId: number,
  body: string,
  opts: { parentId?: number | null; deleted?: boolean; createdAt?: number } = {},
): Promise<number> {
  const db = getDb(env);
  const now = opts.createdAt ?? Math.floor(Date.now() / 1000);
  const row = await db
    .insert(comments)
    .values({
      parentId: opts.parentId ?? null,
      targetKind: "news",
      targetId: newsId,
      userId,
      body,
      deleted: opts.deleted ? 1 : 0,
      deletedAt: opts.deleted ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: comments.id })
    .get();
  return row.id;
}

interface CommentApi {
  id: number;
  parent_id: number | null;
  body: string;
  deleted: number;
  user: { github_login: string; display_name: string | null } | null;
  replies: CommentApi[];
}

describe("GET /api/comments", () => {
  it("400 when targetKind/targetId missing or invalid", async () => {
    const res = await createApp().request("https://x/api/comments", {}, env);
    expect(res.status).toBe(400);
  });

  it("400 when targetKind not in enum", async () => {
    const res = await createApp().request(
      "https://x/api/comments?targetKind=bogus&targetId=1",
      {},
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns empty list with public cache headers + ETag + Vary", async () => {
    const newsId = await seedNewsRow("news-a");
    const res = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      {},
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    expect(res.headers.get("ETag")).toMatch(/^"[0-9a-f]{40}"$/);
    expect(res.headers.get("Vary")).toBe("Origin");
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body).toEqual({ items: [], total: 0 });
  });

  it("returns 304 when If-None-Match matches", async () => {
    const newsId = await seedNewsRow("news-a");
    const r1 = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      {},
      env,
    );
    const etag = r1.headers.get("ETag")!;
    const r2 = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      { headers: { "If-None-Match": etag } },
      env,
    );
    expect(r2.status).toBe(304);
  });

  it("threads replies under parent and shows [已删除] for soft-deleted bodies", async () => {
    const uid = await seedUser("member", 1);
    const newsId = await seedNewsRow("news-a");
    const root = await seedComment(uid, newsId, "原始评论", { createdAt: 100 });
    await seedComment(uid, newsId, "回复1", { parentId: root, createdAt: 200 });
    await seedComment(uid, newsId, "回复2", {
      parentId: root,
      createdAt: 300,
      deleted: true,
    });
    const root2 = await seedComment(uid, newsId, "顶层2", { createdAt: 400 });

    const res = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      {},
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: CommentApi[]; total: number };
    expect(body.items).toHaveLength(2);
    expect(body.total).toBe(4); // includes deleted row

    const [first, second] = body.items;
    expect(first.id).toBe(root);
    expect(first.replies).toHaveLength(2);
    expect(first.replies[0].body).toBe("回复1");
    expect(first.replies[1].body).toBe("[已删除]");
    expect(first.replies[1].deleted).toBe(1);
    expect(first.replies[1].user).toBeNull();
    expect(second.id).toBe(root2);
  });

  it("filters by targetKind and targetId — does not leak across targets", async () => {
    const uid = await seedUser("member", 1);
    const a = await seedNewsRow("a");
    const b = await seedNewsRow("b");
    await seedComment(uid, a, "for-a");
    await seedComment(uid, b, "for-b");

    const res = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${a}`,
      {},
      env,
    );
    const body = (await res.json()) as { items: CommentApi[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].body).toBe("for-a");
  });

  it("uses 'omit' credentials path: succeeds without cookie", async () => {
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      {},
      env,
    );
    expect(res.status).toBe(200);
  });

  it("displays user display_name in response when not deleted", async () => {
    const uid = await seedUser("member", 11);
    const newsId = await seedNewsRow("d");
    await seedComment(uid, newsId, "hi");
    const res = await createApp().request(
      `https://x/api/comments?targetKind=news&targetId=${newsId}`,
      {},
      env,
    );
    const body = (await res.json()) as { items: CommentApi[] };
    expect(body.items[0].user?.github_login).toMatch(/^member-/);
  });
});

describe("POST /api/comments", () => {
  it("401 without cookie", async () => {
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "hi",
        }),
      },
      env,
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("400 on invalid JSON", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: "not-json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 when body exceeds 4000 chars", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "x".repeat(4001),
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 when body empty", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 when target does not exist", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: 99999,
          body: "hi",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 on event target when event row missing", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "event",
          target_id: 99999,
          body: "hi",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("201 happy path: creates comment, returns row, no-store header", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "Hello",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as CommentApi;
    expect(body.body).toBe("Hello");
    expect(body.deleted).toBe(0);
    expect(body.user?.github_login).toMatch(/^member-/);
  });

  it("event target succeeds when event row exists", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const eventId = await seedEventRow("ev-a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "event",
          target_id: eventId,
          body: "Show pls",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("429 rate limit when same user posts within 10s", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    // Pre-seed a recent comment
    await seedComment(uid, newsId, "first");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "second",
        }),
      },
      env,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("10");
    const body = (await res.json()) as { error: string; retry_after: number };
    expect(body.error).toBe("rate_limited");
  });

  it("rate limit window only blocks within 10s — older comments don't count", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    // 30s ago — outside window
    const long = Math.floor(Date.now() / 1000) - 30;
    await seedComment(uid, newsId, "old", { createdAt: long });
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "fresh",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("rate limit is per-user (different user not blocked)", async () => {
    const uid1 = await seedUser("member", 1);
    const uid2 = await seedUser("member", 2);
    const cookie2 = await cookieFor(uid2, "member");
    const newsId = await seedNewsRow("a");
    await seedComment(uid1, newsId, "by-1");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie2 },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "by-2",
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
  });

  it("400 when parent_id is missing/invalid", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          parent_id: 99999,
          target_kind: "news",
          target_id: newsId,
          body: "reply",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 when parent_id belongs to a different target", async () => {
    const uid = await seedUser("member", 1);
    const cookie = await cookieFor(uid, "member");
    const a = await seedNewsRow("a");
    const b = await seedNewsRow("b");
    const parent = await seedComment(uid, a, "in a");
    // Bypass rate limit — wait by inserting via raw seed for new user
    const uid2 = await seedUser("member", 2);
    const cookie2 = await cookieFor(uid2, "member");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie2 },
        body: JSON.stringify({
          parent_id: parent,
          target_kind: "news",
          target_id: b,
          body: "wrong target",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    void cookie;
  });

  it("400 when parent_id is itself deleted", async () => {
    const uid = await seedUser("member", 1);
    const newsId = await seedNewsRow("a");
    const parent = await seedComment(uid, newsId, "gone", { deleted: true });
    const uid2 = await seedUser("member", 2);
    const cookie2 = await cookieFor(uid2, "member");
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie2 },
        body: JSON.stringify({
          parent_id: parent,
          target_kind: "news",
          target_id: newsId,
          body: "reply",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("fires webhook via waitUntil when settings url is configured", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");

    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(settings)
      .values({
        key: "webhook.comment.url",
        value: "https://discord.com/api/webhooks/1/abc",
        updatedAt: now,
      })
      .run();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "Hi webhook",
        }),
      },
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl).toBe("https://discord.com/api/webhooks/1/abc");
    expect((calledInit as RequestInit).method).toBe("POST");
    const calledBody = JSON.parse((calledInit as RequestInit).body as string);
    expect(calledBody.embeds).toBeDefined();
    fetchSpy.mockRestore();
  });

  it("does not fire webhook and does not error when settings URL is missing", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "no webhook",
        }),
      },
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("skips webhook when stored URL fails validation (e.g. http://)", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");

    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(settings)
      .values({
        key: "webhook.comment.url",
        value: "http://insecure.example.com/hook",
        updatedAt: now,
      })
      .run();

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "skip me",
        }),
      },
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not fail comment write when webhook fetch throws", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");

    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(settings)
      .values({
        key: "webhook.comment.url",
        value: "https://discord.com/api/webhooks/1/abc",
        updatedAt: now,
      })
      .run();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/comments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          target_kind: "news",
          target_id: newsId,
          body: "still saved",
        }),
      },
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("DELETE /api/comments/:id", () => {
  it("401 without cookie", async () => {
    const uid = await seedUser("member");
    const newsId = await seedNewsRow("a");
    const cId = await seedComment(uid, newsId, "x");
    const res = await createApp().request(
      `https://x/api/comments/${cId}`,
      { method: "DELETE" },
      env,
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("404 when comment doesn't exist", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const res = await createApp().request(
      "https://x/api/comments/99999",
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("400 on bad id param", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const res = await createApp().request(
      "https://x/api/comments/abc",
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("403 when non-author non-admin tries to delete", async () => {
    const uid1 = await seedUser("member", 1);
    const uid2 = await seedUser("member", 2);
    const cookie2 = await cookieFor(uid2, "member");
    const newsId = await seedNewsRow("a");
    const cId = await seedComment(uid1, newsId, "by-1");
    const res = await createApp().request(
      `https://x/api/comments/${cId}`,
      { method: "DELETE", headers: { Cookie: cookie2 } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("204 when author deletes own comment (soft delete)", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const cId = await seedComment(uid, newsId, "mine");
    const res = await createApp().request(
      `https://x/api/comments/${cId}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(204);
    const db = getDb(env);
    const row = await db.select().from(comments).where(eq(comments.id, cId)).get();
    expect(row?.deleted).toBe(1);
    expect(row?.deletedAt).toBeGreaterThan(0);
    expect(row?.body).toBe("mine"); // body preserved on disk
  });

  it("204 when admin deletes someone else's comment", async () => {
    const memberUid = await seedUser("member", 1);
    const adminUid = await seedUser("admin", 2);
    const cookie = await cookieFor(adminUid, "admin");
    const newsId = await seedNewsRow("a");
    const cId = await seedComment(memberUid, newsId, "by-member");
    const res = await createApp().request(
      `https://x/api/comments/${cId}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(204);
  });

  it("204 idempotent when comment already deleted", async () => {
    const uid = await seedUser("member");
    const cookie = await cookieFor(uid, "member");
    const newsId = await seedNewsRow("a");
    const cId = await seedComment(uid, newsId, "x", { deleted: true });
    const res = await createApp().request(
      `https://x/api/comments/${cId}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(204);
  });
});
