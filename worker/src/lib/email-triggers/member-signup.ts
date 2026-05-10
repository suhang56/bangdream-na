// TODO(triggers): wire in future PR
// Trigger: member signup -> notify admin
// Email shape: see EMAIL-DESIGN.md section 4.1
import type { Env } from "../../custom-env";

export interface MemberSignupContext {
  display_name: string;
  github_login: string;
  city: string | null;
  oshi: string | null;
  signup_iso: string;
  member_id: number;
}

export async function notifyMemberSignup(
  _env: Env,
  _ctx: MemberSignupContext,
): Promise<void> {
  throw new Error("Not implemented: notifyMemberSignup");
}
