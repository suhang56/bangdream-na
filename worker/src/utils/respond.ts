import type { Context } from "hono";
import { computeEtag } from "./etag";

export const PUBLIC_CACHE_CONTROL =
  "public, max-age=15, s-maxage=15, stale-while-revalidate=60";
export const ADMIN_CACHE_CONTROL = "no-store";

export async function respondPublic(
  c: Context,
  data: unknown,
  status: number = 200,
): Promise<Response> {
  const etag = await computeEtag(data);
  const ifNoneMatch = c.req.header("If-None-Match");
  c.header("Cache-Control", PUBLIC_CACHE_CONTROL);
  c.header("ETag", etag);
  c.header("Vary", "Origin");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return c.body(null, 304);
  }
  return c.json(data as Record<string, unknown>, status as 200);
}

export function respondAdmin(
  c: Context,
  data: unknown,
  status: number = 200,
): Response {
  c.header("Cache-Control", ADMIN_CACHE_CONTROL);
  c.header("Vary", "Origin");
  return c.json(data as Record<string, unknown>, status as 200);
}
