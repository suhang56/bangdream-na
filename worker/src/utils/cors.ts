import type { Context, MiddlewareHandler } from "hono";
import type { Env, AppVariables } from "../custom-env";

export function parseAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isCorsAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  return parseAllowedOrigins(env).includes(origin);
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
