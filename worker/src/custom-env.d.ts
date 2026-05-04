import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

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
