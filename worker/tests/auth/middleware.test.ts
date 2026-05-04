import { env } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { requireAdmin, requireAuth } from "../../src/auth/middleware";
import { getDb } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

async function seedUser(role: "admin" | "member", login: string, githubId: number): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(users)
    .values({ githubLogin: login, githubId, role, createdAt: now })
    .returning({ id: users.id })
    .get();
  return row.id;
}

function makeApp() {
  const app = new Hono<{ Bindings: typeof env }>();
  app.get("/protected", requireAuth, (c) => c.json({ user: c.get("user") }));
  app.get("/admin-only", requireAdmin, (c) => c.json({ user: c.get("user") }));
  return app;
}

beforeEach(async () => {
  await getDb(env).delete(users).run();
});

afterEach(async () => {
  await getDb(env).delete(users).run();
});

describe("requireAuth", () => {
  it("blocks request with no cookie → 401", async () => {
    const res = await makeApp().request("https://x/protected", {}, env);
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("blocks request with invalid JWT → 401", async () => {
    const res = await makeApp().request(
      "https://x/protected",
      { headers: { Cookie: `${SESSION_COOKIE}=garbage.jwt.token` } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("blocks request with expired JWT → 401", async () => {
    const uid = await seedUser("member", "exp-user", 1);
    const expired = await signJwt({ uid, role: "member", exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
    const res = await makeApp().request(
      "https://x/protected",
      { headers: { Cookie: `${SESSION_COOKIE}=${expired}` } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("blocks when user no longer exists in DB → 401", async () => {
    const jwt = await signJwt({ uid: 9999, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);
    const res = await makeApp().request(
      "https://x/protected",
      { headers: { Cookie: `${SESSION_COOKIE}=${jwt}` } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("allows request with valid JWT and existing user → 200 with user", async () => {
    const uid = await seedUser("member", "valid-user", 7);
    const jwt = await signJwt({ uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);
    const res = await makeApp().request(
      "https://x/protected",
      { headers: { Cookie: `${SESSION_COOKIE}=${jwt}` } },
      env,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { github_login: string } };
    expect(body.user.github_login).toBe("valid-user");
  });
});

describe("requireAdmin", () => {
  it("returns 401 with no cookie", async () => {
    const res = await makeApp().request("https://x/admin-only", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns 403 for member role", async () => {
    const uid = await seedUser("member", "member-x", 11);
    const jwt = await signJwt({ uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);
    const res = await makeApp().request(
      "https://x/admin-only",
      { headers: { Cookie: `${SESSION_COOKIE}=${jwt}` } },
      env,
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("allows admin role → 200", async () => {
    const uid = await seedUser("admin", "admin-x", 12);
    const jwt = await signJwt({ uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);
    const res = await makeApp().request(
      "https://x/admin-only",
      { headers: { Cookie: `${SESSION_COOKIE}=${jwt}` } },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("uses DB role even if JWT claim drifted (DB is source of truth)", async () => {
    // DB row says member, but JWT was minted with admin claim (e.g. user got demoted server-side)
    // requireAdmin reads DB role via loadSessionUser → blocks.
    const uid = await seedUser("member", "demoted", 13);
    const stale = await signJwt({ uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 }, SECRET);
    const res = await makeApp().request(
      "https://x/admin-only",
      { headers: { Cookie: `${SESSION_COOKIE}=${stale}` } },
      env,
    );
    expect(res.status).toBe(403);
  });
});
