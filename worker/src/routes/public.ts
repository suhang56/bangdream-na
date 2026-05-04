import { Hono, type Context } from "hono";
import { and, asc, desc, eq, gte, isNull, like, lt, or, sql } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { getDb } from "../db/client";
import { categories, events, members, newsPosts } from "../db/schema";
import {
  eventListQuery,
  newsListQuery,
  slugParam,
} from "../utils/validate";
import { respondPublic } from "../utils/respond";

type AppType = { Bindings: Env; Variables: AppVariables };

interface NewsRowOut {
  id: number;
  slug: string;
  title_zh: string;
  title_en: string | null;
  body_md: string;
  category: string;
  hero_image_url: string | null;
  tags: string[];
  published_at: number;
  created_at: number;
  updated_at: number;
}

function parseTagsJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* fall through */
  }
  return [];
}

function newsRowToOut(row: typeof newsPosts.$inferSelect): NewsRowOut {
  return {
    id: row.id,
    slug: row.slug,
    title_zh: row.titleZh,
    title_en: row.titleEn,
    body_md: row.bodyMd,
    category: row.category,
    hero_image_url: row.heroImageUrl,
    tags: parseTagsJson(row.tagsJson),
    published_at: row.publishedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

interface EventRowOut {
  id: number;
  slug: string;
  title_zh: string;
  title_en: string | null;
  description_md: string | null;
  hero_image_url: string | null;
  start_at: number;
  end_at: number | null;
  venue: string | null;
  city: string | null;
  scope: string | null;
  ticket_url: string | null;
  band_theme: string | null;
  created_at: number;
  updated_at: number;
}

function eventRowToOut(row: typeof events.$inferSelect): EventRowOut {
  return {
    id: row.id,
    slug: row.slug,
    title_zh: row.titleZh,
    title_en: row.titleEn,
    description_md: row.descriptionMd,
    hero_image_url: row.heroImageUrl,
    start_at: row.startAt,
    end_at: row.endAt,
    venue: row.venue,
    city: row.city,
    scope: row.scope,
    ticket_url: row.ticketUrl,
    band_theme: row.bandTheme,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

interface MemberRowOut {
  id: number;
  display_name: string;
  city: string | null;
  oshi_character: string | null;
  oshi_band: string | null;
  avatar_url: string | null;
  expedition_member: number;
  role: "organizer" | "member" | "alumnus" | "cover-band-lead";
  created_at: number;
  updated_at: number;
}

function memberRowToOut(row: typeof members.$inferSelect): MemberRowOut {
  return {
    id: row.id,
    display_name: row.displayName,
    city: row.city,
    oshi_character: row.oshiCharacter,
    oshi_band: row.oshiBand,
    avatar_url: row.avatarUrl,
    expedition_member: row.expeditionMember,
    role: row.role,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

interface CategoryRowOut {
  id: number;
  slug: string;
  display_zh: string;
  display_en: string | null;
  accent_color: string | null;
  sort_order: number;
}

function categoryRowToOut(row: typeof categories.$inferSelect): CategoryRowOut {
  return {
    id: row.id,
    slug: row.slug,
    display_zh: row.displayZh,
    display_en: row.displayEn,
    accent_color: row.accentColor,
    sort_order: row.sortOrder,
  };
}

type AppContext = Context<AppType>;

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

export function buildPublicNewsRoutes() {
  const router = new Hono<AppType>();

  router.get("/", async (c) => {
    const parsed = newsListQuery.safeParse({
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
      category: c.req.query("category"),
      q: c.req.query("q"),
    });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const { limit, offset, category, q } = parsed.data;
    const db = getDb(c.env);

    if (category) {
      const exists = await db
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.slug, category))
        .get();
      if (!exists) return badRequest(c, { category: "unknown_category" });
    }

    const filters = [eq(newsPosts.draft, 0)];
    if (category) filters.push(eq(newsPosts.category, category));
    if (q) {
      const pat = `%${q.replace(/[%_]/g, "")}%`;
      filters.push(
        or(like(newsPosts.titleZh, pat), like(newsPosts.titleEn, pat), like(newsPosts.bodyMd, pat))!,
      );
    }

    const whereClause = filters.length === 1 ? filters[0] : and(...filters);

    const rows = await db
      .select()
      .from(newsPosts)
      .where(whereClause)
      .orderBy(desc(newsPosts.publishedAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRow = await db
      .select({ n: sql<number>`count(*)` })
      .from(newsPosts)
      .where(whereClause)
      .get();

    return respondPublic(c, {
      items: rows.map(newsRowToOut),
      total: totalRow?.n ?? 0,
    });
  });

  router.get("/:slug", async (c) => {
    const parsed = slugParam.safeParse({ slug: c.req.param("slug") });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const db = getDb(c.env);
    const row = await db
      .select()
      .from(newsPosts)
      .where(and(eq(newsPosts.slug, parsed.data.slug), eq(newsPosts.draft, 0)))
      .get();
    if (!row) return notFound(c);
    return respondPublic(c, newsRowToOut(row));
  });

  return router;
}

export function buildPublicEventsRoutes() {
  const router = new Hono<AppType>();

  router.get("/", async (c) => {
    const parsed = eventListQuery.safeParse({
      limit: c.req.query("limit"),
      offset: c.req.query("offset"),
      scope: c.req.query("scope"),
    });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const { limit, offset, scope } = parsed.data;
    const db = getDb(c.env);
    const now = Math.floor(Date.now() / 1000);

    let whereClause;
    if (scope === "past") {
      whereClause = lt(events.endAt, now);
    } else {
      whereClause = or(
        gte(events.endAt, now),
        and(isNull(events.endAt), gte(events.startAt, now)),
      );
    }

    const rows = await db
      .select()
      .from(events)
      .where(whereClause)
      .orderBy(scope === "past" ? desc(events.startAt) : asc(events.startAt))
      .limit(limit)
      .offset(offset)
      .all();

    const totalRow = await db
      .select({ n: sql<number>`count(*)` })
      .from(events)
      .where(whereClause)
      .get();

    return respondPublic(c, {
      items: rows.map(eventRowToOut),
      total: totalRow?.n ?? 0,
    });
  });

  router.get("/:slug", async (c) => {
    const parsed = slugParam.safeParse({ slug: c.req.param("slug") });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    const db = getDb(c.env);
    const row = await db.select().from(events).where(eq(events.slug, parsed.data.slug)).get();
    if (!row) return notFound(c);
    return respondPublic(c, eventRowToOut(row));
  });

  return router;
}

export function buildPublicMembersRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(members)
      .orderBy(asc(members.displayName))
      .all();
    return respondPublic(c, {
      items: rows.map(memberRowToOut),
      total: rows.length,
    });
  });
  return router;
}

export function buildPublicCategoriesRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.active, 1))
      .orderBy(asc(categories.sortOrder), asc(categories.id))
      .all();
    return respondPublic(c, { items: rows.map(categoryRowToOut) });
  });
  return router;
}
