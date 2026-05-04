import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signJwt } from "../../src/auth/jwt";
import { getDb } from "../../src/db/client";
import { users } from "../../src/db/schema";
import { createApp } from "../../src/index";
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

async function adminCookie(): Promise<string> {
  const uid = await seedUser("admin", "admin-up", 100);
  const jwt = await signJwt(
    { uid, role: "admin", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

async function memberCookie(): Promise<string> {
  const uid = await seedUser("member", "member-up", 101);
  const jwt = await signJwt(
    { uid, role: "member", exp: Math.floor(Date.now() / 1000) + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

beforeEach(async () => {
  await getDb(env).delete(users).run();
});

afterEach(async () => {
  await getDb(env).delete(users).run();
});

function makeForm(parts: {
  file?: { content: Uint8Array; type: string; name: string };
  kind?: string;
  slug?: string;
}): FormData {
  const form = new FormData();
  if (parts.file) {
    form.append(
      "file",
      new File([parts.file.content], parts.file.name, { type: parts.file.type }),
    );
  }
  if (parts.kind !== undefined) form.append("kind", parts.kind);
  if (parts.slug !== undefined) form.append("slug", parts.slug);
  return form;
}

const PNG_BYTES = new Uint8Array([
  // 8-byte PNG signature
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  // a minimal payload (not a real PNG, but content-type drives validation)
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

describe("POST /api/upload", () => {
  it("returns 401 without session cookie", async () => {
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/png", name: "x.png" },
      kind: "news",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form },
      env,
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 403 for member role", async () => {
    const cookie = await memberCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/png", name: "x.png" },
      kind: "news",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 400 missing file", async () => {
    const cookie = await adminCookie();
    const form = makeForm({ kind: "news" });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_file");
  });

  it("returns 400 missing kind", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/png", name: "x.png" },
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("returns 400 invalid kind", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/png", name: "x.png" },
      kind: "members-bad",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("returns 415 for unsupported content-type", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "application/pdf", name: "doc.pdf" },
      kind: "news",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unsupported_media_type");
  });

  it("returns 400 for empty file", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: new Uint8Array(0), type: "image/png", name: "empty.png" },
      kind: "news",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("empty_file");
  });

  it("returns 413 when file exceeds 5MB", async () => {
    const cookie = await adminCookie();
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big[0] = 0x89;
    const form = makeForm({
      file: { content: big, type: "image/png", name: "big.png" },
      kind: "news",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("payload_too_large");
  });

  it("returns 201 with url+key+size+contentType on happy path (PNG, news)", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/png", name: "Hello World.png" },
      kind: "news",
      slug: "custom-slug",
    });
    const before = Date.now();
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as {
      url: string;
      key: string;
      size: number;
      contentType: string;
    };
    expect(body.contentType).toBe("image/png");
    expect(body.size).toBe(PNG_BYTES.length);
    expect(body.key).toMatch(/^news\/custom-slug-\d+\.png$/);
    expect(body.url).toBe(`${env.CDN_ORIGIN}/${body.key}`);
    const tsMatch = body.key.match(/-(\d+)\.png$/);
    expect(tsMatch).not.toBeNull();
    const ts = Number(tsMatch![1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now() + 1000);

    const head = await env.IMAGES.head(body.key);
    expect(head).not.toBeNull();
    expect(head!.httpMetadata?.contentType).toBe("image/png");
    expect(head!.httpMetadata?.cacheControl).toBe("public, max-age=31536000, immutable");
  });

  it("auto-generates slug from filename when slug field missing", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/jpeg", name: "Tour Poster 2026.jpeg" },
      kind: "events",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { key: string };
    expect(body.key).toMatch(/^events\/tour-poster-2026-\d+\.jpg$/);
  });

  it("uses extension from content-type, not filename extension", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/webp", name: "weird.bin" },
      kind: "members",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { key: string };
    expect(body.key).toMatch(/^members\/weird-\d+\.webp$/);
  });

  it("normalises slug field to kebab-case before storing", async () => {
    const cookie = await adminCookie();
    const form = makeForm({
      file: { content: PNG_BYTES, type: "image/gif", name: "x.gif" },
      kind: "news",
      slug: "My Custom Slug!!!",
    });
    const res = await createApp().request(
      "https://x/api/upload",
      { method: "POST", body: form, headers: { Cookie: cookie } },
      env,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { key: string };
    expect(body.key).toMatch(/^news\/my-custom-slug-\d+\.gif$/);
  });

  it("accepts each allowed content-type", async () => {
    const cookie = await adminCookie();
    for (const [type, ext] of [
      ["image/png", "png"],
      ["image/jpeg", "jpg"],
      ["image/webp", "webp"],
      ["image/gif", "gif"],
    ] as const) {
      const form = makeForm({
        file: { content: PNG_BYTES, type, name: `f.${ext}` },
        kind: "news",
        slug: `slug-${ext}`,
      });
      const res = await createApp().request(
        "https://x/api/upload",
        { method: "POST", body: form, headers: { Cookie: cookie } },
        env,
      );
      expect(res.status, `content-type ${type}`).toBe(201);
      const body = (await res.json()) as { key: string };
      expect(body.key).toMatch(new RegExp(`^news/slug-${ext}-\\d+\\.${ext}$`));
    }
  });

  it("returns 400 for non-multipart request body", async () => {
    const cookie = await adminCookie();
    const res = await createApp().request(
      "https://x/api/upload",
      {
        method: "POST",
        body: JSON.stringify({ kind: "news" }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
