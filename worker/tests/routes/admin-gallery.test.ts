import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import { events, galleryItems, users } from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

async function clearAll() {
  const db = getDb(env);
  await db.delete(galleryItems).run();
  await db.delete(events).run();
  await db.delete(users).run();
}

beforeEach(clearAll);
afterEach(clearAll);

async function seedUser(role: "admin" | "member"): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const login = role === "admin" ? "admin-u" : "member-u";
  const ghId = role === "admin" ? 200 : 201;
  const row = await db
    .insert(users)
    .values({ githubLogin: login, githubId: ghId, role, createdAt: now })
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

function adminHeaders(cookie: string): HeadersInit {
  return { Cookie: cookie, "Content-Type": "application/json" };
}

async function seedEvent(slug = "e1"): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(events)
    .values({
      slug,
      titleZh: `事件-${slug}`,
      titleEn: null,
      descriptionMd: null,
      heroImageUrl: null,
      startAt: now,
      endAt: null,
      venue: null,
      city: null,
      scope: null,
      ticketUrl: null,
      bandTheme: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: events.id })
    .get();
  return row.id;
}

const VALID_EVENT_ITEM = (eventId: number) => ({
  image_url: "https://cdn.bangdream.org/gallery/x.jpg",
  caption: "图片说明",
  taken_at: 1700000000,
  event_id: eventId,
  sort_order: 0,
});

const VALID_ALBUM_ITEM = {
  image_url: "https://cdn.bangdream.org/gallery/y.jpg",
  caption: null,
  taken_at: null,
  album: "free-album",
  sort_order: 0,
};

describe("Admin /api/admin/gallery POST", () => {
  it("returns 401 without cookie", async () => {
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_ALBUM_ITEM),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for member (non-admin)", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify(VALID_ALBUM_ITEM),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  it("creates an event-linked row", async () => {
    const eid = await seedEvent();
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify(VALID_EVENT_ITEM(eid)),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; event_id: number; album: string | null };
    expect(body.event_id).toBe(eid);
    expect(body.album).toBeNull();
  });

  it("creates an album-only row", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify(VALID_ALBUM_ITEM),
      },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; album: string; event_id: number | null };
    expect(body.album).toBe("free-album");
    expect(body.event_id).toBeNull();
  });

  it("returns 400 when both event_id and album are missing (zod refine)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify({
          image_url: "https://cdn/x.jpg",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("returns 400 when event_id references nonexistent event (FK)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ ...VALID_EVENT_ITEM(99999) }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("event_id_not_found");
  });

  it("returns 400 for image_url length 0", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ ...VALID_ALBUM_ITEM, image_url: "" }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for image_url > 500 chars", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery",
      {
        method: "POST",
        headers: adminHeaders(cookie),
        body: JSON.stringify({
          ...VALID_ALBUM_ITEM,
          image_url: `https://x/${"a".repeat(501)}`,
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("Admin /api/admin/gallery PUT", () => {
  async function createOne(): Promise<number> {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    const row = await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        caption: null,
        takenAt: null,
        eventId: null,
        album: "init-album",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: galleryItems.id })
      .get();
    return row.id;
  }

  it("partial update (caption only)", async () => {
    const cookie = await adminCookie();
    const id = await createOne();
    const res = await createApp().request(
      `https://x/api/admin/gallery/${id}`,
      {
        method: "PUT",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ caption: "new caption" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { caption: string; album: string };
    expect(body.caption).toBe("new caption");
    expect(body.album).toBe("init-album");
  });

  it("returns 404 for unknown id", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/99999",
      {
        method: "PUT",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ caption: "x" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("PUT setting both event_id=null and album=null trips DB CHECK → 400", async () => {
    const cookie = await adminCookie();
    const id = await createOne();
    const res = await createApp().request(
      `https://x/api/admin/gallery/${id}`,
      {
        method: "PUT",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ event_id: null, album: null }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_group");
  });

  it("PUT with FK violation maps to 400 event_id_not_found", async () => {
    const cookie = await adminCookie();
    const id = await createOne();
    const res = await createApp().request(
      `https://x/api/admin/gallery/${id}`,
      {
        method: "PUT",
        headers: adminHeaders(cookie),
        body: JSON.stringify({ event_id: 99999 }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("event_id_not_found");
  });
});

describe("Admin /api/admin/gallery DELETE", () => {
  it("204 happy path", async () => {
    const cookie = await adminCookie();
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        album: "a",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: galleryItems.id })
      .get();
    const res = await createApp().request(
      `https://x/api/admin/gallery/${inserted.id}`,
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(204);
    const remaining = await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.id, inserted.id))
      .get();
    expect(remaining).toBeUndefined();
  });

  it("404 for unknown id", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/admin/gallery/99999",
      { method: "DELETE", headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(404);
  });
});
