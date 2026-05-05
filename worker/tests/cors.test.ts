import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/index";

describe("CORS middleware", () => {
  it("echoes Origin and sets credentials when origin in allowlist", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "https://bangdream.org" } },
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://bangdream.org");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("matches localhost:5173 dev origin", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "http://localhost:5173" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });

  it("matches localhost:4173 preview origin", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "http://localhost:4173" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4173");
  });

  it("omits CORS headers for non-allowlisted origin but always sets Vary: Origin", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "https://evil.example.com" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("sets Vary: Origin even when no Origin header on request", async () => {
    const res = await createApp().request("https://api.bangdream.org/api/healthz", {}, env);
    expect(res.headers.get("Vary")).toContain("Origin");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("OPTIONS preflight from allowlisted origin returns 204 + CORS headers", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/me",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://bangdream.org",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Content-Type",
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://bangdream.org");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
  });

  it("matches Cloudflare Pages preview origin (hash subdomain)", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "https://12276266.bangdream-na.pages.dev" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://12276266.bangdream-na.pages.dev",
    );
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("matches Cloudflare Pages preview origin (branch subdomain)", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "https://feat-x-y.bangdream-na.pages.dev" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://feat-x-y.bangdream-na.pages.dev",
    );
  });

  it("rejects http (non-https) pages.dev origin", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "http://abc.bangdream-na.pages.dev" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects evil.bangdream-na.pages.dev.attacker.com (suffix-spoof)", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/healthz",
      { headers: { Origin: "https://abc.bangdream-na.pages.dev.attacker.com" } },
      env,
    );
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("OPTIONS preflight from non-allowlisted origin returns 204 but omits CORS allow headers", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/me",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.example.com",
          "Access-Control-Request-Method": "POST",
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(res.headers.get("Vary")).toContain("Origin");
  });

  it("OPTIONS preflight returns Access-Control-Max-Age: 86400", async () => {
    const res = await createApp().request(
      "https://api.bangdream.org/api/me",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://bangdream.org",
          "Access-Control-Request-Method": "GET",
        },
      },
      env,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
