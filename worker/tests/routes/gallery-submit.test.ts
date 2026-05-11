import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../../src/db/client";
import {
  emailAggregations,
  events,
  gallerySubmissions,
} from "../../src/db/schema";
import { createApp } from "../../src/index";
import type { RateLimitBinding } from "../../src/lib/rate-limit";

function asArrayBuffer(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function buildMinimalJpeg(width: number, height: number, withExif = true): Uint8Array {
  const out: number[] = [];
  out.push(0xff, 0xd8); // SOI
  // APP0 JFIF
  const app0 = [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  out.push(0xff, 0xe0, (app0.length + 2) >> 8, (app0.length + 2) & 0xff);
  for (const b of app0) out.push(b);
  if (withExif) {
    // APP1 EXIF (will be stripped)
    const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef];
    out.push(0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff);
    for (const b of exif) out.push(b);
  }
  // SOF0
  const sof0: number[] = [
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  out.push(0xff, 0xc0, (sof0.length + 2) >> 8, (sof0.length + 2) & 0xff);
  for (const b of sof0) out.push(b);
  // SOS
  const sos = [0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00];
  out.push(0xff, 0xda, (sos.length + 2) >> 8, (sos.length + 2) & 0xff);
  for (const b of sos) out.push(b);
  // scan data
  out.push(0xaa, 0xbb, 0xcc);
  // EOI
  out.push(0xff, 0xd9);
  return new Uint8Array(out);
}

function buildMinimalPng(width: number, height: number): Uint8Array {
  const out: number[] = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // sig
    0x00, 0x00, 0x00, 0x0d, // IHDR len = 13
    0x49, 0x48, 0x44, 0x52,
    (width >> 24) & 0xff, (width >> 16) & 0xff, (width >> 8) & 0xff, width & 0xff,
    (height >> 24) & 0xff, (height >> 16) & 0xff, (height >> 8) & 0xff, height & 0xff,
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // dummy CRC (parser doesn't verify)
    // IDAT chunk
    0x00, 0x00, 0x00, 0x0a,
    0x49, 0x44, 0x41, 0x54,
    0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00,
    // IEND
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44,
    0x00, 0x00, 0x00, 0x00,
  ];
  return new Uint8Array(out);
}

function buildMinimalWebp(width: number, height: number): Uint8Array {
  // VP8 lossy chunk with dimensions at offsets 6..9 inside chunk data.
  const vp8Data = new Uint8Array(20);
  vp8Data[3] = 0x9d;
  vp8Data[4] = 0x01;
  vp8Data[5] = 0x2a;
  vp8Data[6] = width & 0xff;
  vp8Data[7] = (width >> 8) & 0xff;
  vp8Data[8] = height & 0xff;
  vp8Data[9] = (height >> 8) & 0xff;

  const chunkHeader = new Uint8Array([
    0x56, 0x50, 0x38, 0x20, // 'VP8 '
    vp8Data.length & 0xff,
    (vp8Data.length >> 8) & 0xff,
    (vp8Data.length >> 16) & 0xff,
    (vp8Data.length >> 24) & 0xff,
  ]);

  const bodyLen = 4 + chunkHeader.length + vp8Data.length;
  const out = new Uint8Array(8 + bodyLen);
  out.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  out[4] = bodyLen & 0xff;
  out[5] = (bodyLen >> 8) & 0xff;
  out[6] = (bodyLen >> 16) & 0xff;
  out[7] = (bodyLen >> 24) & 0xff;
  out.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  out.set(chunkHeader, 12);
  out.set(vp8Data, 12 + chunkHeader.length);
  return out;
}

function makeForm(parts: {
  file?: { content: Uint8Array; type: string; name: string };
  nickname?: string;
  caption?: string;
  event_id?: string;
  event_label?: string;
  taken_on?: string;
  terms?: string;
}): FormData {
  const form = new FormData();
  if (parts.file) {
    form.append(
      "file",
      new File([asArrayBuffer(parts.file.content)], parts.file.name, {
        type: parts.file.type,
      }),
    );
  }
  if (parts.nickname !== undefined) form.append("nickname", parts.nickname);
  if (parts.caption !== undefined) form.append("caption", parts.caption);
  if (parts.event_id !== undefined) form.append("event_id", parts.event_id);
  if (parts.event_label !== undefined)
    form.append("event_label", parts.event_label);
  if (parts.taken_on !== undefined) form.append("taken_on", parts.taken_on);
  if (parts.terms !== undefined) form.append("terms", parts.terms);
  return form;
}

// Convenience helper: most happy-path tests don't care about activity shape,
// they just need a valid activity to clear the new required-mutex gate. Use a
// free-form label by default so we don't have to seed an event_id.
const DEFAULT_ACTIVITY = "test event";

async function seedEvent(slug = "afterglow-tour-tokyo"): Promise<number> {
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .insert(events)
    .values({
      slug,
      titleZh: "TEST 演出",
      titleEn: "TEST Tour",
      startAt: now + 86400,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: events.id })
    .get();
  return row.id;
}

function rlEnv(opts: { hourPass?: boolean; dayPass?: boolean } = {}) {
  const limitFor = (pass: boolean): RateLimitBinding => ({
    limit: async () => ({ success: pass }),
  });
  return {
    RATE_LIMIT_HOUR: limitFor(opts.hourPass ?? true),
    RATE_LIMIT_DAY: limitFor(opts.dayPass ?? true),
  };
}

beforeEach(async () => {
  await getDb(env).delete(gallerySubmissions).run();
  await getDb(env).delete(emailAggregations).run();
  await getDb(env).delete(events).run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/gallery/submit — validation", () => {
  it("returns 400 missing_file when no file field", async () => {
    const form = makeForm({ nickname: "alice", terms: "true" });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("missing_file");
  });

  it("returns 415 for unsupported content-type (GIF)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/gif", name: "x.gif" },
      nickname: "alice",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unsupported_media_type");
  });

  it("returns 413 when file exceeds 8 MB", async () => {
    const big = new Uint8Array(8 * 1024 * 1024 + 1);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    const form = makeForm({
      file: { content: big, type: "image/jpeg", name: "big.jpg" },
      nickname: "alice",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("payload_too_large");
  });

  it("returns 400 missing terms", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad_request");
  });

  it("returns 400 nickname empty/whitespace-only", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "   ",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 nickname > 32 chars", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "a".repeat(33),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("accepts surrogate-pair emoji nickname up to 32 UTF-16 units", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "🎸".repeat(16), // 16 surrogate pairs = 32 UTF-16 units
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
  });

  it("returns 400 caption > 200 chars", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      caption: "x".repeat(201),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 event_not_found when event_id does not exist", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_id: "99999",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("event_not_found");
  });
});

