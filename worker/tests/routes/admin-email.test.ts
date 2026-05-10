import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { createApp } from "../../src/index";
import { SESSION_COOKIE } from "../../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";
const URL_TEST = "https://x/api/admin/email/test";

async function clearAll(): Promise<void> {
  const db = getDb(env);
  await db.delete(users).run();
}

beforeEach(async () => {
  await clearAll();
  vi.restoreAllMocks();
});
afterEach(clearAll);

async function seedUser(role: "admin" | "member"): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const idSuffix = role === "admin" ? 100 : 200;
  const row = await db
    .insert(users)
    .values({
      githubLogin: `${role}-u`,
      githubId: idSuffix,
      role,
      displayName: `${role} u`,
      avatarUrl: null,
      createdAt: now,
    })
    .returning({ id: users.id })
    .get();
  return row.id;
}

async function adminCookie(): Promise<string> {
  const uid = await seedUser("admin");
  const jwt = await signJwt(
    { uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

async function memberCookie(): Promise<string> {
  const uid = await seedUser("member");
  const jwt = await signJwt(
    { uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

function resendOk(id = "msg_test_int_1", reqId = "req_int_ok"): Response {
  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: {
      "X-Request-Id": reqId,
      "Content-Type": "application/json",
    },
  });
}

function resendErr(
  status: number,
  body: unknown = {},
  reqId = "req_int_err",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "X-Request-Id": reqId,
      "Content-Type": "application/json",
    },
  });
}

describe("POST /api/admin/email/test", () => {
  it("29. 401 unauthorized without cookie", async () => {
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unauthorized");
  });

  it("30. 403 forbidden with member-role cookie", async () => {
    const cookie = await memberCookie();
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("forbidden");
  });

  it("31. 200 admin + valid `to` + fetch mocked OK -> {messageId, to, sent_at}", async () => {
    const cookie = await adminCookie();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      resendOk("msg_route_ok"),
    );
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as {
      messageId: string;
      to: string;
      sent_at: string;
    };
    expect(body.messageId).toBe("msg_route_ok");
    expect(body.to).toBe("admin@bangdream.org");
    expect(typeof body.sent_at).toBe("string");
    expect(body.sent_at).toMatch(/T/);
  });

  it("32. 400 bad_request when `to` not an email (zod envelope)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "not-an-email" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail: unknown };
    expect(body.error).toBe("bad_request");
    expect(body.detail).toBeDefined();
  });

  it("33. 400 bad_request when `to` field missing", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("34. 400 bad_request with extra fields (zod strict)", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "admin@bangdream.org",
          subject: "tampering",
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("35. 400 invalid_json on malformed JSON body", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "not json",
      },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe("bad_request");
    expect(body.detail).toBe("invalid_json");
  });

  it("36. 502 with Resend 422 -> {error, code, status:422, requestId, message_zh, message_en}", async () => {
    const cookie = await adminCookie();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      resendErr(
        422,
        {
          name: "validation_error",
          code: "invalid_to_address",
        },
        "req_route_422",
      ),
    );
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as {
      error: string;
      code: string;
      status: number;
      requestId?: string;
      message_zh: string;
      message_en: string;
    };
    expect(body.error).toBe("email_send_failed");
    expect(body.code).toBe("RESEND_4XX");
    expect(body.status).toBe(422);
    expect(body.requestId).toBe("req_route_422");
    expect(body.message_zh).toContain("Resend");
    expect(body.message_en).toContain("Resend");
  });

  it("37. 502 with Resend 429 -> code RESEND_RATE_LIMITED", async () => {
    const cookie = await adminCookie();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      resendErr(429, { name: "rate_limit_exceeded" }, "req_route_429"),
    );
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("RESEND_RATE_LIMITED");
  });

  it("38. 502 when env.RESEND_API_KEY = '' -> code MISSING_API_KEY", async () => {
    const cookie = await adminCookie();
    const noKey = { ...env, RESEND_API_KEY: "" } as typeof env;
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      noKey,
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("MISSING_API_KEY");
  });

  it("39. 502 when fetch rejects -> code NETWORK_ERROR", async () => {
    const cookie = await adminCookie();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("network down"),
    );
    const res = await createApp().request(
      URL_TEST,
      {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ to: "admin@bangdream.org" }),
      },
      env,
    );
    expect(res.status).toBe(502);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("NETWORK_ERROR");
  });

  it("40. OPTIONS preflight handled by global CORS middleware", async () => {
    const res = await createApp().request(
      URL_TEST,
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://bangdream.org",
          "Access-Control-Request-Method": "POST",
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://bangdream.org",
    );
    expect(res.headers.get("Vary")).toContain("Origin");
  });
});
