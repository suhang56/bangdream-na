import { z } from "zod";

export const githubLoginSchema = z
  .string()
  .min(1)
  .max(39)
  .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/);

export function parseAdminAllowlist(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

const intFromQuery = (defaultValue: number) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return defaultValue;
    if (typeof v === "number") return v;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  }, z.number().int());

const slugString = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i);

export const newsListQuery = z.object({
  limit: intFromQuery(20).pipe(z.number().int().min(1).max(100)),
  offset: intFromQuery(0).pipe(z.number().int().min(0)),
  category: slugString.optional(),
  q: z.string().min(1).max(200).optional(),
});

export const eventListQuery = z.object({
  limit: intFromQuery(50).pipe(z.number().int().min(1).max(100)),
  offset: intFromQuery(0).pipe(z.number().int().min(0)),
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
});

export const slugParam = z.object({
  slug: slugString,
});

export const uploadKindEnum = z.enum(["news", "events", "members"]);

export const uploadFormParts = z.object({
  kind: uploadKindEnum,
  slug: z.string().min(1).max(200).optional(),
});
