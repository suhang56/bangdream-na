export const SESSION_COOKIE = "__Host-bdna_session";
export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7d
export const OAUTH_STATE_MAX_AGE = 60 * 5; // 5min

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

export interface SetCookieOptions {
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export function buildSetCookie(name: string, value: string, opts: SetCookieOptions = {}): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export function buildSessionCookie(jwt: string): string {
  return buildSetCookie(SESSION_COOKIE, jwt, {
    path: "/",
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

export function buildClearSessionCookie(): string {
  return buildSetCookie(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

export function buildOauthStateCookie(state: string): string {
  return buildSetCookie(OAUTH_STATE_COOKIE, state, {
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}

export function buildClearOauthStateCookie(): string {
  return buildSetCookie(OAUTH_STATE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  });
}
