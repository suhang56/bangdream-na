import { Hono, type Context } from "hono";
import { asc, eq, like } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { requireAdmin } from "../auth/middleware";
import { getDb } from "../db/client";
import { settings } from "../db/schema";
import { respondAdmin } from "../utils/respond";
import {
  settingsBody,
  settingsKeyParam,
  settingsListQuery,
  webhookTestBody,
} from "../utils/validate";
import {
  formatWebhookPayload,
  validateWebhookUrl,
} from "../utils/webhook";
import { fireWebhook, WEBHOOK_SETTING_KEY } from "./comments";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

function badRequest(c: AppContext, detail: unknown): Response {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  return c.json({ error: "bad_request", detail }, 400);
}

export function buildAdminSettingsRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  // List settings whose key starts with `prefix`. Used by the admin UI to
  // render all `site.*` keys at once. The prefix is regex-restricted in
  // settingsListQuery to prevent LIKE-pattern injection.
  router.get("/", async (c) => {
    const parsed = settingsListQuery.safeParse({ prefix: c.req.query("prefix") });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());
    const escaped = parsed.data.prefix.replace(/[%_]/g, "");
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(settings)
      .where(like(settings.key, `${escaped}%`))
      .orderBy(asc(settings.key))
      .all();
    return respondAdmin(c, {
      items: rows.map((r) => ({
        key: r.key,
        value: r.value,
        updated_at: r.updatedAt,
      })),
    });
  });

  router.get("/:key", async (c) => {
    const parsed = settingsKeyParam.safeParse({ key: c.req.param("key") });
    if (!parsed.success) return badRequest(c, parsed.error.flatten());
    const db = getDb(c.env);
    const row = await db
      .select()
      .from(settings)
      .where(eq(settings.key, parsed.data.key))
      .get();
    if (!row) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.json({ error: "not_found" }, 404);
    }
    return respondAdmin(c, {
      key: row.key,
      value: row.value,
      updated_at: row.updatedAt,
    });
  });

  router.put("/:key", async (c) => {
    const parsedKey = settingsKeyParam.safeParse({ key: c.req.param("key") });
    if (!parsedKey.success) return badRequest(c, parsedKey.error.flatten());
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return badRequest(c, "invalid_json");
    }
    const parsedBody = settingsBody.safeParse(raw);
    if (!parsedBody.success) return badRequest(c, parsedBody.error.flatten());

    if (parsedKey.data.key === WEBHOOK_SETTING_KEY) {
      const valid = validateWebhookUrl(parsedBody.data.value);
      if (!valid) {
        c.header("Cache-Control", "no-store");
        c.header("Vary", "Origin");
        return c.json({ error: "webhook_url_invalid", detail: "must be a valid https URL" }, 422);
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const db = getDb(c.env);
    await db
      .insert(settings)
      .values({
        key: parsedKey.data.key,
        value: parsedBody.data.value,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: parsedBody.data.value,
          updatedAt: now,
        },
      })
      .run();

    return respondAdmin(c, {
      key: parsedKey.data.key,
      value: parsedBody.data.value,
      updated_at: now,
    });
  });

  router.post("/test-webhook", async (c) => {
    let raw: unknown = {};
    const ct = c.req.header("Content-Type") ?? "";
    if (ct.toLowerCase().includes("application/json")) {
      try {
        const text = await c.req.text();
        raw = text.length === 0 ? {} : JSON.parse(text);
      } catch {
        return badRequest(c, "invalid_json");
      }
    }
    const parsed = webhookTestBody.safeParse(raw);
    if (!parsed.success) return badRequest(c, parsed.error.flatten());

    let url = parsed.data.url ? validateWebhookUrl(parsed.data.url) : null;
    if (!url) {
      const db = getDb(c.env);
      const row = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, WEBHOOK_SETTING_KEY))
        .get();
      url = row ? validateWebhookUrl(row.value) : null;
    }
    if (!url) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      return c.json(
        { error: "webhook_url_invalid_or_missing" },
        422,
      );
    }

    const sessionUser = c.get("user");
    const payload = formatWebhookPayload({
      comment: {
        id: 0,
        body: "测试消息 / Test webhook from bangdream.org admin panel.",
        created_at: Math.floor(Date.now() / 1000),
      },
      user: {
        id: sessionUser.id,
        github_login: sessionUser.github_login,
        display_name: sessionUser.display_name,
        avatar_url: sessionUser.avatar_url,
      },
      target: {
        id: 0,
        slug: null,
        title_zh: "Webhook 测试",
        title_en: "Webhook test",
      },
      kind: "news",
    });
    fireWebhook(c, url, payload);
    return respondAdmin(c, { ok: true, url });
  });

  return router;
}
