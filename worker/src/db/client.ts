import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../custom-env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(env: Env): Db {
  return drizzle(env.DB, { schema });
}
