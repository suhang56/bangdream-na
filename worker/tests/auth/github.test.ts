import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GithubFetchers } from "../../src/auth/github";
import { buildGithubAuthRoutes } from "../../src/auth/github";
import { getDb } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "../../src/utils/cookies";

function makeApp(fetchers?: GithubFetchers) {
  const app = new Hono<{ Bindings: typeof env }>();
  app.route("/api/auth", buildGithubAuthRoutes(fetchers ? { fetchers } : {}));
  return app;
}

function getSetCookies(headers: Headers): string[] {
  // @ts-expect-error workerd Headers exposes getSetCookie
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = headers.get("Set-Cookie");
  return single ? [single] : [];
}

beforeEach(async () => {
  const db = getDb(env);
  await db.delete(users).run();
});

afterEach(async () => {
  const db = getDb(env);
  await db.delete(users).run();
});

describe("GET /api/auth/github (initiation)", () => {
  it("redirects to GitHub with state cookie set", async () => {
    const app = makeApp();
    const res = await app.request("https://api.bangdream.org/api/auth/github", {}, env);

    expect(res.status).toBe(302);
    const location = res.headers.get("Location") ?? "";
    expect(location).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    expect(location).toContain(`client_id=${env.GITHUB_CLIENT_ID}`);
    expect(location).toContain("scope=read%3Auser");
    expect(location).toContain("state=");

    const cookies = getSetCookies(res.headers);
    const stateCookie = cookies.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`));
    expect(stateCookie).toBeDefined();
    expect(stateCookie).toContain("HttpOnly");
    expect(stateCookie).toContain("Secure");
    expect(stateCookie).toMatch(/SameSite=Lax/);
    expect(stateCookie).toContain("Path=/");
    expect(stateCookie).not.toContain("Domain=");
  });
});

describe("GET /api/auth/github/callback (CSRF state)", () => {
  it("rejects when state cookie missing", async () => {
    const app = makeApp();
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=abc&state=xyz",
      {},
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_oauth_state");
  });

  it("rejects when state cookie mismatches query param", async () => {
    const app = makeApp();
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=abc&state=xyz",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=different` } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("rejects when code missing", async () => {
    const app = makeApp();
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?state=xyz",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=xyz` } },
      env,
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/github/callback (success)", () => {
  it("upserts user with admin role from allowlist + sets session cookie + redirects", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() {
        return { access_token: "gh-token", token_type: "bearer", scope: "read:user" };
      },
      async fetchUser() {
        return { id: 12345, login: "suhang56", name: "西瓜", avatar_url: "https://avatars/0" };
      },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=valid-code&state=s1",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s1` } },
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://bangdream.org/admin");

    const cookies = getSetCookies(res.headers);
    const session = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(session).toBeDefined();
    expect(session).toContain("HttpOnly");
    expect(session).toContain("Secure");
    expect(session).toMatch(/SameSite=Lax/);
    expect(session).toContain("Max-Age=604800");
    expect(session).toContain("Path=/");
    expect(session).not.toContain("Domain=");

    const cleared = cookies.find((c) => c.startsWith(`${OAUTH_STATE_COOKIE}=`));
    expect(cleared).toBeDefined();
    expect(cleared).toContain("Max-Age=0");

    const db = getDb(env);
    const row = await db.select().from(users).where(eq(users.githubId, 12345)).get();
    expect(row).toBeDefined();
    expect(row?.githubLogin).toBe("suhang56");
    expect(row?.role).toBe("admin"); // from ADMIN_GITHUB_LOGINS allowlist
    expect(row?.displayName).toBe("西瓜");
  });

  it("first-ever login becomes admin when allowlist empty", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() {
        return { access_token: "gh-token" };
      },
      async fetchUser() {
        return { id: 99, login: "first-ever", name: "First", avatar_url: null };
      },
    };
    const app = makeApp(fetchers);
    const customEnv = { ...env, ADMIN_GITHUB_LOGINS: "" };
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      customEnv,
    );
    expect(res.status).toBe(302);

    const db = getDb(env);
    const row = await db.select().from(users).where(eq(users.githubId, 99)).get();
    expect(row?.role).toBe("admin");
  });

  it("non-allowlist + non-empty users → member role", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({
      githubLogin: "preexisting",
      githubId: 1,
      role: "admin",
      createdAt: now,
    }).run();

    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      async fetchUser() { return { id: 200, login: "newcomer", name: null, avatar_url: null }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(302);

    const row = await db.select().from(users).where(eq(users.githubId, 200)).get();
    expect(row?.role).toBe("member");
  });

  it("existing user re-login preserves member role unless allowlisted", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({
      githubLogin: "olduser",
      githubId: 555,
      role: "member",
      createdAt: now,
    }).run();

    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      async fetchUser() { return { id: 555, login: "olduser", name: "Updated", avatar_url: "x" }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(302);

    const row = await db.select().from(users).where(eq(users.githubId, 555)).get();
    expect(row?.role).toBe("member");
    expect(row?.displayName).toBe("Updated");
    expect(row?.avatarUrl).toBe("x");
    expect(row?.lastLoginAt).toBeGreaterThan(0);
  });

  it("existing user gets promoted to admin if now in allowlist", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({
      githubLogin: "suhang56",
      githubId: 777,
      role: "member",
      createdAt: now,
    }).run();

    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      async fetchUser() { return { id: 777, login: "suhang56", name: null, avatar_url: null }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(302);

    const row = await db.select().from(users).where(eq(users.githubId, 777)).get();
    expect(row?.role).toBe("admin");
  });

  it("matches allowlist case-insensitively", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      async fetchUser() { return { id: 4242, login: "SuHang56", name: null, avatar_url: null }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(302);
    const db = getDb(env);
    const row = await db.select().from(users).where(eq(users.githubId, 4242)).get();
    expect(row?.role).toBe("admin");
  });
});

describe("GET /api/auth/github/callback (error paths)", () => {
  it("returns 502 if exchange throws", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() { throw new Error("network"); },
      async fetchUser() { return { id: 1, login: "x", name: null, avatar_url: null }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 if exchange returns error without access_token", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() { return { error: "bad_verification_code" }; },
      async fetchUser() { return { id: 1, login: "x", name: null, avatar_url: null }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_verification_code");
  });

  it("returns 502 if /user fetch throws", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      async fetchUser() { throw new Error("github 503"); },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(502);
  });

  it("returns 502 if /user response is malformed", async () => {
    const fetchers: GithubFetchers = {
      async exchangeCode() { return { access_token: "tok" }; },
      // @ts-expect-error intentional malformed payload
      async fetchUser() { return { login: "no-id" }; },
    };
    const app = makeApp(fetchers);
    const res = await app.request(
      "https://api.bangdream.org/api/auth/github/callback?code=c&state=s",
      { headers: { Cookie: `${OAUTH_STATE_COOKIE}=s` } },
      env,
    );
    expect(res.status).toBe(502);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears session cookie", async () => {
    const app = makeApp();
    const res = await app.request("https://api.bangdream.org/api/auth/logout", { method: "POST" }, env);
    expect(res.status).toBe(204);
    const cookies = getSetCookies(res.headers);
    const cleared = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(cleared).toBeDefined();
    expect(cleared).toContain("Max-Age=0");
  });
});
