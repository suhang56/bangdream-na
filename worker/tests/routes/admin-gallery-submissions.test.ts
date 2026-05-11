import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import {
  emailAggregations,
  events,
  galleryItems,
  gallerySubmissions,
  users,
} from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

async function seedUser(role: "admin" | "member", login: string, githubId: number): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(users)
    .values({ githubLogin: login, githubId, role, createdAt: now })
    .returning({ id: users.id })
    .get();
  return row.id;
}

async function adminCookie(): Promise<{ cookie: string; userId: number }> {
  const uid = await seedUser("admin", `admin-${Math.random()}`, Math.floor(Math.random() * 1_000_000));
  const jwt = await signJwt(
    { uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return { cookie: `${SESSION_COOKIE}=${jwt}`, userId: uid };
}

async function memberCookie(): Promise<string> {
  const uid = await seedUser("member", `m-${Math.random()}`, Math.floor(Math.random() * 1_000_000));
  const jwt = await signJwt(
    { uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

async function seedSubmission(opts: {
  status?: "pending" | "approved" | "rejected";
  withFile?: boolean;
  r2KeySuffix?: string;
  submittedAtOffset?: number;
}): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const suffix = opts.r2KeySuffix ?? `${now}-${Math.random()}`.replace(".", "");
  const r2Key = `submissions/${suffix}.jpg`;
  if (opts.withFile !== false) {
    await env.IMAGES.put(r2Key, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "private, no-store" },
    });
  }
  const row = await getDb(env)
    .insert(gallerySubmissions)
    .values({
      r2Key,
      nickname: "alice",
      caption: "a caption",
      eventId: null,
      status: opts.status ?? "pending",
      submittedAt: now + (opts.submittedAtOffset ?? 0),
      ipHash: "ab".repeat(16),
      uaHash: "cd".repeat(16),
      width: 800,
      height: 600,
      sizeBytes: 12345,
      contentType: "image/jpeg",
    })
    .returning({ id: gallerySubmissions.id })
    .get();
  return row.id;
}

beforeEach(async () => {
  await getDb(env).delete(gallerySubmissions).run();
  await getDb(env).delete(galleryItems).run();
  await getDb(env).delete(emailAggregations).run();
  await getDb(env).delete(events).run();
  await getDb(env).delete(users).run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Admin gallery submissions — auth gating", () => {
  it("GET list returns 401 without session", async () => {
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions",
      { method: "GET" },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("GET list returns 403 for member role", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("approve returns 401 without session", async () => {
    const sid = await seedSubmission({});
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/approve`,
      { method: "POST" },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("reject returns 401 without session", async () => {
    const sid = await seedSubmission({});
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "bad" }),
        headers: { "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/gallery/submissions", () => {
  it("lists only pending by default", async () => {
    await seedSubmission({ status: "pending", submittedAtOffset: -10 });
    await seedSubmission({ status: "approved", submittedAtOffset: -20 });
    await seedSubmission({ status: "rejected", submittedAtOffset: -30 });
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { id: number; status: string }[];
      next_cursor: string | null;
    };
    expect(body.items.every((i) => i.status === "pending")).toBe(true);
    expect(body.items).toHaveLength(1);
  });

  it("filters by status=approved", async () => {
    await seedSubmission({ status: "approved" });
    await seedSubmission({ status: "pending" });
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions?status=approved",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    const body = (await res.json()) as { items: { status: string }[] };
    expect(body.items.every((i) => i.status === "approved")).toBe(true);
  });

  it("returns thumbnail_url with CDN_ORIGIN prefix", async () => {
    await seedSubmission({});
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    const body = (await res.json()) as { items: { thumbnail_url: string }[] };
    expect(body.items[0].thumbnail_url).toMatch(/^https:\/\/cdn\.bangdream\.org\/submissions\//);
  });

  it("paginates via keyset cursor", async () => {
    // Seed 3 with distinct timestamps.
    for (let i = 0; i < 3; i += 1) {
      await seedSubmission({ submittedAtOffset: -i });
    }
    const { cookie } = await adminCookie();
    const first = await createApp().request(
      "https://x/api/admin/gallery/submissions?limit=2",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    const firstBody = (await first.json()) as {
      items: { id: number }[];
      next_cursor: string | null;
    };
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.next_cursor).not.toBeNull();
    const second = await createApp().request(
      `https://x/api/admin/gallery/submissions?limit=2&cursor=${encodeURIComponent(firstBody.next_cursor!)}`,
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    const secondBody = (await second.json()) as { items: { id: number }[] };
    expect(secondBody.items.length).toBeGreaterThan(0);
    // Cursor must NOT repeat first-page rows.
    const firstIds = new Set(firstBody.items.map((i) => i.id));
    for (const item of secondBody.items) {
      expect(firstIds.has(item.id)).toBe(false);
    }
  });

  it("returns 400 on invalid status param", async () => {
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions?status=invalid",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/gallery/submissions/stats", () => {
  it("returns counts grouped by status", async () => {
    await seedSubmission({ status: "pending" });
    await seedSubmission({ status: "pending" });
    await seedSubmission({ status: "approved" });
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions/stats",
      { method: "GET", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      pending: number;
      approved_24h: number;
      rejected_24h: number;
    };
    expect(body.pending).toBe(2);
    expect(body.approved_24h).toBe(1);
    expect(body.rejected_24h).toBe(0);
  });
});

describe("POST /api/admin/gallery/submissions/:id/approve", () => {
  it("moves R2 key from submissions/ to gallery/ and inserts gallery_items row", async () => {
    const sid = await seedSubmission({});
    const before = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, sid))
      .get();
    expect(before!.r2Key).toMatch(/^submissions\//);
    const oldKey = before!.r2Key;

    const { cookie, userId } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/approve`,
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      submission_id: number;
      gallery_item_id: number;
      new_r2_key: string;
    };
    expect(body.submission_id).toBe(sid);
    expect(body.new_r2_key).toMatch(/^gallery\//);

    // R2: old key gone, new key present
    const oldR2 = await env.IMAGES.head(oldKey);
    expect(oldR2).toBeNull();
    const newR2 = await env.IMAGES.head(body.new_r2_key);
    expect(newR2).not.toBeNull();
    expect(newR2!.httpMetadata?.cacheControl).toBe("public, max-age=31536000, immutable");

    // D1
    const after = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, sid))
      .get();
    expect(after!.status).toBe("approved");
    expect(after!.r2Key).toBe(body.new_r2_key);
    expect(after!.reviewedBy).toBe(userId);
    expect(after!.galleryItemId).toBe(body.gallery_item_id);

    const galleryRow = await getDb(env)
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.id, body.gallery_item_id))
      .get();
    expect(galleryRow).toBeTruthy();
    expect(galleryRow!.imageUrl).toContain(body.new_r2_key);
    expect(galleryRow!.album).toBe("submissions");
  });

  it("returns 404 when submission id does not exist", async () => {
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/submissions/99999/approve",
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when submission already approved", async () => {
    const sid = await seedSubmission({ status: "approved" });
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/approve`,
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(409);
  });

  it("rolls back R2 new key when gallery_items insert fails", async () => {
    const sid = await seedSubmission({});
    const { cookie } = await adminCookie();

    // Force gallery_items INSERT to fail by mocking D1 to throw on the second
    // mutation. We spy on D1.batch / prepare; easier: spy IMAGES.put to capture
    // new key, then force the D1 insert via a transient FK violation by deleting
    // the submission row mid-flight. Practical alternative: spy on getDb's insert.
    // Simpler: insert a duplicate gallery_items row collision via unique constraint —
    // but gallery_items has no unique constraint on image_url. Use approach:
    // spy on D1.prepare to throw when SQL includes 'INSERT INTO gallery_items'.
    const realPrepare = env.DB.prepare.bind(env.DB);
    const prepareSpy = vi.spyOn(env.DB, "prepare").mockImplementation((sql: string) => {
      if (typeof sql === "string" && sql.includes('gallery_items') && sql.includes('insert')) {
        // case-insensitive match
      }
      if (typeof sql === "string" && /insert\s+into\s+["`]?gallery_items/i.test(sql)) {
        throw new Error("simulated d1 failure");
      }
      return realPrepare(sql);
    });

    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/approve`,
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(500);
    prepareSpy.mockRestore();

    // Verify R2 rollback: no `gallery/` key with this UUID should remain.
    const list = await env.IMAGES.list({ prefix: "gallery/" });
    for (const obj of list.objects) {
      if (obj.key.includes(`/${sid}.`)) {
        throw new Error(`leftover R2 ${obj.key}`);
      }
    }
    // Original submission row remains pending (no D1 update on rollback path).
    const row = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, sid))
      .get();
    expect(row!.status).toBe("pending");
  });
});

describe("POST /api/admin/gallery/submissions/:id/reject", () => {
  it("deletes R2 object, updates D1 status to rejected, persists reason", async () => {
    const sid = await seedSubmission({});
    const before = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, sid))
      .get();
    const oldKey = before!.r2Key;

    const { cookie, userId } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "图片模糊或质量不佳" }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(200);
    const r2Head = await env.IMAGES.head(oldKey);
    expect(r2Head).toBeNull();
    const after = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, sid))
      .get();
    expect(after!.status).toBe("rejected");
    expect(after!.rejectionReason).toBe("图片模糊或质量不佳");
    expect(after!.reviewedBy).toBe(userId);
  });

  it("returns 400 when reason is missing", async () => {
    const sid = await seedSubmission({});
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 for reason exactly 200 chars", async () => {
    const sid = await seedSubmission({});
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "x".repeat(200) }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 for reason 201 chars", async () => {
    const sid = await seedSubmission({});
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "x".repeat(201) }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when already reviewed", async () => {
    const sid = await seedSubmission({ status: "rejected" });
    const { cookie } = await adminCookie();
    const res = await createApp().request(
      `https://x/api/admin/gallery/submissions/${sid}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "bad" }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(409);
  });
});
