// R2 orphan cleanup — placeholder for future cron worker that scans
// `submissions/` prefix for keys older than 7 days with no corresponding
// `gallery_submissions` row (rare: reject DELETE failures, or aborted-PUT
// after schema rollback). MVP relies on manual cleanup; reject DELETE
// failures are <0.1% in practice and surface in structured logs.
//
// To activate: register a separate `[triggers]` cron + hook into
// scheduled() in index.ts. R2 lifecycle rules also support prefix-based
// expiry as a backup.

import type { Env } from "../custom-env";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function scanForOrphans(_env: Env): Promise<{
  scanned: number;
  deleted: number;
}> {
  // Intentional stub. Implementation deferred per ARCH §1 OQ4.
  return { scanned: 0, deleted: 0 };
}
