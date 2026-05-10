// TODO(triggers): wire in future PR
// Trigger: content publish (draft -> published) -> notify admin
// Email shape: see EMAIL-DESIGN.md section 4.3
import type { Env } from "../../custom-env";

export interface ContentPublishContext {
  type: "news" | "event" | "gallery";
  title: string;
  slug: string;
  published_iso: string;
  public_path: string;
  admin_path: string;
}

export async function notifyContentPublish(
  _env: Env,
  _ctx: ContentPublishContext,
): Promise<void> {
  throw new Error("Not implemented: notifyContentPublish");
}
