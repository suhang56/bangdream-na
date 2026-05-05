import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../src/db/client";
import { events, galleryItems } from "../../src/db/schema";
import { createApp } from "../../src/index";

const PUBLIC_CACHE = "public, max-age=15, s-maxage=15, stale-while-revalidate=60";

async function clearAll() {
  const db = getDb(env);
  await db.delete(galleryItems).run();
  await db.delete(events).run();
}

beforeEach(clearAll);
afterEach(clearAll);

async function seedEvent(
  slug: string,
  titleZh = `事件-${slug}`,
): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(events)
    .values({
      slug,
      titleZh,
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

interface SeedItem {
  imageUrl?: string;
  caption?: string | null;
  takenAt?: number | null;
  eventId?: number | null;
  album?: string | null;
  sortOrder?: number;
  createdAt?: number;
}

async function seedItems(items: SeedItem[]): Promise<void> {
  const db = getDb(env);
  const base = Math.floor(Date.now() / 1000);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await db
      .insert(galleryItems)
      .values({
        imageUrl: it.imageUrl ?? `https://cdn.bangdream.org/gallery/x-${i}.jpg`,
        caption: it.caption ?? null,
        takenAt: it.takenAt ?? null,
        eventId: it.eventId ?? null,
        album: it.album ?? null,
        sortOrder: it.sortOrder ?? 0,
        createdAt: it.createdAt ?? base + i,
        updatedAt: it.createdAt ?? base + i,
      })
      .run();
  }
}

describe("GET /api/gallery", () => {
  it("returns empty list with public cache headers + ETag + Vary", async () => {
    const res = await createApp().request("https://x/api/gallery", {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    expect(res.headers.get("ETag")).toMatch(/^"[0-9a-f]{40}"$/);
    expect(res.headers.get("Vary")).toBe("Origin");
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body).toEqual({ items: [], total: 0 });
  });

  it("returns items with denormalized event_slug + event_title_zh", async () => {
    const eid = await seedEvent("west-coast-meet", "西海岸聚会");
    await seedItems([
      { imageUrl: "https://cdn/x/a.jpg", eventId: eid, takenAt: 1000 },
      { imageUrl: "https://cdn/x/b.jpg", album: "free-album", takenAt: 2000 },
    ]);
    const res = await createApp().request("https://x/api/gallery", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{
        image_url: string;
        event_id: number | null;
        event_slug: string | null;
        event_title_zh: string | null;
        album: string | null;
      }>;
      total: number;
    };
    expect(body.total).toBe(2);
    const eventLinked = body.items.find((i) => i.event_id === eid);
    expect(eventLinked?.event_slug).toBe("west-coast-meet");
    expect(eventLinked?.event_title_zh).toBe("西海岸聚会");
    const albumOnly = body.items.find((i) => i.album === "free-album");
    expect(albumOnly?.event_slug).toBeNull();
    expect(albumOnly?.event_title_zh).toBeNull();
  });

  it("filters by event_id", async () => {
    const eid1 = await seedEvent("e1");
    const eid2 = await seedEvent("e2");
    await seedItems([
      { eventId: eid1, takenAt: 1000 },
      { eventId: eid2, takenAt: 2000 },
      { eventId: eid1, takenAt: 3000 },
    ]);
    const res = await createApp().request(
      `https://x/api/gallery?event_id=${eid1}`,
      {},
      env,
    );
    const body = (await res.json()) as { items: Array<{ event_id: number }>; total: number };
    expect(body.total).toBe(2);
    expect(body.items.every((i) => i.event_id === eid1)).toBe(true);
  });

  it("filters by album", async () => {
    await seedItems([
      { album: "free-a", takenAt: 1000 },
      { album: "free-b", takenAt: 2000 },
      { album: "free-a", takenAt: 3000 },
    ]);
    const res = await createApp().request(
      "https://x/api/gallery?album=free-a",
      {},
      env,
    );
    const body = (await res.json()) as { items: Array<{ album: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.items.every((i) => i.album === "free-a")).toBe(true);
  });

  it("filters by event_id + album intersection", async () => {
    const eid = await seedEvent("e1");
    await seedItems([
      { eventId: eid, album: "match-album", takenAt: 1000 },
      { eventId: eid, album: "other-album", takenAt: 2000 },
      { album: "match-album", takenAt: 3000 },
    ]);
    const res = await createApp().request(
      `https://x/api/gallery?event_id=${eid}&album=match-album`,
      {},
      env,
    );
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.total).toBe(1);
  });

  it("sort order: NULL taken_at last; non-NULL taken_at DESC; created_at DESC tiebreak", async () => {
    await seedItems([
      { imageUrl: "https://cdn/null-old.jpg", album: "a", takenAt: null, createdAt: 100 },
      { imageUrl: "https://cdn/null-new.jpg", album: "a", takenAt: null, createdAt: 200 },
      { imageUrl: "https://cdn/has-old.jpg", album: "a", takenAt: 1000, createdAt: 300 },
      { imageUrl: "https://cdn/has-new.jpg", album: "a", takenAt: 2000, createdAt: 400 },
    ]);
    const res = await createApp().request("https://x/api/gallery", {}, env);
    const body = (await res.json()) as { items: Array<{ image_url: string }>; total: number };
    expect(body.items.map((i) => i.image_url)).toEqual([
      "https://cdn/has-new.jpg",
      "https://cdn/has-old.jpg",
      "https://cdn/null-new.jpg",
      "https://cdn/null-old.jpg",
    ]);
  });

  it("ETag round-trip: 304 on If-None-Match match", async () => {
    await seedItems([{ album: "x", takenAt: 1 }]);
    const res1 = await createApp().request("https://x/api/gallery", {}, env);
    const etag = res1.headers.get("ETag");
    expect(etag).toBeTruthy();
    const res2 = await createApp().request(
      "https://x/api/gallery",
      { headers: { "If-None-Match": etag! } },
      env,
    );
    expect(res2.status).toBe(304);
    expect(await res2.text()).toBe("");
  });

  it("rejects bad event_id (non-numeric)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery?event_id=abc",
      {},
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("rejects limit > 100 via zod max", async () => {
    const res = await createApp().request(
      "https://x/api/gallery?limit=999",
      {},
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/gallery/by-event/:slug", () => {
  it("happy path returns event-scoped items + event metadata", async () => {
    const eid = await seedEvent("west-coast-meet", "西海岸聚会");
    await seedItems([
      { eventId: eid, takenAt: 1000 },
      { eventId: eid, takenAt: 2000 },
    ]);
    const res = await createApp().request(
      "https://x/api/gallery/by-event/west-coast-meet",
      {},
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      event: { id: number; slug: string; title_zh: string };
    };
    expect(body.total).toBe(2);
    expect(body.event.slug).toBe("west-coast-meet");
    expect(body.event.title_zh).toBe("西海岸聚会");
  });

  it("returns 404 for unknown slug", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/by-event/nope",
      {},
      env,
    );
    expect(res.status).toBe(404);
  });

  it("rejects malformed slug param", async () => {
    const res = await createApp().request(
      `https://x/api/gallery/by-event/${"x".repeat(200)}`,
      {},
      env,
    );
    expect(res.status).toBe(400);
  });
});