describe("POST /api/gallery/submit — magic byte sniff", () => {
  it("returns 415 when file claims image/jpeg but bytes are PDF", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x00, 0x00, 0x00]);
    const form = makeForm({
      file: { content: pdf, type: "image/jpeg", name: "fake.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unsupported_media_type");
  });

  it("returns 415 when file declares image/png but bytes are JPEG", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/png", name: "fake.png" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(415);
  });
});

describe("POST /api/gallery/submit — dimension validation", () => {
  it("returns 400 image_dimensions_invalid when width < 200", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(100, 500), type: "image/jpeg", name: "tiny.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("image_dimensions_invalid");
  });

  it("returns 400 when aspect ratio exceeds 6:1 (very wide banner)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(6000, 500), type: "image/jpeg", name: "wide.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("image_dimensions_invalid");
  });

  it("accepts valid dimensions exactly at 200x200 boundary", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(200, 200), type: "image/jpeg", name: "ok.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
  });
});

describe("POST /api/gallery/submit — happy path", () => {
  it("accepts a valid JPEG with all fields, persists to D1 + R2", async () => {
    const eventId = await seedEvent();
    const form = makeForm({
      file: { content: buildMinimalJpeg(800, 600), type: "image/jpeg", name: "photo.jpg" },
      nickname: "alice",
      caption: "good show",
      event_id: String(eventId),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: number;
      submitted_at: number;
      status: "pending";
    };
    expect(body.id).toBeGreaterThan(0);
    expect(body.status).toBe("pending");

    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow).toBeTruthy();
    expect(dbRow!.nickname).toBe("alice");
    expect(dbRow!.caption).toBe("good show");
    expect(dbRow!.eventId).toBe(eventId);
    expect(dbRow!.status).toBe("pending");
    expect(dbRow!.r2Key).toMatch(/^submissions\/[0-9a-f-]+\.jpg$/);
    expect(dbRow!.width).toBe(800);
    expect(dbRow!.height).toBe(600);
    expect(dbRow!.contentType).toBe("image/jpeg");

    const r2Obj = await env.IMAGES.head(dbRow!.r2Key);
    expect(r2Obj).not.toBeNull();
    expect(r2Obj!.httpMetadata?.cacheControl).toBe("private, no-store");
  });

  it("accepts a PNG happy path", async () => {
    const form = makeForm({
      file: { content: buildMinimalPng(640, 480), type: "image/png", name: "p.png" },
      nickname: "bob",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.contentType).toBe("image/png");
    expect(dbRow!.r2Key).toMatch(/\.png$/);
  });

  it("accepts a WebP happy path", async () => {
    const form = makeForm({
      file: { content: buildMinimalWebp(640, 480), type: "image/webp", name: "p.webp" },
      nickname: "carol",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.contentType).toBe("image/webp");
  });

  it("strips EXIF before R2 PUT — stored bytes have no APP1 segment", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500, true), type: "image/jpeg", name: "exif.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    const r2 = await env.IMAGES.get(dbRow!.r2Key);
    expect(r2).not.toBeNull();
    const stored = new Uint8Array(await r2!.arrayBuffer());
    for (let i = 0; i < stored.length - 1; i += 1) {
      if (stored[i] === 0xff && stored[i + 1] === 0xe1) {
        throw new Error(`APP1 EXIF survived to R2 at offset ${i}`);
      }
    }
  });

  it("enqueues digest aggregation row", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    const rows = await getDb(env).select().from(emailAggregations).all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].trigger).toBe("gallery-submission-notify");
    expect(rows[0].status).toBe("pending");
  });
});

