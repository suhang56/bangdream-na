import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import type { ZodSchema } from "zod";
import type { AppVariables, Env } from "../custom-env";
import { requireAdmin } from "../auth/middleware";
import { getDb } from "../db/client";
import {
  aboutSections,
  categories,
  events,
  featuredPosts,
  galleryItems,
  members,
  newsPosts,
  socialLinks,
} from "../db/schema";
import { generateSlug } from "../utils/slug";
import { respondAdmin } from "../utils/respond";
import {
  adminAboutSectionCreate,
  adminAboutSectionUpdate,
  adminCategoryCreate,
  adminCategoryUpdate,
  adminCheckSlugQuery,
  adminEventCreate,
  adminEventUpdate,
  adminFeaturedPostCreate,
  adminFeaturedPostUpdate,
  adminGalleryCreate,
  adminGalleryUpdate,
  adminIdParam,
  adminMemberCreate,
  adminMemberUpdate,
  adminNewsCreate,
  adminNewsUpdate,
  adminSocialLinkCreate,
  adminSocialLinkUpdate,
} from "../utils/validate";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

function adminError(
  c: AppContext,
  status: number,
  error: string,
  detail?: unknown,
): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  const body: Record<string, unknown> = { error };
  if (detail !== undefined) body.detail = detail;
  return c.json(body, status as 400);
}

async function parseBody<T>(
  c: AppContext,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, res: adminError(c, 400, "invalid_json") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      res: adminError(c, 400, "bad_request", parsed.error.flatten()),
    };
  }
  return { ok: true, data: parsed.data };
}

function parseId(
  c: AppContext,
): { ok: true; id: number } | { ok: false; res: Response } {
  const parsed = adminIdParam.safeParse({ id: c.req.param("id") });
  if (!parsed.success) {
    return { ok: false, res: adminError(c, 400, "bad_id") };
  }
  return { ok: true, id: parsed.data.id };
}

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
  draft: number;
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
    draft: row.draft,
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
  active: number;
  created_at: number;
  updated_at: number;
}

