import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import { settings, users } from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

async function clearAll() {
  const db = getDb(env);
  await db.delete(settings).run();
  await db.delete(users).run();
}

beforeEach(async () => {
  await clearAll();
  vi.restoreAllMocks();
});
afterEach(clearAll);

async function seedUser(role: "admin" | "member"): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const idSuffix = role === "admin" ? 100 : 200;
  const row = await db
    .insert(users)
    .values({
      githubLogin: `${role}-u`,
      githubId: idSuffix,
      role,
      displayName: `${role} u`,
      avatarUrl: null,
      createdAt: now,
    })
    .returning({ id: users.id })
    .get();
  return row.id;
}

async function adminCookie(): Promise<string> {
  const uid = await seedUser("admin");
  const jwt = await signJwt(
    { uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

async function memberCookie(): Promise<string> {
  const uid = await seedUser("member");
  const jwt = await signJwt(
    { uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

describe("Admin /api/admin/settings/:key", () => {
  it("401 on GET without cookie", async () => {
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {},
      env,
    );
    expect(res.status).toBe(401);
  });

  it("403 on GET as member", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("404 when key missing", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/missing.key",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("400 on invalid key format", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/BAD%20KEY",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("PUT then GET round-trips value with no-store header", async () => {
    const cookie = await adminCookie();
    const url = "https://discord.com/api/webhooks/1/abc";
    const put = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: url }),
      },
      env,
    );
    expect(put.status).toBe(200);
    expect(put.headers.get("Cache-Control")).toBe("no-store");
    const putBody = (await put.json()) as { key: string; value: string };
    expect(putBody.value).toBe(url);

    const get = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(get.status).toBe(200);
    expect(get.headers.get("Cache-Control")).toBe("no-store");
    const getBody = (await get.json()) as { key: string; value: string };
    expect(getBody.value).toBe(url);
  });

  it("PUT upserts existing value", async () => {
    const cookie = await adminCookie();
    await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "https://a.com/1" }),
      },
      env,
    );
    const put2 = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "https://b.com/2" }),
      },
      env,
    );
    expect(put2.status).toBe(200);
    const body = (await put2.json()) as { value: string };
    expect(body.value).toBe("https://b.com/2");
  });

  it("400 on PUT invalid JSON", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("400 on PUT body missing value", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("403 PUT as member", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "https://x.com" }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("422 PUT webhook.comment.url with http:// URL", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "http://insecure.example.com/hook" }),
      },
      env,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("webhook_url_invalid");
  });

  it("422 PUT webhook.comment.url with javascript: scheme", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "javascript:alert(1)" }),
      },
      env,
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("webhook_url_invalid");
  });

  it("200 PUT webhook.comment.url with valid https:// URL", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/webhook.comment.url",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "https://discord.com/api/webhooks/1/abc" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { value: string };
    expect(body.value).toBe("https://discord.com/api/webhooks/1/abc");
  });

  it("200 PUT non-webhook key with any string value (no URL validation)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/site.communityName",
      {
        method: "PUT",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ value: "BanG Dream NA" }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/settings/test-webhook", () => {
  it("401 without cookie", async () => {
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      { method: "POST" },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("403 as member", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("422 when no settings url and no override url provided", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(422);
  });

  it("422 when settings url is invalid (http://)", async () => {
    const cookie = await adminCookie();
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(settings)
      .values({
        key: "webhook.comment.url",
        value: "http://insecure.com/h",
        updatedAt: now,
      })
      .run();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(422);
  });

  it("200 + fires webhook via waitUntil with stored URL", async () => {
    const cookie = await adminCookie();
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
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      { method: "POST", headers: { Cookie: cookie } },
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("200 + fires with override URL even when no settings stored", async () => {
    const cookie = await adminCookie();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const ctx = createExecutionContext();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://discord.com/api/webhooks/9/zzz" }),
      },
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    await waitOnExecutionContext(ctx);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/9/zzz",
      expect.objectContaining({ method: "POST" }),
    );
    fetchSpy.mockRestore();
  });

  it("400 when override URL is http:// (webhookTestBody schema rejects non-https)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings/test-webhook",
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ url: "http://nope.com" }),
      },
      env,
    );
    // http:// is rejected at schema validation level → 400 with validation detail.
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail: unknown };
    expect(body.error).toBe("bad_request");
  });
});

describe("Admin GET /api/admin/settings?prefix=", () => {
  it("returns 401 without cookie", async () => {
    const res = await createApp().request(
      "https://x/api/admin/settings?prefix=site.",
      {},
      env,
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for member role", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings?prefix=site.",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("returns matching keys sorted, excludes other prefixes", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(settings)
      .values([
        { key: "site.communityName", value: "BanG NA", updatedAt: now },
        { key: "site.communityNameZh", value: "北美邦", updatedAt: now },
        { key: "webhook.comment.url", value: "https://hook/", updatedAt: now },
      ])
      .run();
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/settings?prefix=site.",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ key: string; value: string }>;
    };
    expect(body.items.map((i) => i.key)).toEqual([
      "site.communityName",
      "site.communityNameZh",
    ]);
  });

  it("returns 400 for missing or invalid prefix", async () => {
    const cookie = await adminCookie();
    const empty = await createApp().request(
      "https://x/api/admin/settings",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(empty.status).toBe(400);
    const bad = await createApp().request(
      "https://x/api/admin/settings?prefix=*",
      { headers: { Cookie: cookie } },
      env,
    );
    expect(bad.status).toBe(400);
  });
});
