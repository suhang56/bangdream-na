import { Hono, type Context } from "hono";
import { and, asc, desc, eq, gte, isNull, like, lt, or, sql } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { getDb } from "../db/client";
import {
  aboutSections,
  categories,
  events,
  featuredPosts,
  members,
  newsPosts,
  settings,
  socialLinks,
} from "../db/schema";
import {
  eventListQuery,
  newsListQuery,
  slugParam,
} from "../utils/validate";
import { respondPublic } from "../utils/respond";
import {
  eventRowToOut,
  memberRowToOut,
  newsRowToOut,
} from "../utils/row-mappers";

type AppType = { Bindings: Env; Variables: AppVariables };

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
      // body_md is excluded intentionally: full-table LIKE on a 200KB-cap column
      // exceeds D1's 30s CPU budget at scale. Long-term fix: FTS5 virtual table.
      filters.push(
        or(like(newsPosts.titleZh, pat), like(newsPosts.titleEn, pat))!,
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

    // An event is "past" if it has already ended (end_at < now), OR if it has
    // no end_at and the start has passed. The mirror image is "upcoming". Events
    // with no end_at sit in exactly one bucket based on start_at vs now — the
    // two clauses partition every row, so events never silently vanish.
    let whereClause;
    if (scope === "past") {
      whereClause = or(
        lt(events.endAt, now),
        and(isNull(events.endAt), lt(events.startAt, now)),
      );
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

// ── R7: featured_posts / social_links / about_sections / settings (site.*) ──

interface FeaturedPostPublicOut {
  id: number;
  slug: string;
  title_zh: string | null;
  title_en: string | null;
  body_md: string | null;
  image_url: string | null;
  link_url: string | null;
  published_at: number | null;
  sort_order: number;
}

function featuredPostPublicOut(
  row: typeof featuredPosts.$inferSelect,
): FeaturedPostPublicOut {
  return {
    id: row.id,
    slug: row.slug,
    title_zh: row.titleZh,
    title_en: row.titleEn,
    body_md: row.bodyMd,
    image_url: row.imageUrl,
    link_url: row.linkUrl,
    published_at: row.publishedAt,
    sort_order: row.sortOrder,
  };
}

export function buildPublicPostsRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(featuredPosts)
      .where(eq(featuredPosts.active, 1))
      .orderBy(asc(featuredPosts.sortOrder), asc(featuredPosts.id))
      .all();
    return respondPublic(c, {
      items: rows.map(featuredPostPublicOut),
      total: rows.length,
    });
  });
  return router;
}

interface SocialLinkPublicOut {
  id: number;
  platform: string;
  label_zh: string;
  label_en: string | null;
  url: string;
  icon: string | null;
  sort_order: number;
}

function socialLinkPublicOut(
  row: typeof socialLinks.$inferSelect,
): SocialLinkPublicOut {
  return {
    id: row.id,
    platform: row.platform,
    label_zh: row.labelZh,
    label_en: row.labelEn,
    url: row.url,
    icon: row.icon,
    sort_order: row.sortOrder,
  };
}

export function buildPublicSocialRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.active, 1))
      .orderBy(asc(socialLinks.sortOrder), asc(socialLinks.id))
      .all();
    return respondPublic(c, {
      items: rows.map(socialLinkPublicOut),
      total: rows.length,
    });
  });
  return router;
}

interface AboutSectionPublicOut {
  id: number;
  slug: string;
  title_zh: string;
  title_en: string | null;
  body_md: string;
  sort_order: number;
}

function aboutSectionPublicOut(
  row: typeof aboutSections.$inferSelect,
): AboutSectionPublicOut {
  return {
    id: row.id,
    slug: row.slug,
    title_zh: row.titleZh,
    title_en: row.titleEn,
    body_md: row.bodyMd,
    sort_order: row.sortOrder,
  };
}

export function buildPublicAboutRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(aboutSections)
      .where(eq(aboutSections.active, 1))
      .orderBy(asc(aboutSections.sortOrder), asc(aboutSections.id))
      .all();
    return respondPublic(c, {
      items: rows.map(aboutSectionPublicOut),
      total: rows.length,
    });
  });
  return router;
}

export function buildPublicSiteRoutes() {
  const router = new Hono<AppType>();
  router.get("/", async (c) => {
    const db = getDb(c.env);
    // Read settings rows where key starts with `site.`. The leading prefix
    // is hard-coded — public callers can't broaden the slice.
    const rows = await db
      .select()
      .from(settings)
      .where(like(settings.key, "site.%"))
      .orderBy(asc(settings.key))
      .all();
    return respondPublic(c, {
      items: rows.map((r) => ({ key: r.key, value: r.value })),
    });
  });
  return router;
}
