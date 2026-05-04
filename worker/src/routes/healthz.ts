import { Hono } from "hono";
import type { AppVariables, Env } from "../custom-env";

export function buildHealthzRoutes() {
  const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  router.get("/", (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ ok: true });
  });
  return router;
}
