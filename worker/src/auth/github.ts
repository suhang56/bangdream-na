import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import type { AppVariables, Env } from "../custom-env";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import {
  OAUTH_STATE_COOKIE,
  buildClearOauthStateCookie,
  buildClearSessionCookie,
  buildOauthStateCookie,
  buildSessionCookie,
  parseCookies,
} from "../utils/cookies";
import { parseAdminAllowlist } from "../utils/validate";
import { signJwt } from "./jwt";
import { SESSION_MAX_AGE } from "../utils/cookies";

const FRONTEND_ADMIN_REDIRECT = "https://bangdream.org/admin";
const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

interface GithubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GithubFetchers {
  exchangeCode: (code: string, env: Env) => Promise<GithubTokenResponse>;
  fetchUser: (accessToken: string) => Promise<GithubUserResponse>;
}

export const defaultGithubFetchers: GithubFetchers = {
  async exchangeCode(code, env) {
    const res = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    if (!res.ok) {
      throw new Error(`github_token_http_${res.status}`);
    }
    return (await res.json()) as GithubTokenResponse;
  },
  async fetchUser(accessToken) {
    const res = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "bangdream-na-api",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      throw new Error(`github_user_http_${res.status}`);
    }
    return (await res.json()) as GithubUserResponse;
  },
};

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type AuthRouteOptions = { fetchers?: GithubFetchers };

export function buildGithubAuthRoutes(options: AuthRouteOptions = {}) {
  const fetchers = options.fetchers ?? defaultGithubFetchers;
  const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();

  router.get("/github", (c) => {
    const state = generateState();
    const params = new URLSearchParams({
      client_id: c.env.GITHUB_CLIENT_ID,
      redirect_uri: `${new URL(c.req.url).origin}/api/auth/github/callback`,
      scope: "read:user",
      state,
      allow_signup: "false",
    });
    c.header("Set-Cookie", buildOauthStateCookie(state));
    c.header("Cache-Control", "no-store");
    return c.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`, 302);
  });

  router.get("/github/callback", async (c) => {
    const url = new URL(c.req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookies = parseCookies(c.req.header("Cookie"));
    const cookieState = cookies[OAUTH_STATE_COOKIE];

    if (!code || !state || !cookieState || state !== cookieState) {
      c.header("Set-Cookie", buildClearOauthStateCookie());
      c.header("Cache-Control", "no-store");
      return c.json({ error: "invalid_oauth_state" }, 400);
    }

    let tokenResp: GithubTokenResponse;
    try {
      tokenResp = await fetchers.exchangeCode(code, c.env);
    } catch {
      c.header("Set-Cookie", buildClearOauthStateCookie());
      c.header("Cache-Control", "no-store");
      return c.json({ error: "oauth_exchange_failed" }, 502);
    }
    if (!tokenResp.access_token) {
      c.header("Set-Cookie", buildClearOauthStateCookie());
      c.header("Cache-Control", "no-store");
      return c.json({ error: tokenResp.error ?? "oauth_no_token" }, 502);
    }

    let ghUser: GithubUserResponse;
    try {
      ghUser = await fetchers.fetchUser(tokenResp.access_token);
    } catch {
      c.header("Set-Cookie", buildClearOauthStateCookie());
      c.header("Cache-Control", "no-store");
      return c.json({ error: "github_user_fetch_failed" }, 502);
    }
    if (typeof ghUser.id !== "number" || !ghUser.login) {
      c.header("Set-Cookie", buildClearOauthStateCookie());
      c.header("Cache-Control", "no-store");
      return c.json({ error: "github_user_malformed" }, 502);
    }

    const db = getDb(c.env);
    const allowlist = parseAdminAllowlist(c.env.ADMIN_GITHUB_LOGINS);
    const loginLc = ghUser.login.toLowerCase();
    const now = Math.floor(Date.now() / 1000);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.githubId, ghUser.id))
      .get();

    let userId: number;
    let role: "admin" | "member";

    if (existing) {
      // Role is the OUTPUT of login, not the input. Allowlist removal must
      // demote a previously-promoted admin on next login; without this the
      // DB role (`existing.role`) would survive forever.
      if (allowlist.has(loginLc)) {
        role = "admin";
      } else if (allowlist.size === 0) {
        role = existing.role;
      } else {
        role = "member";
      }
      await db
        .update(users)
        .set({
          githubLogin: ghUser.login,
          displayName: ghUser.name ?? null,
          avatarUrl: ghUser.avatar_url ?? null,
          role,
          lastLoginAt: now,
        })
        .where(eq(users.id, existing.id))
        .run();
      userId = existing.id;
    } else {
      let assignAdmin = false;
      if (allowlist.has(loginLc)) {
        assignAdmin = true;
      } else if (allowlist.size === 0) {
        const countRow = await db
          .select({ n: sql<number>`count(*)` })
          .from(users)
          .get();
        if ((countRow?.n ?? 0) === 0) assignAdmin = true;
      }
      role = assignAdmin ? "admin" : "member";

      const inserted = await db
        .insert(users)
        .values({
          githubLogin: ghUser.login,
          githubId: ghUser.id,
          displayName: ghUser.name ?? null,
          avatarUrl: ghUser.avatar_url ?? null,
          role,
          createdAt: now,
          lastLoginAt: now,
        })
        .returning({ id: users.id })
        .get();
      userId = inserted.id;
    }

    const exp = now + SESSION_MAX_AGE;
    const jwt = await signJwt({ uid: userId, role, exp }, c.env.JWT_SECRET);

    c.header("Set-Cookie", buildClearOauthStateCookie(), { append: true });
    c.header("Set-Cookie", buildSessionCookie(jwt), { append: true });
    c.header("Cache-Control", "no-store");
    return c.redirect(FRONTEND_ADMIN_REDIRECT, 302);
  });

  router.post("/logout", (c) => {
    c.header("Set-Cookie", buildClearSessionCookie());
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });

  return router;
}
