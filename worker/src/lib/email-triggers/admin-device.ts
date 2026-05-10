// TODO(triggers): wire in future PR
// Trigger: admin new-device / new-IP login -> self-notify
// Email shape: see EMAIL-DESIGN.md section 4.2
import type { Env } from "../../custom-env";

export interface AdminDeviceContext {
  admin_email: string;
  login_iso: string;
  ip: string;
  geo: string;
  ua_summary: string;
}

export async function notifyAdminNewDevice(
  _env: Env,
  _ctx: AdminDeviceContext,
): Promise<void> {
  throw new Error("Not implemented: notifyAdminNewDevice");
}
