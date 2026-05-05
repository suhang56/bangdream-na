import { z } from "zod";

export const githubLoginSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/);

export function parseAdminAllowlist(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

const intFromQuery = (defaultValue: number) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return defaultValue;
    if (typeof v === "number") return v;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  }, z.number().int());

// Slug validator for path params + category filter: length-only.
// SQL injection is handled by drizzle's parameterized queries; URL-reserved
// chars (/ ? # &) can't reach this layer because Hono splits on `/` first.
// Non-existent slugs naturally return 404 via D1 lookup. Regex was removed
// after PR #78 + #82 showed gen-validator domain mismatch (CJK letters,
// then CJK fullwidth punctuation) repeatedly false-rejected legitimate slugs.
const slugString = z.string().min(1).max(120);

export const newsListQuery = z.object({
  limit: intFromQuery(20).pipe(z.number().int().min(1).max(100)),
  offset: intFromQuery(0).pipe(z.number().int().min(0)),
  category: slugString.optional(),
  q: z.string().min(1).max(200).optional(),
});

export const eventListQuery = z.object({
  limit: intFromQuery(50).pipe(z.number().int().min(1).max(100)),
  offset: intFromQuery(0).pipe(z.number().int().min(0)),
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
});

export const slugParam = z.object({
  slug: slugString,
});

export const uploadKindEnum = z.enum(["news", "events", "members", "gallery"]);

export const uploadFormParts = z.object({
  kind: uploadKindEnum,
  slug: z.string().min(1).max(200).optional(),
});

const optionalSlug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i)
  .optional();

const tagsArray = z
  .array(z.string().min(1).max(40))
  .max(20)
  .optional();

const intSecondsTimestamp = z.number().int().min(0);
const positiveId = z.coerce.number().int().min(1);

export const adminIdParam = z.object({
  id: positiveId,
});

export const adminCheckSlugQuery = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i),
});

export const adminNewsCreate = z.object({
  slug: optionalSlug,
  title_zh: z.string().min(1).max(200),
  title_en: z.string().max(200).nullish(),
  body_md: z.string().min(1).max(200000),
  category: z.string().min(1).max(80).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i),
  hero_image_url: z.string().url().max(1000).nullish(),
  tags: tagsArray,
  published_at: intSecondsTimestamp,
  draft: z.boolean().optional(),
});

export const adminNewsUpdate = adminNewsCreate.partial();

export const adminEventCreate = z.object({
  slug: optionalSlug,
  title_zh: z.string().min(1).max(200),
  title_en: z.string().max(200).nullish(),
  description_md: z.string().max(200000).nullish(),
  hero_image_url: z.string().url().max(1000).nullish(),
  start_at: intSecondsTimestamp,
  end_at: intSecondsTimestamp.nullish(),
  venue: z.string().max(200).nullish(),
  city: z.string().max(120).nullish(),
  scope: z.enum(["upcoming", "past"]).nullish(),
  ticket_url: z.string().url().max(1000).nullish(),
  band_theme: z.string().max(80).nullish(),
});

export const adminEventUpdate = adminEventCreate.partial();

export const memberRoleEnum = z.enum([
  "organizer",
  "member",
  "alumnus",
  "cover-band-lead",
]);

export const adminMemberCreate = z.object({
  display_name: z.string().min(1).max(120),
  city: z.string().max(120).nullish(),
  oshi_character: z.string().max(120).nullish(),
  oshi_band: z.string().max(120).nullish(),
  avatar_url: z.string().url().max(1000).nullish(),
  expedition_member: z.boolean().optional(),
  role: memberRoleEnum.default("member"),
});

// PUT must NOT default role — omitted means "leave unchanged".
// Hand-roll partial so role becomes optional WITHOUT a default.
export const adminMemberUpdate = z.object({
  display_name: z.string().min(1).max(120).optional(),
  city: z.string().max(120).nullish(),
  oshi_character: z.string().max(120).nullish(),
  oshi_band: z.string().max(120).nullish(),
  avatar_url: z.string().url().max(1000).nullish(),
  expedition_member: z.boolean().optional(),
  role: memberRoleEnum.optional(),
});

export const adminCategoryCreate = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i),
  display_zh: z.string().min(1).max(120),
  display_en: z.string().max(120).nullish(),
  accent_color: z.string().max(40).nullish(),
  sort_order: z.number().int().min(0).max(10000).optional(),
  active: z.boolean().optional(),
});

export const adminCategoryUpdate = adminCategoryCreate.partial();

// ── R7: featured_posts / social_links / about_sections ──────────────────────

const sortOrderField = z.number().int().min(0).max(10000).optional();

