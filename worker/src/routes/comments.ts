import { Hono, type Context } from "hono";
import { and, asc, eq, gt } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { loadSessionUser, requireAuth } from "../auth/middleware";
import { getDb } from "../db/client";
import { comments, events, newsPosts, settings, users } from "../db/schema";
import { respondAdmin, respondPublic } from "../utils/respond";
import {
  commentCreate,
  commentIdParam,
  commentListQuery,
} from "../utils/validate";
import {
  formatWebhookPayload,
  validateWebhookUrl,
  type WebhookKind,
  type WebhookTarget,
  type WebhookUser,
} from "../utils/webhook";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

export const COMMENT_RATE_LIMIT_SECONDS = 10;
export const DELETED_BODY_PLACEHOLDER = "[已删除]";
export const WEBHOOK_SETTING_KEY = "webhook.comment.url";

export interface CommentOut {
  id: number;
  parent_id: number | null;
  target_kind: "news" | "event";
  target_id: number;
  body: string;
  deleted: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  user: {
    id: number;
    github_login: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  replies: CommentOut[];
}

interface CommentRowJoined {
  id: number;
  parentId: number | null;
  targetKind: "news" | "event";
  targetId: number;
  userId: number;
  body: string;
  deleted: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  userGithubLogin: string | null;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
}

function rowToOut(row: CommentRowJoined): CommentOut {
  const isDeleted = row.deleted === 1;
  return {
    id: row.id,
    parent_id: row.parentId,
    target_kind: row.targetKind,
    target_id: row.targetId,
    body: isDeleted ? DELETED_BODY_PLACEHOLDER : row.body,
    deleted: row.deleted,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
    user: isDeleted
      ? null
      : row.userGithubLogin
      ? {
          id: row.userId,
          github_login: row.userGithubLogin,
          display_name: row.userDisplayName,
          avatar_url: row.userAvatarUrl,
        }
      : null,
    replies: [],
  };
}

function buildThread(rows: CommentOut[]): CommentOut[] {
  const byId = new Map<number, CommentOut>();
  for (const r of rows) byId.set(r.id, r);
  const roots: CommentOut[] = [];
  for (const r of rows) {
    if (r.parent_id == null) {
      roots.push(r);
      continue;
    }
    const parent = byId.get(r.parent_id);
    // Threading is one level deep — if a reply's parent is itself a reply,
    // promote it to the same level (replies array of the original root).
    if (parent && parent.parent_id == null) {
      parent.replies.push(r);
    } else if (parent && parent.parent_id != null) {
      const grand = byId.get(parent.parent_id);
      if (grand) {
        grand.replies.push(r);
      } else {
        roots.push(r);
      }
    } else {
      // Orphan reply (parent missing/deleted with cascade) → render as root.
      roots.push(r);
    }
  }
  // Order: roots ascending by created_at; replies ascending too.
  roots.sort((a, b) => a.created_at - b.created_at);
  for (const r of roots) {
    r.replies.sort((a, b) => a.created_at - b.created_at);
  }
  return roots;
}

function badRequest(c: AppContext, detail: unknown): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  return c.json({ error: "bad_request", detail }, 400);
}

async function fetchTarget(
  c: AppContext,
  kind: "news" | "event",
  id: number,
): Promise<WebhookTarget | null> {
  const db = getDb(c.env);
  if (kind === "news") {
    const row = await db
      .select({
        id: newsPosts.id,
        slug: newsPosts.slug,
        title_zh: newsPosts.titleZh,
        title_en: newsPosts.titleEn,
      })
      .from(newsPosts)
      .where(eq(newsPosts.id, id))
      .get();
    return row ?? null;
  }
  const row = await db
    .select({
      id: events.id,
      slug: events.slug,
      title_zh: events.titleZh,
      title_en: events.titleEn,
    })
    .from(events)
    .where(eq(events.id, id))
    .get();
  return row ?? null;
}

async function readWebhookUrl(c: AppContext): Promise<string | null> {
  const db = getDb(c.env);
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, WEBHOOK_SETTING_KEY))
    .get();
  if (!row) return null;
  return validateWebhookUrl(row.value);
}

export function fireWebhook(
  c: AppContext,
  url: string,
  body: unknown,
): void {
  // CRITICAL: must use waitUntil so the outbound fetch is not killed when
  // the Worker isolate terminates after the response is sent.
  // Per feedback_cloudflare_workers_native_plan_facts.md.
  c.executionCtx.waitUntil(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("webhook_non_ok", { status: res.status });
        }
      })
      .catch((err) => {
        console.error("webhook_failed", err);
      }),
  );
}

