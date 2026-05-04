import type { Context, MiddlewareHandler, Next } from "hono";
import { eq } from "drizzle-orm";
import type { AppVariables, Env, SessionUser } from "../custom-env";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { SESSION_COOKIE, parseCookies } from "../utils/cookies";
import { JwtError, verifyJwt } from "./jwt";

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

export async function loadSessionUser(c: AppContext): Promise<SessionUser | null> {
  const cookies = parseCookies(c.req.header("Cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  let payload;
  try {
    payload = await verifyJwt(token, c.env.JWT_SECRET);
  } catch (err) {
    if (err instanceof JwtError) return null;
    throw err;
  }

  const db = getDb(c.env);
  const row = await db.select().from(users).where(eq(users.id, payload.uid)).get();
  if (!row) return null;

  return {
    id: row.id,
    github_login: row.githubLogin,
    display_name: row.displayName,
    avatar_url: row.avatarUrl,
    role: row.role,
  };
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (
  c: AppContext,
  next: Next,
) => {
  const user = await loadSessionUser(c);
  if (!user) {
    return c.json({ error: "unauthorized" }, 401, { "Cache-Control": "no-store" });
  }
  c.set("user", user);
  await next();
};

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (
  c: AppContext,
  next: Next,
) => {
  const user = await loadSessionUser(c);
  if (!user) {
    return c.json({ error: "unauthorized" }, 401, { "Cache-Control": "no-store" });
  }
  if (user.role !== "admin") {
    return c.json({ error: "forbidden" }, 403, { "Cache-Control": "no-store" });
  }
  c.set("user", user);
  await next();
};
