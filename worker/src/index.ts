import { Hono } from "hono";
import type { AppVariables, Env } from "./custom-env";
import { buildGithubAuthRoutes } from "./auth/github";
import {
  buildAdminCategoriesRoutes,
  buildAdminEventsRoutes,
  buildAdminMembersRoutes,
  buildAdminNewsRoutes,
} from "./routes/admin";
import { buildAdminSettingsRoutes } from "./routes/admin-settings";
import { buildCommentRoutes } from "./routes/comments";
import { buildHealthzRoutes } from "./routes/healthz";
import { buildMeRoutes } from "./routes/me";
import {
  buildPublicCategoriesRoutes,
  buildPublicEventsRoutes,
  buildPublicMembersRoutes,
  buildPublicNewsRoutes,
} from "./routes/public";
import { buildUploadRoutes } from "./routes/upload";
import { corsMiddleware } from "./utils/cors";

export function createApp() {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

  app.use("*", corsMiddleware);

  app.route("/api/healthz", buildHealthzRoutes());
  app.route("/api/me", buildMeRoutes());
  app.route("/api/auth", buildGithubAuthRoutes());
  app.route("/api/news", buildPublicNewsRoutes());
  app.route("/api/events", buildPublicEventsRoutes());
  app.route("/api/members", buildPublicMembersRoutes());
  app.route("/api/categories", buildPublicCategoriesRoutes());
  app.route("/api/comments", buildCommentRoutes());
  app.route("/api/upload", buildUploadRoutes());
  app.route("/api/admin/news", buildAdminNewsRoutes());
  app.route("/api/admin/events", buildAdminEventsRoutes());
  app.route("/api/admin/members", buildAdminMembersRoutes());
  app.route("/api/admin/categories", buildAdminCategoriesRoutes());
  app.route("/api/admin/settings", buildAdminSettingsRoutes());

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
