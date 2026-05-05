import { describe, expect, it } from "vitest";
import { parseCookies } from "../../src/utils/cookies";

describe("parseCookies", () => {
  it("parses a simple cookie", () => {
    expect(parseCookies("foo=bar")).toEqual({ foo: "bar" });
  });

  it("parses multiple cookies", () => {
    expect(parseCookies("a=1; b=2; c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("decodes percent-encoded values", () => {
    expect(parseCookies("name=hello%20world")).toEqual({ name: "hello world" });
  });

  it("returns raw value for malformed %ZZ sequence instead of throwing", () => {
    const result = parseCookies("session=%ZZ");
    expect(result).toHaveProperty("session");
    expect(result.session).toBe("%ZZ");
  });

  it("returns raw value for truncated percent sequence %A", () => {
    const result = parseCookies("tok=%A");
    expect(result.tok).toBe("%A");
  });

  it("handles empty string header", () => {
    expect(parseCookies("")).toEqual({});
  });

  it("handles null header", () => {
    expect(parseCookies(null)).toEqual({});
  });

  it("handles undefined header", () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it("skips cookie with no key", () => {
    expect(parseCookies("=value")).toEqual({});
  });

  it("handles cookie value with equals sign in value", () => {
    const result = parseCookies("token=abc=def");
    expect(result.token).toBe("abc=def");
  });

  it("handles mixed valid and malformed cookies without dropping valid ones", () => {
    const result = parseCookies("good=ok; bad=%ZZ; also=fine");
    expect(result.good).toBe("ok");
    expect(result.bad).toBe("%ZZ");
    expect(result.also).toBe("fine");
  });
});
