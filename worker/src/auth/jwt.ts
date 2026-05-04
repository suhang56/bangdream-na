// HS256 JWT via Web Crypto. No external lib (Workers-compatible, deterministic).
// Claims: { uid: number, role: 'admin' | 'member', iat: number, exp: number }

export interface JwtPayload {
  uid: number;
  role: "admin" | "member";
  iat: number;
  exp: number;
}

export class JwtError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "malformed"
      | "bad_signature"
      | "expired"
      | "invalid_payload",
  ) {
    super(message);
    this.name = "JwtError";
  }
}

function base64UrlEncode(bytes: Uint8Array | ArrayBuffer): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of u8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8Encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp"> & { iat?: number; exp: number },
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = payload.iat ?? Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    uid: payload.uid,
    role: payload.role,
    iat,
    exp: payload.exp,
  };

  const headerB64 = base64UrlEncode(utf8Encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(utf8Encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, utf8Encode(signingInput));
  const sigB64 = base64UrlEncode(sig);

  return `${signingInput}.${sigB64}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  if (typeof token !== "string" || !token) {
    throw new JwtError("empty token", "malformed");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtError("bad segment count", "malformed");
  }
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) {
    throw new JwtError("empty segment", "malformed");
  }

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(utf8Decode(base64UrlDecode(headerB64)));
  } catch {
    throw new JwtError("bad header", "malformed");
  }
  if (header.alg !== "HS256") {
    throw new JwtError("unsupported alg", "malformed");
  }

  const key = await importHmacKey(secret);
  const signingInput = `${headerB64}.${payloadB64}`;
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlDecode(sigB64);
  } catch {
    throw new JwtError("bad sig encoding", "malformed");
  }

  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, utf8Encode(signingInput)),
  );
  if (!timingSafeEqual(sigBytes, expected)) {
    throw new JwtError("bad signature", "bad_signature");
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(utf8Decode(base64UrlDecode(payloadB64))) as JwtPayload;
  } catch {
    throw new JwtError("bad payload", "malformed");
  }

  if (
    typeof payload.uid !== "number" ||
    (payload.role !== "admin" && payload.role !== "member") ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new JwtError("missing claims", "invalid_payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new JwtError("token expired", "expired");
  }

  return payload;
}