describe("POST /api/gallery/submit — rate limit", () => {
  it("returns 429 hour-window when RATE_LIMIT_HOUR rejects", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv({ hourPass: false }) },
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });

  it("returns 429 day-window when RATE_LIMIT_DAY rejects", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv({ dayPass: false }) },
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("86400");
  });

  it("does not call D1 or R2 when rate limited (cheap rejection)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      terms: "true",
    });
    const r2PutSpy = vi.spyOn(env.IMAGES, "put");
    await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv({ hourPass: false }) },
    );
    expect(r2PutSpy).not.toHaveBeenCalled();
    const rows = await getDb(env).select().from(gallerySubmissions).all();
    expect(rows).toHaveLength(0);
  });
});

describe("POST /api/gallery/submit — XSS in caption preserved as data", () => {
  it("stores caption with <script> tag literally, no escaping at write", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      caption: "<script>alert(1)</script>",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.caption).toBe("<script>alert(1)</script>");
  });
});

// ── 0009: event_label + taken_on (R-revamp) ─────────────────────────────────

describe("POST /api/gallery/submit — activity mutex (event_id XOR event_label)", () => {
  it("400 bad_request {field: 'activity'} when neither event_id nor event_label provided", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail?: { field: string; detail?: string } };
    expect(body.error).toBe("bad_request");
    expect(body.detail).toEqual({ field: "activity" });
  });

  it("400 bad_request {field: 'activity', detail: 'mutex'} when BOTH event_id and event_label provided", async () => {
    const eventId = await seedEvent("mutex-event");
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_id: String(eventId),
      event_label: "free form",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail?: { field: string; detail?: string } };
    expect(body.error).toBe("bad_request");
    expect(body.detail).toEqual({ field: "activity", detail: "mutex" });
  });

  it("event_id only: persists with eventId set, eventLabel NULL", async () => {
    const eventId = await seedEvent("id-only");
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_id: String(eventId),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.eventId).toBe(eventId);
    expect(dbRow!.eventLabel).toBeNull();
  });
});

describe("POST /api/gallery/submit — event_label validation", () => {
  it("event_label only: persists with eventLabel set, eventId NULL", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "私下聚会",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.eventLabel).toBe("私下聚会");
    expect(dbRow!.eventId).toBeNull();
  });

  it("event_label trimmed before insert (leading/trailing whitespace stripped)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "   私下聚会   ",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.eventLabel).toBe("私下聚会");
  });

  it("event_label whitespace-only returns 400 bad_request", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "      ",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; detail?: { field: string } };
    expect(body.error).toBe("bad_request");
    expect(body.detail?.field).toBe("event_label");
  });

  it("event_label 80 chars exactly accepted (201)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "a".repeat(80),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
  });

  it("event_label 81 chars rejected (400)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "a".repeat(81),
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("event_label with control char rejected (400)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "bad label",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("event_label with emoji + CJK accepted (201)", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: "🎸现场",
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.eventLabel).toBe("🎸现场");
  });
});

describe("POST /api/gallery/submit — taken_on validation", () => {
  function formWith(takenOn: string): FormData {
    return makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      taken_on: takenOn,
      terms: "true",
    });
  }

  it("taken_on=2024-03-15 valid → stored", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2024-03-15"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.takenOn).toBe("2024-03-15");
  });

  it("taken_on omitted → NULL stored", async () => {
    const form = makeForm({
      file: { content: buildMinimalJpeg(500, 500), type: "image/jpeg", name: "x.jpg" },
      nickname: "alice",
      event_label: DEFAULT_ACTIVITY,
      terms: "true",
    });
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: form, headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.takenOn).toBeNull();
  });

  it("taken_on empty string → treated as omitted, NULL stored (201)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith(""), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number };
    const dbRow = await getDb(env)
      .select()
      .from(gallerySubmissions)
      .where(eq(gallerySubmissions.id, body.id))
      .get();
    expect(dbRow!.takenOn).toBeNull();
  });

  it("taken_on=2024-3-15 (no zero-pad) rejected (400)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2024-3-15"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("taken_on=2024-02-29 (leap year) accepted (201)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2024-02-29"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(201);
  });

  it("taken_on=2023-02-29 (non-leap year) rejected as invalid calendar date (400)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2023-02-29"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("taken_on=2025-02-30 rejected as invalid calendar date (400)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2025-02-30"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("taken_on=2099-01-01 rejected as future (400)", async () => {
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith("2099-01-01"), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });

  it("taken_on=today+2d rejected as future (400)", async () => {
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const res = await createApp().request(
      "https://x/api/gallery/submit",
      { method: "POST", body: formWith(iso), headers: { "CF-Connecting-IP": "203.0.113.1" } },
      { ...env, ...rlEnv() },
    );
    expect(res.status).toBe(400);
  });
});
