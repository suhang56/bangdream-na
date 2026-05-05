import type { Context, MiddlewareHandler } from "hono";
import type { Env, AppVariables } from "../custom-env";

export function parseAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Cloudflare Pages auto-deploys a preview per branch + per deploy hash. Origins
// look like `https://<8hex>.bangdream-na.pages.dev` and
// `https://<branch-slug>.bangdream-na.pages.dev`. Allowing this suffix lets
// preview frontends call the prod API for read-only smoke testing. Admin
// cookies won't reach previews anyway (cookie is __Host- + SameSite=Lax,
// scoped to api.bangdream.org), so this exposes only public GET routes.
const PAGES_PREVIEW_SUFFIX = ".bangdream-na.pages.dev";

export function isCorsAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  if (parseAllowedOrigins(env).includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(PAGES_PREVIEW_SUFFIX)) {
      return true;
    }
  } catch {
    // not a valid URL — fall through to deny
  }
  return false;
}

function applyCorsHeaders(
  c: Context<{ Bindings: Env; Variables: AppVariables }>,
  origin: string | null,
): void {
  c.header("Vary", "Origin");
  if (origin && isCorsAllowed(c.env, origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
  }
}

export const corsMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (
  c,
  next,
) => {
  const origin = c.req.header("Origin") ?? null;

  if (c.req.method === "OPTIONS") {
    applyCorsHeaders(c, origin);
    return c.body(null, 204);
  }

  await next();
  applyCorsHeaders(c, origin);
};