// Restricts URLs to http/https schemes to block javascript:, data:, file:, etc.
// `.url()` alone accepts any well-formed URL including javascript:alert(1).
const httpUrl = z
  .string()
  .url()
  .max(1000)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "must be http or https URL" },
  );

export const adminFeaturedPostCreate = z.object({
  slug: optionalSlug,
  title_zh: z.string().max(200).nullish(),
  title_en: z.string().max(200).nullish(),
  body_md: z.string().max(200000).nullish(),
  image_url: httpUrl.nullish(),
  link_url: httpUrl.nullish(),
  published_at: intSecondsTimestamp.nullish(),
  sort_order: sortOrderField,
  active: z.boolean().optional(),
});

export const adminFeaturedPostUpdate = adminFeaturedPostCreate.partial();

const platformSlug = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i);

export const adminSocialLinkCreate = z.object({
  platform: platformSlug,
  label_zh: z.string().min(1).max(60),
  label_en: z.string().max(60).nullish(),
  url: httpUrl,
  icon: httpUrl.nullish(),
  sort_order: sortOrderField,
  active: z.boolean().optional(),
});

export const adminSocialLinkUpdate = adminSocialLinkCreate.partial();

export const adminAboutSectionCreate = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i),
  title_zh: z.string().min(1).max(200),
  title_en: z.string().max(200).nullish(),
  body_md: z.string().min(1).max(200000),
  sort_order: sortOrderField,
  active: z.boolean().optional(),
});

export const adminAboutSectionUpdate = adminAboutSectionCreate.partial();

// ── G-phase: gallery_items ──────────────────────────────────────────────────
//
// `image_url` is length-bounded only (NOT z.url()). Per
// `feedback_question_defensive_layer_when_repeatedly_regressing.md` and the
// slug-regex retreat at line 27, tighter URL regex on user-pasted values has
// caused twin false-reject incidents. The R2 upload route owns URL shape;
// this admin write is a length-bounded passthrough.

export const galleryListQuery = z.object({
  limit: intFromQuery(100).pipe(z.number().int().min(1).max(100)),
  offset: intFromQuery(0).pipe(z.number().int().min(0)),
  event_id: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      if (typeof v === "number") return v;
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }, z.number().int().min(1))
    .optional(),
  album: z.string().min(1).max(120).optional(),
});

export const adminGalleryCreate = z
  .object({
    image_url: z.string().min(1).max(500),
    caption: z.string().max(500).nullish(),
    taken_at: intSecondsTimestamp.nullish(),
    event_id: positiveId.nullish(),
    album: z.string().min(1).max(120).nullish(),
    sort_order: sortOrderField,
  })
  .refine(
    (v) => v.event_id != null || (v.album != null && v.album.length > 0),
    { message: "either event_id or album required", path: ["event_id"] },
  );

// No top-level refine on update: partial updates may legitimately not touch
// event_id/album. The DB CHECK constraint is the backstop; if a PUT sets BOTH
// to null, the SQL UPDATE returns SQLITE_CONSTRAINT and the route maps to 400.
export const adminGalleryUpdate = z.object({
  image_url: z.string().min(1).max(500).optional(),
  caption: z.string().max(500).nullish(),
  taken_at: intSecondsTimestamp.nullish(),
  event_id: positiveId.nullish(),
  album: z.string().min(1).max(120).nullish(),
  sort_order: sortOrderField,
});

// ── Comments / settings ──────────────────────────────────────────────────────

export const COMMENT_BODY_MAX = 4000;

export const commentTargetKindEnum = z.enum(["news", "event"]);

export const commentListQuery = z.object({
  targetKind: commentTargetKindEnum,
  targetId: intFromQuery(0).pipe(z.number().int().min(1)),
  limit: intFromQuery(100).pipe(z.number().int().min(1).max(200)),
});

export const commentCreate = z.object({
  parent_id: z.number().int().min(1).nullish(),
  target_kind: commentTargetKindEnum,
  target_id: z.number().int().min(1),
  body: z.string().min(1).max(COMMENT_BODY_MAX),
});

export const commentIdParam = z.object({
  id: positiveId,
});

// Settings: keys are dot-namespaced lowercase ascii (`webhook.comment.url`).
const settingsKeyString = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i);

export const settingsKeyParam = z.object({
  key: settingsKeyString,
});

export const settingsBody = z.object({
  value: z.string().max(10000),
});

// Restrict prefix to lowercase ASCII + dot/dash/underscore so an attacker
// cannot pass an arbitrary LIKE pattern and reuse the endpoint as a generic
// dump of the settings table.
export const settingsListQuery = z.object({
  prefix: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9.])?$/i),
});

export const webhookTestBody = z.object({
  // Optional: caller may submit an explicit URL to test instead of using
  // the persisted setting. Empty/missing → fall back to settings table.
  url: z.string().url().max(2000).optional(),
});
