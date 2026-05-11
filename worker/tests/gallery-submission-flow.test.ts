import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { signJwt } from "../src/auth/jwt";
import { getDb } from "../src/db/client";
import {
  emailAggregations,
  events,
  galleryItems,
  gallerySubmissions,
  users,
} from "../src/db/schema";
import { createApp } from "../src/index";
import type { RateLimitBinding } from "../src/lib/rate-limit";
import { SESSION_COOKIE } from "../src/utils/cookies";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

function buildMinimalJpeg(w: number, h: number): Uint8Array {
  const out: number[] = [];
  out.push(0xff, 0xd8); // SOI
  const app0 = [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  out.push(0xff, 0xe0, (app0.length + 2) >> 8, (app0.length + 2) & 0xff);
  for (const b of app0) out.push(b);
  const sof0: number[] = [
    0x08,
    (h >> 8) & 0xff, h & 0xff,
    (w >> 8) & 0xff, w & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  out.push(0xff, 0xc0, (sof0.length + 2) >> 8, (sof0.length + 2) & 0xff);
  for (const b of sof0) out.push(b);
  const sos = [0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00];
  out.push(0xff, 0xda, (sos.length + 2) >> 8, (sos.length + 2) & 0xff);
  for (const b of sos) out.push(b);
  out.push(0xaa, 0xbb, 0xcc);
  out.push(0xff, 0xd9);
  return new Uint8Array(out);
}

function asArrayBuffer(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function rlEnv() {
  const pass: RateLimitBinding = { limit: async () => ({ success: true }) };
  return { RATE_LIMIT_HOUR: pass, RATE_LIMIT_DAY: pass };
}

async function adminCookie(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const row = await getDb(env)
    .insert(users)
    .values({ githubLogin: "flow-admin", githubId: 555, role: "admin", createdAt: now })
    .returning({ id: users.id })
    .get();
  const jwt = await signJwt(
    { uid: row.id, role: "admin", exp: now + 60 },
    SECRET,
  );
  return `${SESSION_COOKIE}=${jwt}`;
}

beforeEach(async () => {
  await getDb(env).delete(gallerySubmissions).run();
  await getDb(env).delete(galleryItems).run();
  await getDb(env).delete(emailAggregations).run();
  await getDb(env).delete(events).run();
  await getDb(env).delete(users).run();
});

describe("Integration: submit → approve → public listing", () => {
  it("public POST submit → admin approve → public GET /api/gallery/items lists it", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File([asArrayBuffer(buildMinimalJpeg(800, 600))], "shot.jpg", {
        type: "image/jpeg",
      }),
    );
    form.append("nickname", "alice");
    form.append("caption", "live show vibe");
    form.append("terms", "true");

    const submitRes = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.42" } },
      { ...env, ...rlEnv() },
    );
    expect(submitRes.status).toBe(201);
    const submitted = (await submitRes.json()) as { id: number };

    const cookie = await adminCookie();
    const approveRes = await createApp().request(
      `https://x/api/admin/gallery/submissions/${submitted.id}/approve`,
      { method: "POST", headers: { Cookie: cookie } },
      env,
    );
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as {
      gallery_item_id: number;
      new_r2_key: string;
    };

    const listRes = await createApp().request(
      "https://x/api/gallery",
      { method: "GET" },
      env,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as {
      items: { id: number; caption: string | null; image_url: string }[];
      total: number;
    };
    const ourItem = list.items.find((i) => i.id === approved.gallery_item_id);
    expect(ourItem).toBeTruthy();
    expect(ourItem!.caption).toBe("live show vibe");
    expect(ourItem!.image_url).toContain(approved.new_r2_key);

    // R2: pending key 404, approved key 200
    const oldHead = await env.IMAGES.head(
      `submissions/${approved.new_r2_key.split("/")[1]}`,
    );
    expect(oldHead).toBeNull();
    const newHead = await env.IMAGES.head(approved.new_r2_key);
    expect(newHead).not.toBeNull();
  });

  it("submit → reject → R2 key 404, no public listing", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File([asArrayBuffer(buildMinimalJpeg(800, 600))], "shot.jpg", {
        type: "image/jpeg",
      }),
    );
    form.append("nickname", "bob");
    form.append("terms", "true");

    const submitRes = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.43" } },
      { ...env, ...rlEnv() },
    );
    expect(submitRes.status).toBe(201);
    const { id } = (await submitRes.json()) as { id: number };
    const before = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, id))
      .get();
    const r2Key = before!.r2Key;

    const cookie = await adminCookie();
    const rejectRes = await createApp().request(
      `https://x/api/admin/gallery/submissions/${id}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ reason: "图片模糊或质量不佳" }),
        headers: { Cookie: cookie, "Content-Type": "application/json" },
      },
      env,
    );
    expect(rejectRes.status).toBe(200);
    const head = await env.IMAGES.head(r2Key);
    expect(head).toBeNull();

    const listRes = await createApp().request(
      "https://x/api/gallery",
      { method: "GET" },
      env,
    );
    const list = (await listRes.json()) as { items: { id: number }[] };
    expect(list.items).toHaveLength(0);
  });
});