export function buildCommentRoutes() {
  const router = new Hono<AppType>();

  // GET — public read, threaded.
  router.get("/", async (c) => {
    const parsed = commentListQuery.safeParse({
      targetKind: c.req.query("targetKind"),
      targetId: c.req.query("targetId"),
      limit: c.req.query("limit"),
    });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());
    const { targetKind, targetId, limit } = parsed.data;

    const db = getDb(c.env);
    const rawRows = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        targetKind: comments.targetKind,
        targetId: comments.targetId,
        userId: comments.userId,
        body: comments.body,
        deleted: comments.deleted,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
        userGithubLogin: users.githubLogin,
        userDisplayName: users.displayName,
        userAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(
        and(
          eq(comments.targetKind, targetKind),
          eq(comments.targetId, targetId),
        ),
      )
      .orderBy(asc(comments.createdAt))
      .limit(limit)
      .all();

    const rows = rawRows.map(rowToOut);
    const items = buildThread(rows);
    const total = rows.length;
    return respondPublic(c, { items, total });
  });

  // POST — authed, rate-limited, fires webhook.
  router.post("/", requireAuth, async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return badRequest(c, "invalid_json");
    }
    const parsed = commentCreate.safeParse(raw);
    if (!parsed.success) return badRequest(c, parsed.error.flatten());
    const data = parsed.data;
    const user = c.get("user");

    const db = getDb(c.env);
    const now = Math.floor(Date.now() / 1000);

    // Rate limit: any comment by this user in last N seconds → 429.
    const recent = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.userId, user.id),
          gt(comments.createdAt, now - COMMENT_RATE_LIMIT_SECONDS),
        ),
      )
      .limit(1)
      .get();
    if (recent) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      c.header("Retry-After", String(COMMENT_RATE_LIMIT_SECONDS));
      return c.json(
        { error: "rate_limited", retry_after: COMMENT_RATE_LIMIT_SECONDS },
        429,
      );
    }

    // Validate parent if provided: must exist, same target, not deleted.
    if (data.parent_id) {
      const parent = await db
        .select({
          id: comments.id,
          parentId: comments.parentId,
          targetKind: comments.targetKind,
          targetId: comments.targetId,
          deleted: comments.deleted,
        })
        .from(comments)
        .where(eq(comments.id, data.parent_id))
        .get();
      if (
        !parent ||
        parent.deleted === 1 ||
        parent.targetKind !== data.target_kind ||
        parent.targetId !== data.target_id
      ) {
        return badRequest(c, { parent_id: "invalid_parent" });
      }
    }

    // Validate target exists.
    const target = await fetchTarget(c, data.target_kind, data.target_id);
    if (!target) return badRequest(c, { target_id: "unknown_target" });

    const inserted = await db
      .insert(comments)
      .values({
        parentId: data.parent_id ?? null,
        targetKind: data.target_kind,
        targetId: data.target_id,
        userId: user.id,
        body: data.body,
        deleted: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    // Fire webhook (best-effort, fire-and-forget).
    const webhookUrl = await readWebhookUrl(c);
    if (webhookUrl) {
      const userForPayload: WebhookUser = {
        id: user.id,
        github_login: user.github_login,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      };
      const payload = formatWebhookPayload({
        comment: {
          id: inserted.id,
          body: inserted.body,
          created_at: inserted.createdAt,
          parent_id: inserted.parentId,
        },
        user: userForPayload,
        target,
        kind: data.target_kind as WebhookKind,
        isReply: data.parent_id != null,
      });
      fireWebhook(c, webhookUrl, payload);
    }

    return respondAdmin(
      c,
      {
        id: inserted.id,
        parent_id: inserted.parentId,
        target_kind: inserted.targetKind,
        target_id: inserted.targetId,
        body: inserted.body,
        deleted: inserted.deleted,
        created_at: inserted.createdAt,
        updated_at: inserted.updatedAt,
        deleted_at: inserted.deletedAt,
        user: {
          id: user.id,
          github_login: user.github_login,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        },
        replies: [],
      },
      201,
    );
  });

  // DELETE — author OR admin; soft delete.
  router.delete("/:id", async (c) => {
    const parsedId = commentIdParam.safeParse({ id: c.req.param("id") });
    if (!parsedId.success) return badRequest(c, parsedId.error.flatten());

    const sessionUser = await loadSessionUser(c);
    if (!sessionUser) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.json({ error: "unauthorized" }, 401);
    }

    const db = getDb(c.env);
    const row = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parsedId.data.id))
      .get();
    if (!row) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.json({ error: "not_found" }, 404);
    }
    if (row.userId !== sessionUser.id && sessionUser.role !== "admin") {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.json({ error: "forbidden" }, 403);
    }
    if (row.deleted === 1) {
      // Idempotent — already soft-deleted; return 204.
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.body(null, 204);
    }

    const now = Math.floor(Date.now() / 1000);
    await db
      .update(comments)
      .set({ deleted: 1, deletedAt: now, updatedAt: now })
      .where(eq(comments.id, parsedId.data.id))
      .run();
    c.header("Cache-Control", "no-store");
    c.header("Vary", "Origin");
    return c.body(null, 204);
  });

  return router;
}
