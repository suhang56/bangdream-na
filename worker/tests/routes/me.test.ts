import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

beforeEach(async () => {
  await getDb(env).delete(users).run();
});

afterEach(async () => {
  await getDb(env).delete(users).run();
});

describe("GET /api/me", () => {
  it("returns 401 with no cookie", async () => {
    const res = await createApp().request("https://api.bangdream.org/api/me", {}, env);
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 401 with bogus cookie", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/me",
      { headers: { Cookie: `${SESSION_COOKIE}=not.a.token` } },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 + user JSON for valid session", async () => {
    const db = getDb(env);
    const now = Math.floor(Date.now() / 1000);
    const inserted = await db
      .insert(users)
      .values({
        githubLogin: "ada",
        githubId: 100,
        displayName: "Ada Lovelace",
        avatarUrl: "https://avatars/ada",
        role: "admin",
        createdAt: now,
      })
      .returning({ id: users.id })
      .get();

    const jwt = await signJwt({ uid: inserted.id, role: "admin", exp: now + 60 }, SECRET);
    const res = await createApp().request(
      "https://api.bangdream.org/api/me",
      { headers: { Cookie: `${SESSION_COOKIE}=${jwt}` } },
      env,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { user: { id: number; github_login: string; role: string } };
    expect(body.user.id).toBe(inserted.id);
    expect(body.user.github_login).toBe("ada");
    expect(body.user.role).toBe("admin");
  });
});
