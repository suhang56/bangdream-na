import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
  ADMIN_CACHE_CONTROL,
  PUBLIC_CACHE_CONTROL,
  respondAdmin,
  respondPublic,
} from "../../src/utils/respond";

function makeApp(handler: (c: import("hono").Context) => Promise<Response> | Response) {
  const app = new Hono();
  app.get("/", handler);
  return app;
}

describe("respondPublic", () => {
  it("sets public Cache-Control + ETag + Vary headers", async () => {
    const app = makeApp((c) => respondPublic(c, { items: [], total: 0 }));
    const res = await app.request("https://x/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_CACHE_CONTROL);
    expect(res.headers.get("ETag")).toMatch(/^"[0-9a-f]{40}"$/);
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("returns same etag on repeated requests with same payload", async () => {
    const app = makeApp((c) => respondPublic(c, { a: 1, b: 2 }));
    const a = await app.request("https://x/");
    const b = await app.request("https://x/");
    expect(a.headers.get("ETag")).toBe(b.headers.get("ETag"));
  });

  it("returns 304 with no body when If-None-Match matches", async () => {
    const app = makeApp((c) => respondPublic(c, { items: [{ id: 1 }] }));
    const first = await app.request("https://x/");
    const etag = first.headers.get("ETag")!;
    const second = await app.request("https://x/", { headers: { "If-None-Match": etag } });
    expect(second.status).toBe(304);
    expect(second.headers.get("Cache-Control")).toBe(PUBLIC_CACHE_CONTROL);
    expect(second.headers.get("ETag")).toBe(etag);
    const text = await second.text();
    expect(text).toBe("");
  });

  it("returns 200 + body when If-None-Match doesn't match", async () => {
    const app = makeApp((c) => respondPublic(c, { items: [{ id: 1 }] }));
    const res = await app.request("https://x/", {
      headers: { "If-None-Match": '"deadbeef"' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ items: [{ id: 1 }] });
  });

  it("supports custom 200-class status code", async () => {
    const app = makeApp((c) => respondPublic(c, { ok: true }, 200));
    const res = await app.request("https://x/");
    expect(res.status).toBe(200);
  });
});

describe("respondAdmin", () => {
  it("sets no-store + Vary Origin", async () => {
    const app = makeApp((c) => respondAdmin(c, { ok: true }));
    const res = await app.request("https://x/");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(ADMIN_CACHE_CONTROL);
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("supports custom status code (e.g. 201)", async () => {
    const app = makeApp((c) => respondAdmin(c, { id: 1 }, 201));
    const res = await app.request("https://x/");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ id: 1 });
  });

  it("does not set ETag", async () => {
    const app = makeApp((c) => respondAdmin(c, { ok: true }));
    const res = await app.request("https://x/");
    expect(res.headers.get("ETag")).toBeNull();
  });
});
