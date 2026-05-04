import { describe, expect, it } from "vitest";
import { JwtError, signJwt, verifyJwt } from "../../src/auth/jwt";

const SECRET = "test-jwt-secret-32-bytes-min-len-ok";

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

describe("jwt sign + verify", () => {
  it("roundtrips a valid token", async () => {
    const exp = nowSec() + 60;
    const token = await signJwt({ uid: 42, role: "admin", exp }, SECRET);
    const payload = await verifyJwt(token, SECRET);
    expect(payload.uid).toBe(42);
    expect(payload.role).toBe("admin");
    expect(payload.exp).toBe(exp);
    expect(typeof payload.iat).toBe("number");
  });

  it("preserves member role roundtrip", async () => {
    const token = await signJwt({ uid: 1, role: "member", exp: nowSec() + 60 }, SECRET);
    const payload = await verifyJwt(token, SECRET);
    expect(payload.role).toBe("member");
  });

  it("rejects token signed with a different secret", async () => {
    const token = await signJwt({ uid: 1, role: "admin", exp: nowSec() + 60 }, SECRET);
    await expect(verifyJwt(token, "different-secret")).rejects.toMatchObject({
      code: "bad_signature",
    });
  });

  it("rejects expired token", async () => {
    const token = await signJwt({ uid: 1, role: "admin", exp: nowSec() - 1 }, SECRET);
    await expect(verifyJwt(token, SECRET)).rejects.toMatchObject({ code: "expired" });
  });

  it("rejects token with tampered payload", async () => {
    const token = await signJwt({ uid: 1, role: "member", exp: nowSec() + 60 }, SECRET);
    const parts = token.split(".");
    const tamperedPayload = btoa(JSON.stringify({ uid: 1, role: "admin", iat: nowSec(), exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    await expect(verifyJwt(tampered, SECRET)).rejects.toMatchObject({ code: "bad_signature" });
  });

  it("rejects malformed token (not 3 parts)", async () => {
    await expect(verifyJwt("only.two", SECRET)).rejects.toMatchObject({ code: "malformed" });
    await expect(verifyJwt("a.b.c.d", SECRET)).rejects.toMatchObject({ code: "malformed" });
  });

  it("rejects empty token", async () => {
    await expect(verifyJwt("", SECRET)).rejects.toMatchObject({ code: "malformed" });
  });

  it("rejects token with empty segments", async () => {
    await expect(verifyJwt("..", SECRET)).rejects.toMatchObject({ code: "malformed" });
  });

  it("rejects token with non-HS256 alg", async () => {
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payload = btoa(JSON.stringify({ uid: 1, role: "admin", iat: 0, exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    await expect(verifyJwt(`${header}.${payload}.sig`, SECRET)).rejects.toMatchObject({
      code: "malformed",
    });
  });

  it("rejects token with malformed JSON header", async () => {
    const garbage = btoa("not-json").replace(/=+$/, "");
    const payload = btoa(JSON.stringify({ uid: 1, role: "admin", iat: 0, exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    await expect(verifyJwt(`${garbage}.${payload}.sig`, SECRET)).rejects.toBeInstanceOf(JwtError);
  });

  it("rejects token with invalid claim shape", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payload = btoa(JSON.stringify({ uid: "not-number", role: "admin", iat: 0, exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`)),
    );
    let bin = "";
    for (const b of sig) bin += String.fromCharCode(b);
    const sigB64 = btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    await expect(verifyJwt(`${header}.${payload}.${sigB64}`, SECRET)).rejects.toMatchObject({
      code: "invalid_payload",
    });
  });

  it("rejects role claim that is neither admin nor member", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payload = btoa(JSON.stringify({ uid: 1, role: "viewer", iat: 0, exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`)),
    );
    let bin = "";
    for (const b of sig) bin += String.fromCharCode(b);
    const sigB64 = btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    await expect(verifyJwt(`${header}.${payload}.${sigB64}`, SECRET)).rejects.toMatchObject({
      code: "invalid_payload",
    });
  });

  it("rejects token with bad sig encoding", async () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payload = btoa(JSON.stringify({ uid: 1, role: "admin", iat: 0, exp: nowSec() + 60 }))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    // tamper sig with absurd content that still base64-decodes but won't match
    await expect(verifyJwt(`${header}.${payload}.AAA`, SECRET)).rejects.toMatchObject({
      code: "bad_signature",
    });
  });
});
