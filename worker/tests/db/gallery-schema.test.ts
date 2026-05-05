import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../../src/db/client";
import { events, galleryItems } from "../../src/db/schema";

async function clearAll() {
  const db = getDb(env);
  await db.delete(galleryItems).run();
  await db.delete(events).run();
}

beforeEach(clearAll);
afterEach(clearAll);

async function seedEvent(slug: string, titleZh: string): Promise<number> {
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

describe("gallery_items schema", () => {
  it("INSERT with NULL event_id + NULL album triggers CHECK constraint", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await expect(
      db
        .insert(galleryItems)
        .values({
          imageUrl: "https://cdn/x.jpg",
          eventId: null,
          album: null,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run(),
    ).rejects.toThrow(/CHECK/i);
  });

  it("INSERT valid event-only row succeeds", async () => {
    const db = getDb(env);
    const eid = await seedEvent("e1", "T1");
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        eventId: eid,
        album: null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const rows = await db.select().from(galleryItems).all();
    expect(rows).toHaveLength(1);
  });

  it("INSERT valid album-only row succeeds", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        eventId: null,
        album: "free",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const rows = await db.select().from(galleryItems).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].album).toBe("free");
  });

  it("DELETE event referenced by gallery row: trigger copies title_zh into album BEFORE FK SET NULL", async () => {
    const db = getDb(env);
    const eid = await seedEvent("doomed", "毁灭活动");
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        eventId: eid,
        album: null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    await db.delete(events).where(eq(events.id, eid)).run();

    const rows = await db.select().from(galleryItems).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].eventId).toBeNull();
    expect(rows[0].album).toBe("毁灭活动");
  });

  it("DELETE event when row already has album: COALESCE preserves existing album", async () => {
    const db = getDb(env);
    const eid = await seedEvent("doomed2", "弃用活动");
    const now = Math.floor(Date.now() / 1000);
    await db
      .insert(galleryItems)
      .values({
        imageUrl: "https://cdn/x.jpg",
        eventId: eid,
        album: "user-set-album",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    await db.delete(events).where(eq(events.id, eid)).run();

    const rows = await db.select().from(galleryItems).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].eventId).toBeNull();
    expect(rows[0].album).toBe("user-set-album");
  });
});
