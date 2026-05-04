import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    githubLogin: text("github_login").notNull(),
    githubId: integer("github_id").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    createdAt: integer("created_at").notNull(),
    lastLoginAt: integer("last_login_at"),
  },
  (t) => ({
    loginUq: uniqueIndex("users_github_login_uq").on(t.githubLogin),
    idUq: uniqueIndex("users_github_id_uq").on(t.githubId),
  }),
);

export const newsPosts = sqliteTable("news_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  titleZh: text("title_zh").notNull(),
  titleEn: text("title_en"),
  bodyMd: text("body_md").notNull(),
  category: text("category").notNull(),
  heroImageUrl: text("hero_image_url"),
  tagsJson: text("tags_json").notNull().default(sql`'[]'`),
  publishedAt: integer("published_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  draft: integer("draft").notNull().default(0),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  titleZh: text("title_zh").notNull(),
  titleEn: text("title_en"),
  descriptionMd: text("description_md"),
  heroImageUrl: text("hero_image_url"),
  startAt: integer("start_at").notNull(),
  endAt: integer("end_at"),
  venue: text("venue"),
  city: text("city"),
  scope: text("scope"),
  ticketUrl: text("ticket_url"),
  bandTheme: text("band_theme"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const members = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  city: text("city"),
  oshiCharacter: text("oshi_character"),
  oshiBand: text("oshi_band"),
  avatarUrl: text("avatar_url"),
  expeditionMember: integer("expedition_member").notNull().default(0),
  externalId: text("external_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id"),
  targetKind: text("target_kind", { enum: ["news", "event"] }).notNull(),
  targetId: integer("target_id").notNull(),
  userId: integer("user_id").notNull(),
  body: text("body").notNull(),
  deleted: integer("deleted").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  displayZh: text("display_zh").notNull(),
  displayEn: text("display_en"),
  accentColor: text("accent_color"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
