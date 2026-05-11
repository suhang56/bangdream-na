// Hono middleware over Cloudflare native Rate Limiting bindings (GA Sept 2025).
// Two windows — hourly burst (3) + daily abuse cap (10). Both checked in order;
// hour breach short-circuits to avoid daily-counter inflation by a thundering herd.
// Key derivation: SHA-256(CF-Connecting-IP) prefix-16; matches D1 ip_hash column.

import type { MiddlewareHandler } from "hono";
import type { AppVariables, Env } from "../custom-env";

export interface RateLimitBinding {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export async function hashIpForSubmission(req: Request): Promise<string> {
  const ip = req.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  const buf = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32);
}

export async function hashUserAgent(req: Request): Promise<string> {
  const ua = req.headers.get("User-Agent") ?? "";
  const buf = new TextEncoder().encode(ua);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32);
}

interface AppVariablesWithRateHash extends AppVariables {
  ipHashForSubmission?: string;
}

type AppType = { Bindings: Env; Variables: AppVariablesWithRateHash };

export const gallerySubmitRateLimit: MiddlewareHandler<AppType> = async (
  c,
  next,
) => {
  const hash = await hashIpForSubmission(c.req.raw);
  const key = `gsubmit:${hash}`;

  const hourBinding = c.env.RATE_LIMIT_HOUR as RateLimitBinding | undefined;
  const dayBinding = c.env.RATE_LIMIT_DAY as RateLimitBinding | undefined;

  if (hourBinding && typeof hourBinding.limit === "function") {
    const hourRes = await hourBinding.limit({ key });
    if (!hourRes.success) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      c.header("Retry-After", "3600");
      return c.json(
        { error: "rate_limited", detail: { window: "hour", limit: 3 } },
        429,
      );
    }
  }

  if (dayBinding && typeof dayBinding.limit === "function") {
    const dayRes = await dayBinding.limit({ key });
    if (!dayRes.success) {
      c.header("Cache-Control", "no-store");
      c.header("Vary", "Origin");
      c.header("Retry-After", "86400");
      return c.json(
        { error: "rate_limited", detail: { window: "day", limit: 10 } },
        429,
      );
    }
  }

  c.set("ipHashForSubmission", hash);
  await next();
};
