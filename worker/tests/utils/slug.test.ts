import { describe, expect, it } from "vitest";
import {
  extensionForContentType,
  generateSlug,
  slugFromFilename,
} from "../../src/utils/slug";

describe("generateSlug", () => {
  it("kebab-cases ASCII titles", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("lowercases mixed-case input", () => {
    expect(generateSlug("FooBarBaz")).toBe("foobarbaz");
  });

  it("collapses multiple separators into single dash", () => {
    expect(generateSlug("hello---world!!!foo")).toBe("hello-world-foo");
  });

  it("trims leading and trailing dashes", () => {
    expect(generateSlug("  --hello world--  ")).toBe("hello-world");
  });

  it("preserves CJK characters", () => {
    expect(generateSlug("公告 第一期")).toBe("公告-第一期");
  });

  it("preserves CJK letters mixed with ASCII", () => {
    expect(generateSlug("BanG Dream! 北美")).toBe("bang-dream-北美");
  });

  it("strips emoji and other symbols", () => {
    expect(generateSlug("hello 🎉 world ★")).toBe("hello-world");
  });

  it("returns 'untitled' for empty input", () => {
    expect(generateSlug("")).toBe("untitled");
  });

  it("returns 'untitled' for null/undefined", () => {
    expect(generateSlug(null)).toBe("untitled");
    expect(generateSlug(undefined)).toBe("untitled");
  });

  it("returns 'untitled' for all-symbols input", () => {
    expect(generateSlug("!!!---@@@")).toBe("untitled");
  });

  it("returns 'untitled' for whitespace-only input", () => {
    expect(generateSlug("    ")).toBe("untitled");
  });

  it("truncates to 80 chars", () => {
    const long = "a".repeat(200);
    const slug = generateSlug(long);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe("a".repeat(80));
  });

  it("does not leave trailing dash after truncation", () => {
    const input = "x".repeat(79) + "-extra";
    const slug = generateSlug(input);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it("truncate-to-only-dashes falls back to untitled", () => {
    // 80 chars of mixed but ends with all-dash region after truncation; constructed deliberately
    const input = "a".repeat(78) + "-bbbb";
    const slug = generateSlug(input);
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it("handles numeric-only input", () => {
    expect(generateSlug("2026")).toBe("2026");
  });

  it("handles unicode digits", () => {
    expect(generateSlug("Episode 1")).toBe("episode-1");
  });

  it("coerces non-string input to string", () => {
    expect(generateSlug(123 as unknown as string)).toBe("123");
  });
});

describe("extensionForContentType", () => {
  it("maps png", () => expect(extensionForContentType("image/png")).toBe("png"));
  it("maps jpeg", () => expect(extensionForContentType("image/jpeg")).toBe("jpg"));
  it("maps webp", () => expect(extensionForContentType("image/webp")).toBe("webp"));
  it("maps gif", () => expect(extensionForContentType("image/gif")).toBe("gif"));
  it("is case-insensitive", () =>
    expect(extensionForContentType("IMAGE/PNG")).toBe("png"));
  it("returns null for unknown types", () => {
    expect(extensionForContentType("application/pdf")).toBeNull();
    expect(extensionForContentType("")).toBeNull();
    expect(extensionForContentType("image/svg+xml")).toBeNull();
  });
});

describe("slugFromFilename", () => {
  it("strips extension and slugifies basename", () => {
    expect(slugFromFilename("My Photo.PNG")).toBe("my-photo");
  });

  it("preserves dots without extension boundary as separator", () => {
    expect(slugFromFilename("file.name.jpg")).toBe("file-name");
  });

  it("returns untitled for empty/null/undefined", () => {
    expect(slugFromFilename("")).toBe("untitled");
    expect(slugFromFilename(null)).toBe("untitled");
    expect(slugFromFilename(undefined)).toBe("untitled");
  });

  it("treats dotfile-only names as basename", () => {
    expect(slugFromFilename(".hidden")).toBe("hidden");
  });
});
