import { describe, expect, it } from "vitest";
import { computeEtag } from "../../src/utils/etag";

describe("computeEtag", () => {
  it("wraps SHA-1 hex in W3C strong-etag double-quotes", async () => {
    const tag = await computeEtag({ a: 1 });
    expect(tag.startsWith('"')).toBe(true);
    expect(tag.endsWith('"')).toBe(true);
    expect(tag.slice(1, -1)).toMatch(/^[0-9a-f]{40}$/);
  });

  it("produces stable etag for same payload", async () => {
    const a = await computeEtag({ x: 1, y: [1, 2] });
    const b = await computeEtag({ x: 1, y: [1, 2] });
    expect(a).toBe(b);
  });

  it("is independent of object key order", async () => {
    const a = await computeEtag({ a: 1, b: 2, c: 3 });
    const b = await computeEtag({ c: 3, b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it("differs when payload differs", async () => {
    const a = await computeEtag({ a: 1 });
    const b = await computeEtag({ a: 2 });
    expect(a).not.toBe(b);
  });

  it("treats arrays as ordered (different order = different etag)", async () => {
    const a = await computeEtag([1, 2, 3]);
    const b = await computeEtag([3, 2, 1]);
    expect(a).not.toBe(b);
  });

  it("handles nested objects", async () => {
    const a = await computeEtag({ nested: { a: 1, b: { c: 2 } } });
    const b = await computeEtag({ nested: { b: { c: 2 }, a: 1 } });
    expect(a).toBe(b);
  });

  it("handles null and undefined", async () => {
    const nul = await computeEtag(null);
    const undef = await computeEtag(undefined);
    expect(nul).toBe(undef);
    expect(nul).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it("handles primitives", async () => {
    const num = await computeEtag(42);
    const str = await computeEtag("42");
    expect(num).not.toBe(str);
    expect(num).toMatch(/^"[0-9a-f]{40}"$/);
  });

  it("handles empty array vs empty object", async () => {
    const arr = await computeEtag([]);
    const obj = await computeEtag({});
    expect(arr).not.toBe(obj);
  });

  it("handles boolean values", async () => {
    const t = await computeEtag(true);
    const f = await computeEtag(false);
    expect(t).not.toBe(f);
  });

  it("handles deeply nested arrays of objects", async () => {
    const items = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
    const a = await computeEtag({ items });
    const b = await computeEtag({ items: [{ name: "a", id: 1 }, { name: "b", id: 2 }] });
    expect(a).toBe(b);
  });
});
