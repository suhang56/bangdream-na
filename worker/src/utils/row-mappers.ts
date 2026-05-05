import { events, members, newsPosts } from "../db/schema";

export function parseTagsJson(raw: string): string[] {
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

export interface NewsRowOut {
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

export interface NewsAdminRowOut extends NewsRowOut {
  draft: number;
}

export function newsRowToOut(row: typeof newsPosts.$inferSelect): NewsRowOut {
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

export function newsAdminRowToOut(row: typeof newsPosts.$inferSelect): NewsAdminRowOut {
  return { ...newsRowToOut(row), draft: row.draft };
}

export interface EventRowOut {
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

export function eventRowToOut(row: typeof events.$inferSelect): EventRowOut {
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

export interface MemberRowOut {
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

export function memberRowToOut(row: typeof members.$inferSelect): MemberRowOut {
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
