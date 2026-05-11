import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  R2_BUCKET_NAME: string;
  CDN_ORIGIN: string;
  ADMIN_GITHUB_LOGINS: string;
  ALLOWED_ORIGINS: string;
  // Resend (set via `wrangler secret put RESEND_API_KEY`)
  RESEND_API_KEY: string;
  EMAIL_FROM_DEFAULT?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  // Workers Rate Limiting (GA Sept 2025). Bindings declared in wrangler.toml.
  RATE_LIMIT_HOUR?: RateLimit;
  RATE_LIMIT_DAY?: RateLimit;
}

export interface SessionUser {
  id: number;
  github_login: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
}

export interface AppVariables {
  user: SessionUser;
}
