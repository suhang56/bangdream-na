import { Hono } from "hono";
import type { AppVariables, Env } from "../custom-env";
import { requireAuth } from "../auth/middleware";

export function buildMeRoutes() {
  const router = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  router.get("/", requireAuth, (c) => {
    const user = c.get("user");
    c.header("Cache-Control", "no-store");
    return c.json({ user });
  });
  return router;
}
