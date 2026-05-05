import { Hono, type Context } from "hono";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { getDb } from "../db/client";
import { events, galleryItems } from "../db/schema";
import { galleryListQuery, slugParam } from "../utils/validate";
import { respondPublic } from "../utils/respond";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

interface GalleryItemOut {
  id: number;
  image_url: string;
  caption: string | null;
  taken_at: number | null;
  event_id: number | null;
  event_slug: string | null;
  event_title_zh: string | null;
  album: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface JoinedRow {
  id: number;
  image_url: string;
  caption: string | null;
  taken_at: number | null;
  event_id: number | null;
  event_slug: string | null;
  event_title_zh: string | null;
  album: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

function badRequest(c: AppContext, detail: unknown): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  return c.json({ error: "bad_request", detail }, 400);
}

function notFound(c: AppContext): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  return c.json({ error: "not_found" }, 404);
}

// Single source for the LEFT JOIN denormalization (event_slug + title_zh).
// Both / and /by-event/:slug share this so the JOIN spec lives in one place.
function selectGalleryWithEventJoin(db: ReturnType<typeof getDb>) {
  return db
    .select({
      id: galleryItems.id,
      image_url: galleryItems.imageUrl,
      caption: galleryItems.caption,
      taken_at: galleryItems.takenAt,
      event_id: galleryItems.eventId,
      event_slug: events.slug,
      event_title_zh: events.titleZh,
      album: galleryItems.album,
      sort_order: galleryItems.sortOrder,
      created_at: galleryItems.createdAt,
      updated_at: galleryItems.updatedAt,
    })
    .from(galleryItems)
    .leftJoin(events, eq(galleryItems.eventId, events.id));
}

function rowToOut(row: JoinedRow): GalleryItemOut {
  return {
    id: row.id,
    image_url: row.image_url,
    caption: row.caption,
    taken_at: row.taken_at,
    event_id: row.event_id,
    event_slug: row.event_slug,
    event_title_zh: row.event_title_zh,
    album: row.album,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildPublicGalleryRoutes() {
  const router = new Hono<AppType>();

  router.get("/", async (c) => {
    const parsed = galleryListQuery.safeParse({
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
      event_id: c.req.query("event_id"),
      album: c.req.query("album"),
    });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const { limit, offset, event_id, album } = parsed.data;
    const db = getDb(c.env);

    const filters = [];
    if (event_id != null) filters.push(eq(galleryItems.eventId, event_id));
    if (album) filters.push(eq(galleryItems.album, album));
    const whereClause =
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...filters);

    let q = selectGalleryWithEventJoin(db).$dynamic();
    if (whereClause) q = q.where(whereClause);
    const rows = (await q
      .orderBy(
        sql`(${galleryItems.takenAt} IS NULL)`,
        desc(galleryItems.takenAt),
        desc(galleryItems.createdAt),
        desc(galleryItems.id),
      )
      .limit(limit)
      .offset(offset)
      .all()) as JoinedRow[];

    let total: number;
    if (whereClause) {
      const totalRow = await db
        .select({ n: sql<number>`count(*)` })
        .from(galleryItems)
        .where(whereClause)
        .get();
      total = totalRow?.n ?? 0;
    } else {
      const totalRow = await db
        .select({ n: sql<number>`count(*)` })
        .from(galleryItems)
        .get();
      total = totalRow?.n ?? 0;
    }

    return respondPublic(c, {
      items: rows.map(rowToOut),
      total,
    });
  });

  router.get("/by-event/:eventSlug", async (c) => {
    const parsed = slugParam.safeParse({ slug: c.req.param("eventSlug") });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const db = getDb(c.env);
    const event = await db
      .select({
        id: events.id,
        slug: events.slug,
        title_zh: events.titleZh,
        title_en: events.titleEn,
      })
      .from(events)
      .where(eq(events.slug, parsed.data.slug))
      .get();
    if (!event) return notFound(c);

    const rows = (await selectGalleryWithEventJoin(db)
      .where(eq(galleryItems.eventId, event.id))
      .orderBy(
        sql`(${galleryItems.takenAt} IS NULL)`,
        desc(galleryItems.takenAt),
        desc(galleryItems.createdAt),
        desc(galleryItems.id),
      )
      .all()) as JoinedRow[];

    return respondPublic(c, {
      items: rows.map(rowToOut),
      total: rows.length,
      event,
    });
  });

  return router;
}