function categoryRowToOut(row: typeof categories.$inferSelect): CategoryRowOut {
  return {
    id: row.id,
    slug: row.slug,
    display_zh: row.displayZh,
    display_en: row.displayEn,
    accent_color: row.accentColor,
    sort_order: row.sortOrder,
    active: row.active,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function uniqueConflict(c: AppContext, field: string): Response {
  return adminError(c, 409, "unique_violation", { field });
}

export function buildAdminNewsRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.get("/check-slug", async (c) => {
    const parsed = adminCheckSlugQuery.safeParse({ slug: c.req.query("slug") });
    if (!parsed.success) {
      return adminError(c, 400, "bad_request", parsed.error.flatten());
    }
    const db = getDb(c.env);
    const row = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(eq(newsPosts.slug, parsed.data.slug))
      .get();
    return respondAdmin(c, { available: !row });
  });

  router.post("/", async (c) => {
    const body = await parseBody(c, adminNewsCreate);
    if (!body.ok) return body.res;
    const data = body.data;

    const slug = data.slug ?? generateSlug(data.title_zh);
    const db = getDb(c.env);

    const existing = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(eq(newsPosts.slug, slug))
      .get();
    if (existing) return uniqueConflict(c, "slug");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(newsPosts)
      .values({
        slug,
        titleZh: data.title_zh,
        titleEn: data.title_en ?? null,
        bodyMd: data.body_md,
        category: data.category,
        heroImageUrl: data.hero_image_url ?? null,
        tagsJson: JSON.stringify(data.tags ?? []),
        publishedAt: data.published_at,
        createdAt: now,
        updatedAt: now,
        draft: data.draft ? 1 : 0,
      })
      .returning()
      .get();

    return respondAdmin(c, newsRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminNewsUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(newsPosts)
      .where(eq(newsPosts.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.slug && data.slug !== existing.slug) {
      const collision = await db
        .select({ id: newsPosts.id })
        .from(newsPosts)
        .where(eq(newsPosts.slug, data.slug))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "slug");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof newsPosts.$inferInsert> = {
      updatedAt: now,
    };
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.title_zh !== undefined) patch.titleZh = data.title_zh;
    if (data.title_en !== undefined) patch.titleEn = data.title_en ?? null;
    if (data.body_md !== undefined) patch.bodyMd = data.body_md;
    if (data.category !== undefined) patch.category = data.category;
    if (data.hero_image_url !== undefined) {
      patch.heroImageUrl = data.hero_image_url ?? null;
    }
    if (data.tags !== undefined) patch.tagsJson = JSON.stringify(data.tags);
    if (data.published_at !== undefined) patch.publishedAt = data.published_at;
    if (data.draft !== undefined) patch.draft = data.draft ? 1 : 0;

    const updated = await db
      .update(newsPosts)
      .set(patch)
      .where(eq(newsPosts.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, newsRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: newsPosts.id })
      .from(newsPosts)
      .where(eq(newsPosts.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(newsPosts).where(eq(newsPosts.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

export function buildAdminEventsRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminEventCreate);
    if (!body.ok) return body.res;
    const data = body.data;

    const slug = data.slug ?? generateSlug(data.title_zh);
    const db = getDb(c.env);

    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, slug))
      .get();
    if (existing) return uniqueConflict(c, "slug");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(events)
      .values({
        slug,
        titleZh: data.title_zh,
        titleEn: data.title_en ?? null,
        descriptionMd: data.description_md ?? null,
        heroImageUrl: data.hero_image_url ?? null,
        startAt: data.start_at,
        endAt: data.end_at ?? null,
        venue: data.venue ?? null,
        city: data.city ?? null,
        scope: data.scope ?? null,
        ticketUrl: data.ticket_url ?? null,
        bandTheme: data.band_theme ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return respondAdmin(c, eventRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminEventUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(events)
      .where(eq(events.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.slug && data.slug !== existing.slug) {
      const collision = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.slug, data.slug))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "slug");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof events.$inferInsert> = { updatedAt: now };
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.title_zh !== undefined) patch.titleZh = data.title_zh;
    if (data.title_en !== undefined) patch.titleEn = data.title_en ?? null;
    if (data.description_md !== undefined) {
      patch.descriptionMd = data.description_md ?? null;
    }
    if (data.hero_image_url !== undefined) {
      patch.heroImageUrl = data.hero_image_url ?? null;
    }
    if (data.start_at !== undefined) patch.startAt = data.start_at;
    if (data.end_at !== undefined) patch.endAt = data.end_at ?? null;
    if (data.venue !== undefined) patch.venue = data.venue ?? null;
    if (data.city !== undefined) patch.city = data.city ?? null;
    if (data.scope !== undefined) patch.scope = data.scope ?? null;
    if (data.ticket_url !== undefined) patch.ticketUrl = data.ticket_url ?? null;
    if (data.band_theme !== undefined) patch.bandTheme = data.band_theme ?? null;

    const updated = await db
      .update(events)
      .set(patch)
      .where(eq(events.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, eventRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(events).where(eq(events.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

export function buildAdminMembersRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminMemberCreate);
    if (!body.ok) return body.res;
    const data = body.data;
    const db = getDb(c.env);
    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(members)
      .values({
        displayName: data.display_name,
        city: data.city ?? null,
        oshiCharacter: data.oshi_character ?? null,
        oshiBand: data.oshi_band ?? null,
        avatarUrl: data.avatar_url ?? null,
        expeditionMember: data.expedition_member ? 1 : 0,
        role: data.role,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return respondAdmin(c, memberRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminMemberUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(members)
      .where(eq(members.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof members.$inferInsert> = { updatedAt: now };
    if (data.display_name !== undefined) patch.displayName = data.display_name;
    if (data.city !== undefined) patch.city = data.city ?? null;
    if (data.oshi_character !== undefined) {
      patch.oshiCharacter = data.oshi_character ?? null;
    }
    if (data.oshi_band !== undefined) patch.oshiBand = data.oshi_band ?? null;
    if (data.avatar_url !== undefined) patch.avatarUrl = data.avatar_url ?? null;
    if (data.expedition_member !== undefined) {
      patch.expeditionMember = data.expedition_member ? 1 : 0;
    }
    if (data.role !== undefined) patch.role = data.role;

    const updated = await db
      .update(members)
      .set(patch)
      .where(eq(members.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, memberRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(members).where(eq(members.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

export function buildAdminCategoriesRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminCategoryCreate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, data.slug))
      .get();
    if (existing) return uniqueConflict(c, "slug");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(categories)
      .values({
        slug: data.slug,
        displayZh: data.display_zh,
        displayEn: data.display_en ?? null,
        accentColor: data.accent_color ?? null,
        sortOrder: data.sort_order ?? 0,
        active: data.active === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return respondAdmin(c, categoryRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminCategoryUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.slug && data.slug !== existing.slug) {
      const collision = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, data.slug))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "slug");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof categories.$inferInsert> = { updatedAt: now };
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.display_zh !== undefined) patch.displayZh = data.display_zh;
    if (data.display_en !== undefined) patch.displayEn = data.display_en ?? null;
    if (data.accent_color !== undefined) {
      patch.accentColor = data.accent_color ?? null;
    }
    if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
    if (data.active !== undefined) patch.active = data.active ? 1 : 0;

    const updated = await db
      .update(categories)
      .set(patch)
      .where(eq(categories.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, categoryRowToOut(updated));
  });

  // Soft delete: flip active=0
  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(categories)
      .set({ active: 0, updatedAt: now })
      .where(eq(categories.id, idParse.id))
      .run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

// ── R7: featured_posts / social_links / about_sections ──────────────────────

interface FeaturedPostRowOut {
  id: number;
  slug: string;
  title_zh: string | null;
  title_en: string | null;
  body_md: string | null;
  image_url: string | null;
  link_url: string | null;
  published_at: number | null;
  sort_order: number;
  active: number;
  created_at: number;
  updated_at: number;
}

function featuredPostRowToOut(
  row: typeof featuredPosts.$inferSelect,
): FeaturedPostRowOut {
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
    active: row.active,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function buildAdminFeaturedPostsRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminFeaturedPostCreate);
    if (!body.ok) return body.res;
    const data = body.data;
    const slug =
      data.slug ?? generateSlug(data.title_zh ?? `featured-${Date.now()}`);
    const db = getDb(c.env);

    const existing = await db
      .select({ id: featuredPosts.id })
      .from(featuredPosts)
      .where(eq(featuredPosts.slug, slug))
      .get();
    if (existing) return uniqueConflict(c, "slug");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(featuredPosts)
      .values({
        slug,
        titleZh: data.title_zh ?? null,
        titleEn: data.title_en ?? null,
        bodyMd: data.body_md ?? null,
        imageUrl: data.image_url ?? null,
        linkUrl: data.link_url ?? null,
        publishedAt: data.published_at ?? null,
        sortOrder: data.sort_order ?? 0,
        active: data.active === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return respondAdmin(c, featuredPostRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminFeaturedPostUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(featuredPosts)
      .where(eq(featuredPosts.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.slug && data.slug !== existing.slug) {
      const collision = await db
        .select({ id: featuredPosts.id })
        .from(featuredPosts)
        .where(eq(featuredPosts.slug, data.slug))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "slug");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof featuredPosts.$inferInsert> = { updatedAt: now };
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.title_zh !== undefined) patch.titleZh = data.title_zh ?? null;
    if (data.title_en !== undefined) patch.titleEn = data.title_en ?? null;
    if (data.body_md !== undefined) patch.bodyMd = data.body_md ?? null;
    if (data.image_url !== undefined) patch.imageUrl = data.image_url ?? null;
    if (data.link_url !== undefined) patch.linkUrl = data.link_url ?? null;
    if (data.published_at !== undefined) {
      patch.publishedAt = data.published_at ?? null;
    }
    if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
    if (data.active !== undefined) patch.active = data.active ? 1 : 0;

    const updated = await db
      .update(featuredPosts)
      .set(patch)
      .where(eq(featuredPosts.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, featuredPostRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: featuredPosts.id })
      .from(featuredPosts)
      .where(eq(featuredPosts.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(featuredPosts).where(eq(featuredPosts.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

interface SocialLinkRowOut {
  id: number;
  platform: string;
  label_zh: string;
  label_en: string | null;
  url: string;
  icon: string | null;
  sort_order: number;
  active: number;
  created_at: number;
  updated_at: number;
}

function socialLinkRowToOut(
  row: typeof socialLinks.$inferSelect,
): SocialLinkRowOut {
  return {
    id: row.id,
    platform: row.platform,
    label_zh: row.labelZh,
    label_en: row.labelEn,
    url: row.url,
    icon: row.icon,
    sort_order: row.sortOrder,
    active: row.active,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function buildAdminSocialLinksRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminSocialLinkCreate);
    if (!body.ok) return body.res;
    const data = body.data;
    const db = getDb(c.env);

    const existing = await db
      .select({ id: socialLinks.id })
      .from(socialLinks)
      .where(eq(socialLinks.platform, data.platform))
      .get();
    if (existing) return uniqueConflict(c, "platform");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(socialLinks)
      .values({
        platform: data.platform,
        labelZh: data.label_zh,
        labelEn: data.label_en ?? null,
        url: data.url,
        icon: data.icon ?? null,
        sortOrder: data.sort_order ?? 0,
        active: data.active === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return respondAdmin(c, socialLinkRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminSocialLinkUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.platform && data.platform !== existing.platform) {
      const collision = await db
        .select({ id: socialLinks.id })
        .from(socialLinks)
        .where(eq(socialLinks.platform, data.platform))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "platform");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof socialLinks.$inferInsert> = { updatedAt: now };
    if (data.platform !== undefined) patch.platform = data.platform;
    if (data.label_zh !== undefined) patch.labelZh = data.label_zh;
    if (data.label_en !== undefined) patch.labelEn = data.label_en ?? null;
    if (data.url !== undefined) patch.url = data.url;
    if (data.icon !== undefined) patch.icon = data.icon ?? null;
    if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
    if (data.active !== undefined) patch.active = data.active ? 1 : 0;

    const updated = await db
      .update(socialLinks)
      .set(patch)
      .where(eq(socialLinks.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, socialLinkRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: socialLinks.id })
      .from(socialLinks)
      .where(eq(socialLinks.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(socialLinks).where(eq(socialLinks.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

interface AboutSectionRowOut {
  id: number;
  slug: string;
  title_zh: string;
  title_en: string | null;
  body_md: string;
  sort_order: number;
  active: number;
  created_at: number;
  updated_at: number;
}

function aboutSectionRowToOut(
  row: typeof aboutSections.$inferSelect,
): AboutSectionRowOut {
  return {
    id: row.id,
    slug: row.slug,
    title_zh: row.titleZh,
    title_en: row.titleEn,
    body_md: row.bodyMd,
    sort_order: row.sortOrder,
    active: row.active,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function buildAdminAboutSectionsRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminAboutSectionCreate);
    if (!body.ok) return body.res;
    const data = body.data;
    const db = getDb(c.env);

    const existing = await db
      .select({ id: aboutSections.id })
      .from(aboutSections)
      .where(eq(aboutSections.slug, data.slug))
      .get();
    if (existing) return uniqueConflict(c, "slug");

    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(aboutSections)
      .values({
        slug: data.slug,
        titleZh: data.title_zh,
        titleEn: data.title_en ?? null,
        bodyMd: data.body_md,
        sortOrder: data.sort_order ?? 0,
        active: data.active === false ? 0 : 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();
    return respondAdmin(c, aboutSectionRowToOut(inserted), 201);
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminAboutSectionUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(aboutSections)
      .where(eq(aboutSections.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    if (data.slug && data.slug !== existing.slug) {
      const collision = await db
        .select({ id: aboutSections.id })
        .from(aboutSections)
        .where(eq(aboutSections.slug, data.slug))
        .get();
      if (collision && collision.id !== idParse.id) {
        return uniqueConflict(c, "slug");
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof aboutSections.$inferInsert> = { updatedAt: now };
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.title_zh !== undefined) patch.titleZh = data.title_zh;
    if (data.title_en !== undefined) patch.titleEn = data.title_en ?? null;
    if (data.body_md !== undefined) patch.bodyMd = data.body_md;
    if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;
    if (data.active !== undefined) patch.active = data.active ? 1 : 0;

    const updated = await db
      .update(aboutSections)
      .set(patch)
      .where(eq(aboutSections.id, idParse.id))
      .returning()
      .get();
    return respondAdmin(c, aboutSectionRowToOut(updated));
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: aboutSections.id })
      .from(aboutSections)
      .where(eq(aboutSections.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(aboutSections).where(eq(aboutSections.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}

// ── G-phase: gallery_items ──────────────────────────────────────────────────

interface GalleryAdminRowOut {
  id: number;
  image_url: string;
  caption: string | null;
  taken_at: number | null;
  event_id: number | null;
  album: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

function galleryRowToOut(
  row: typeof galleryItems.$inferSelect,
): GalleryAdminRowOut {
  return {
    id: row.id,
    image_url: row.imageUrl,
    caption: row.caption,
    taken_at: row.takenAt,
    event_id: row.eventId,
    album: row.album,
    sort_order: row.sortOrder,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function mapGalleryConstraintError(c: AppContext, err: unknown): Response {
  const msg = String((err as { message?: unknown })?.message ?? err);
  if (msg.includes("FOREIGN KEY")) {
    return adminError(c, 400, "event_id_not_found");
  }
  if (msg.includes("CHECK")) {
    return adminError(c, 400, "missing_group", {
      detail: "either event_id or album required",
    });
  }
  console.error("gallery_db_error", err);
  return adminError(c, 500, "internal_error");
}

export function buildAdminGalleryRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/", async (c) => {
    const body = await parseBody(c, adminGalleryCreate);
    if (!body.ok) return body.res;
    const data = body.data;
    const db = getDb(c.env);
    const now = Math.floor(Date.now() / 1000);
    try {
      const inserted = await db
        .insert(galleryItems)
        .values({
          imageUrl: data.image_url,
          caption: data.caption ?? null,
          takenAt: data.taken_at ?? null,
          eventId: data.event_id ?? null,
          album: data.album ?? null,
          sortOrder: data.sort_order ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
      return respondAdmin(c, galleryRowToOut(inserted), 201);
    } catch (err) {
      return mapGalleryConstraintError(c, err);
    }
  });

  router.put("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const body = await parseBody(c, adminGalleryUpdate);
    if (!body.ok) return body.res;
    const data = body.data;

    const db = getDb(c.env);
    const existing = await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");

    const now = Math.floor(Date.now() / 1000);
    const patch: Partial<typeof galleryItems.$inferInsert> = { updatedAt: now };
    if (data.image_url !== undefined) patch.imageUrl = data.image_url;
    if (data.caption !== undefined) patch.caption = data.caption ?? null;
    if (data.taken_at !== undefined) patch.takenAt = data.taken_at ?? null;
    if (data.event_id !== undefined) patch.eventId = data.event_id ?? null;
    if (data.album !== undefined) patch.album = data.album ?? null;
    if (data.sort_order !== undefined) patch.sortOrder = data.sort_order;

    try {
      const updated = await db
        .update(galleryItems)
        .set(patch)
        .where(eq(galleryItems.id, idParse.id))
        .returning()
        .get();
      return respondAdmin(c, galleryRowToOut(updated));
    } catch (err) {
      return mapGalleryConstraintError(c, err);
    }
  });

  router.delete("/:id", async (c) => {
    const idParse = parseId(c);
    if (!idParse.ok) return idParse.res;
    const db = getDb(c.env);
    const existing = await db
      .select({ id: galleryItems.id })
      .from(galleryItems)
      .where(eq(galleryItems.id, idParse.id))
      .get();
    if (!existing) return adminError(c, 404, "not_found");
    await db.delete(galleryItems).where(eq(galleryItems.id, idParse.id)).run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}
