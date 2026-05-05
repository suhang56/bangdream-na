import { describe, expect, it } from "vitest";
import {
  parseTagsJson,
  newsRowToOut,
  newsAdminRowToOut,
  eventRowToOut,
  memberRowToOut,
} from "../../src/utils/row-mappers";

const BASE_NEWS = {
  id: 1,
  slug: "test-slug",
  titleZh: "标题",
  titleEn: "Title",
  bodyMd: "# body",
  category: "news",
  heroImageUrl: null,
  tagsJson: '["tag1","tag2"]',
  publishedAt: 1700000000,
  createdAt: 1699000000,
  updatedAt: 1699000000,
  draft: 0,
};

const BASE_EVENT = {
  id: 2,
  slug: "event-slug",
  titleZh: "活动",
  titleEn: "Event",
  descriptionMd: "desc",
  heroImageUrl: "https://cdn.example.com/img.jpg",
  startAt: 1700000000,
  endAt: 1700086400,
  venue: "Hall A",
  city: "Los Angeles",
  scope: "NA",
  ticketUrl: "https://tickets.example.com",
  bandTheme: "Poppin'Party",
  createdAt: 1699000000,
  updatedAt: 1699000000,
};

const BASE_MEMBER = {
  id: 3,
  displayName: "Alice",
  city: "Tokyo",
  oshiCharacter: "Kasumi",
  oshiBand: "Poppin'Party",
  avatarUrl: null,
  expeditionMember: 1,
  externalId: null,
  role: "member" as const,
  createdAt: 1699000000,
  updatedAt: 1699000000,
};

describe("parseTagsJson", () => {
  it("parses valid JSON array of strings", () => {
    expect(parseTagsJson('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty JSON array", () => {
    expect(parseTagsJson("[]")).toEqual([]);
  });

  it("filters non-string items", () => {
    expect(parseTagsJson('[1,null,"ok",true]')).toEqual(["ok"]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseTagsJson("{bad json}")).toEqual([]);
  });

  it("returns empty array for JSON non-array (object)", () => {
    expect(parseTagsJson('{"key":"val"}')).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseTagsJson("")).toEqual([]);
  });
});

describe("newsRowToOut", () => {
  it("maps all public fields correctly", () => {
    const out = newsRowToOut(BASE_NEWS);
    expect(out.id).toBe(1);
    expect(out.slug).toBe("test-slug");
    expect(out.title_zh).toBe("标题");
    expect(out.title_en).toBe("Title");
    expect(out.body_md).toBe("# body");
    expect(out.category).toBe("news");
    expect(out.hero_image_url).toBeNull();
    expect(out.tags).toEqual(["tag1", "tag2"]);
    expect(out.published_at).toBe(1700000000);
    expect(out.created_at).toBe(1699000000);
    expect(out.updated_at).toBe(1699000000);
  });

  it("does not include draft field", () => {
    const out = newsRowToOut(BASE_NEWS);
    expect(out).not.toHaveProperty("draft");
  });

  it("handles null title_en", () => {
    const out = newsRowToOut({ ...BASE_NEWS, titleEn: null });
    expect(out.title_en).toBeNull();
  });
});

describe("newsAdminRowToOut", () => {
  it("includes draft field", () => {
    const out = newsAdminRowToOut(BASE_NEWS);
    expect(out.draft).toBe(0);
  });

  it("maps draft=1 correctly", () => {
    const out = newsAdminRowToOut({ ...BASE_NEWS, draft: 1 });
    expect(out.draft).toBe(1);
  });

  it("contains all public fields plus draft", () => {
    const out = newsAdminRowToOut(BASE_NEWS);
    expect(out.title_zh).toBe("标题");
    expect(out.tags).toEqual(["tag1", "tag2"]);
    expect(out.draft).toBe(0);
  });
});

describe("eventRowToOut", () => {
  it("maps all fields correctly", () => {
    const out = eventRowToOut(BASE_EVENT);
    expect(out.id).toBe(2);
    expect(out.slug).toBe("event-slug");
    expect(out.title_zh).toBe("活动");
    expect(out.description_md).toBe("desc");
    expect(out.start_at).toBe(1700000000);
    expect(out.end_at).toBe(1700086400);
    expect(out.venue).toBe("Hall A");
    expect(out.city).toBe("Los Angeles");
    expect(out.scope).toBe("NA");
    expect(out.ticket_url).toBe("https://tickets.example.com");
    expect(out.band_theme).toBe("Poppin'Party");
  });

  it("handles null optional fields", () => {
    const out = eventRowToOut({
      ...BASE_EVENT,
      titleEn: null,
      descriptionMd: null,
      heroImageUrl: null,
      endAt: null,
      venue: null,
      city: null,
      scope: null,
      ticketUrl: null,
      bandTheme: null,
    });
    expect(out.title_en).toBeNull();
    expect(out.end_at).toBeNull();
    expect(out.venue).toBeNull();
  });
});

describe("memberRowToOut", () => {
  it("maps all fields correctly", () => {
    const out = memberRowToOut(BASE_MEMBER);
    expect(out.id).toBe(3);
    expect(out.display_name).toBe("Alice");
    expect(out.city).toBe("Tokyo");
    expect(out.oshi_character).toBe("Kasumi");
    expect(out.oshi_band).toBe("Poppin'Party");
    expect(out.avatar_url).toBeNull();
    expect(out.expedition_member).toBe(1);
    expect(out.role).toBe("member");
  });

  it("does not include externalId", () => {
    const out = memberRowToOut(BASE_MEMBER);
    expect(out).not.toHaveProperty("external_id");
    expect(out).not.toHaveProperty("externalId");
  });

  it("handles null optional fields", () => {
    const out = memberRowToOut({
      ...BASE_MEMBER,
      city: null,
      oshiCharacter: null,
      oshiBand: null,
    });
    expect(out.city).toBeNull();
    expect(out.oshi_character).toBeNull();
    expect(out.oshi_band).toBeNull();
  });
});
