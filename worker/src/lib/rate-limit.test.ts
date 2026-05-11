import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import {
  gallerySubmitRateLimit,
  hashIpForSubmission,
  hashUserAgent,
  type RateLimitBinding,
} from "./rate-limit";

function mockBinding(results: boolean[]): RateLimitBinding & { calls: { key: string }[] } {
  const calls: { key: string }[] = [];
  let idx = 0;
  return {
    calls,
    limit: vi.fn(async (opts: { key: string }) => {
      calls.push(opts);
      const r = idx < results.length ? results[idx] : true;
      idx += 1;
      return { success: r };
    }),
  };
}

function appWithRl(bindings: { hour?: RateLimitBinding; day?: RateLimitBinding }) {
  const app = new Hono<{
    Bindings: { RATE_LIMIT_HOUR?: RateLimitBinding; RATE_LIMIT_DAY?: RateLimitBinding };
    Variables: { ipHashForSubmission?: string };
  }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.post("/submit", gallerySubmitRateLimit as any, (c) =>
    c.json({ ok: true, hash: c.get("ipHashForSubmission") ?? null }),
  );
  return (req: Request) =>
    app.request(req, undefined, {
      RATE_LIMIT_HOUR: bindings.hour,
      RATE_LIMIT_DAY: bindings.day,
    });
}

function submitReq(ip: string): Request {
  return new Request("https://x/submit", {
    method: "POST",
    headers: { "CF-Connecting-IP": ip },
  });
}

describe("hashIpForSubmission", () => {
  it("returns 32-char hex prefix", async () => {
    const req = new Request("https://x", {
      headers: { "CF-Connecting-IP": "203.0.113.42" },
    });
    const h = await hashIpForSubmission(req);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it("falls back to 0.0.0.0 when CF-Connecting-IP missing", async () => {
    const req = new Request("https://x");
    const h = await hashIpForSubmission(req);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic for same IP", async () => {
    const r1 = new Request("https://x", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
    const r2 = new Request("https://x", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
    const h1 = await hashIpForSubmission(r1);
    const h2 = await hashIpForSubmission(r2);
    expect(h1).toBe(h2);
  });

  it("differs across IPs", async () => {
    const r1 = new Request("https://x", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
    const r2 = new Request("https://x", { headers: { "CF-Connecting-IP": "5.6.7.8" } });
    const h1 = await hashIpForSubmission(r1);
    const h2 = await hashIpForSubmission(r2);
    expect(h1).not.toBe(h2);
  });
});

describe("hashUserAgent", () => {
  it("returns 32-char hex for present UA", async () => {
    const req = new Request("https://x", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const h = await hashUserAgent(req);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it("hashes empty string when UA missing", async () => {
    const req = new Request("https://x");
    const h = await hashUserAgent(req);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("gallerySubmitRateLimit middleware", () => {
  it("calls next when both bindings succeed", async () => {
    const hour = mockBinding([true]);
    const day = mockBinding([true]);
    const run = appWithRl({ hour, day });
    const res = await run(submitReq("203.0.113.10"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; hash: string };
    expect(body.ok).toBe(true);
    expect(body.hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hour.calls[0].key).toMatch(/^gsubmit:[0-9a-f]{32}$/);
  });

  it("returns 429 hour-window when RATE_LIMIT_HOUR.success=false", async () => {
    const hour = mockBinding([false]);
    const day = mockBinding([true]);
    const run = appWithRl({ hour, day });
    const res = await run(submitReq("203.0.113.10"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as { error: string; detail: { window: string; limit: number } };
    expect(body.error).toBe("rate_limited");
    expect(body.detail.window).toBe("hour");
    expect(body.detail.limit).toBe(3);
    expect(day.calls.length).toBe(0); // short-circuit before day check
  });

  it("returns 429 day-window when RATE_LIMIT_DAY.success=false (hour ok)", async () => {
    const hour = mockBinding([true]);
    const day = mockBinding([false]);
    const run = appWithRl({ hour, day });
    const res = await run(submitReq("203.0.113.10"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("86400");
    const body = (await res.json()) as { error: string; detail: { window: string; limit: number } };
    expect(body.detail.window).toBe("day");
    expect(body.detail.limit).toBe(10);
  });

  it("passes through when bindings are absent (graceful in tests without RL set)", async () => {
    const run = appWithRl({});
    const res = await run(submitReq("203.0.113.10"));
    expect(res.status).toBe(200);
  });

  it("derives different keys for different IPs", async () => {
    const hour = mockBinding([true, true]);
    const day = mockBinding([true, true]);
    const run = appWithRl({ hour, day });
    await run(submitReq("1.1.1.1"));
    await run(submitReq("2.2.2.2"));
    expect(hour.calls[0].key).not.toBe(hour.calls[1].key);
  });
});
