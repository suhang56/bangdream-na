// Discord-compatible webhook payload formatter.
// Pure function — no I/O. Safe for Tier A unit testing.
//
// Discord embed reference:
//   https://discord.com/developers/docs/resources/channel#embed-object
// Telegram bot webhook can also accept similar JSON via a bridge — keeping
// the shape Discord-canonical because that's the most common target.

export interface WebhookComment {
  id: number;
  body: string;
  created_at: number;
  parent_id?: number | null;
}

export interface WebhookUser {
  id: number;
  github_login: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface WebhookTarget {
  id: number;
  slug?: string | null;
  title_zh?: string | null;
  title_en?: string | null;
}

export type WebhookKind = "news" | "event";

export interface WebhookEmbed {
  title: string;
  description: string;
  url?: string;
  timestamp: string;
  color?: number;
  author: { name: string; icon_url?: string };
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  footer: { text: string };
}

export interface WebhookPayload {
  content: string;
  embeds: WebhookEmbed[];
}

const BODY_TRUNCATE_AT = 300;
const TITLE_TRUNCATE_AT = 256;
const FIELD_TRUNCATE_AT = 1024;

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, Math.max(0, max - 1)) + "…";
}

function safeStr(value: unknown, fallback = ""): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  return value;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function siteUrl(kind: WebhookKind, slug: string | null | undefined): string | undefined {
  const slugStr = nonEmpty(slug);
  if (!slugStr) return undefined;
  // The frontend route uses /news/:slug for news and /events for events list
  // (events have no per-slug detail page yet). Returning the news permalink
  // when applicable; events get the listing URL.
  if (kind === "news") return `https://bangdream.org/news/${encodeURIComponent(slugStr)}`;
  return `https://bangdream.org/events`;
}

function authorName(user: WebhookUser | null | undefined): string {
  if (!user) return "匿名";
  const name = nonEmpty(user.display_name) ?? nonEmpty(user.github_login);
  return name ?? "匿名";
}

function targetTitle(target: WebhookTarget | null | undefined): string {
  if (!target) return "(未知目标)";
  const zh = nonEmpty(target.title_zh);
  const en = nonEmpty(target.title_en);
  const slug = nonEmpty(target.slug);
  if (zh && en) return `${zh} / ${en}`;
  return zh ?? en ?? slug ?? `#${target.id}`;
}

function kindLabel(kind: WebhookKind): { zh: string; en: string } {
  if (kind === "event") return { zh: "活动", en: "Event" };
  return { zh: "资讯", en: "News" };
}

function isoTimestamp(unixSeconds: number | null | undefined): string {
  const n = typeof unixSeconds === "number" && Number.isFinite(unixSeconds)
    ? unixSeconds
    : Math.floor(Date.now() / 1000);
  return new Date(n * 1000).toISOString();
}

export interface FormatWebhookPayloadInput {
  comment: WebhookComment;
  user?: WebhookUser | null;
  target?: WebhookTarget | null;
  kind: WebhookKind;
  isReply?: boolean;
}

/**
 * Build the Discord-compatible JSON body to POST to a webhook URL.
 * Pure: no fetch, no env access. Truncates long fields safely.
 */
export function formatWebhookPayload(input: FormatWebhookPayloadInput): WebhookPayload {
  const { comment, user, target, kind, isReply } = input;
  const { zh, en } = kindLabel(kind);
  const author = authorName(user);
  const title = targetTitle(target);
  const url = siteUrl(kind, target?.slug ?? null);
  const bodyClean = truncate(safeStr(comment.body, "(空)"), BODY_TRUNCATE_AT);

  const verb = isReply ? "新回复" : "新评论";
  const headlineRaw = `${verb} · ${zh} / ${en} · ${title}`;
  const headline = truncate(headlineRaw, TITLE_TRUNCATE_AT);

  const fields: WebhookEmbed["fields"] = [
    {
      name: "评论 / Comment",
      value: truncate(bodyClean, FIELD_TRUNCATE_AT),
      inline: false,
    },
    {
      name: "用户 / User",
      value: truncate(author, FIELD_TRUNCATE_AT),
      inline: true,
    },
    {
      name: "目标 / Target",
      value: truncate(title, FIELD_TRUNCATE_AT),
      inline: true,
    },
  ];

  const embed: WebhookEmbed = {
    title: headline,
    description: bodyClean,
    timestamp: isoTimestamp(comment.created_at),
    color: kind === "event" ? 0xff66aa : 0x66aaff,
    author: {
      name: author,
      ...(user?.avatar_url ? { icon_url: user.avatar_url } : {}),
    },
    fields,
    footer: { text: "bangdream.org · 评论通知 / comment notification" },
    ...(url ? { url } : {}),
  };

  return {
    content: `${verb} by ${author}`,
    embeds: [embed],
  };
}

/**
 * Lightweight URL validation. Webhook URLs must be HTTPS for Discord
 * (Discord rejects plain http) and must parse as a valid URL.
 * Returns the normalized origin+pathname or null when invalid.
 */
export function validateWebhookUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return parsed.toString();
}
