import { Hono } from "hono";
import type { AppVariables, Env } from "./custom-env";
import { buildGithubAuthRoutes } from "./auth/github";
import { buildHealthzRoutes } from "./routes/healthz";
import { buildMeRoutes } from "./routes/me";
import { corsMiddleware } from "./utils/cors";

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

  app.use("*", corsMiddleware);

  app.route("/api/healthz", buildHealthzRoutes());
  app.route("/api/me", buildMeRoutes());
  app.route("/api/auth", buildGithubAuthRoutes());

  app.notFound((c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ error: "not_found" }, 404);
  });

  app.onError((err, c) => {
    console.error("worker_error", err);
    c.header("Cache-Control", "no-store");
    return c.json({ error: "internal_error" }, 500);
  });

  return app;
}

const app = createApp();

export default app;
