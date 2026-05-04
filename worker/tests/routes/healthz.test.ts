import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/index";

describe("GET /api/healthz", () => {
  it("returns 200 + ok=true", async () => {
    const res = await createApp().request("https://api.bangdream.org/api/healthz", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not require auth", async () => {
    const res = await createApp().request("https://api.bangdream.org/api/healthz", {}, env);
    expect(res.status).toBe(200);
  });
});
