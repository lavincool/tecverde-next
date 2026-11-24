import { describe, expect, test } from "bun:test";

import { initialCategories } from "@/messages/es-MX/catalog";
import { reports } from "@/messages/es-MX/reports";

import {
  parseReportTopic,
  reportTopicKeys,
  reportTopicShortLinks,
  resolveReportFormFocus,
} from "./topics";

// The seeded catalog, with ids equal to slugs so expectations stay readable.
const catalog = initialCategories.map(({ slug }) => ({ id: slug, slug }));

describe("report topics", () => {
  test("parse only known topics", () => {
    expect(parseReportTopic("restroom")).toBe("restroom");
    expect(parseReportTopic(["air", "trash"])).toBe("air");
    expect(parseReportTopic("Restroom")).toBeUndefined();
    expect(parseReportTopic(undefined)).toBeUndefined();
  });

  test("every topic matches the seeded catalog and has copy", () => {
    for (const topic of reportTopicKeys) {
      expect(resolveReportFormFocus(catalog, { topic }).categoryIds.length).toBeGreaterThan(0);
      expect(reports.topics[topic].title.length).toBeGreaterThan(0);
    }
  });

  test("restrooms show every restroom category and let the visitor choose", () => {
    expect(resolveReportFormFocus(catalog, { topic: "restroom" })).toEqual({
      categoryIds: ["restroom-paper", "restroom-water"],
      initialCategoryId: "",
    });
  });

  test("single-problem topics preselect their category", () => {
    expect(resolveReportFormFocus(catalog, { topic: "trash" })).toEqual({
      categoryIds: ["full-bins"],
      initialCategoryId: "full-bins",
    });
    expect(resolveReportFormFocus(catalog, { topic: "air" })).toEqual({
      categoryIds: ["air-conditioning"],
      initialCategoryId: "air-conditioning",
    });
    expect(resolveReportFormFocus(catalog, { topic: "water" })).toEqual({
      categoryIds: ["water-leak", "restroom-water"],
      initialCategoryId: "water-leak",
    });
  });

  test("admin-created categories join a topic through their slug prefix", () => {
    const withSoap = [...catalog, { id: "restroom-soap", slug: "restroom-soap" }];
    expect(resolveReportFormFocus(withSoap, { topic: "restroom" }).categoryIds).toEqual([
      "restroom-paper",
      "restroom-water",
      "restroom-soap",
    ]);
  });

  test("a renamed or deactivated category falls back to the full form", () => {
    const withoutAir = catalog.filter(({ slug }) => slug !== "air-conditioning");
    expect(resolveReportFormFocus(withoutAir, { topic: "air" })).toEqual({
      categoryIds: [],
      initialCategoryId: "",
    });
    const onlyOneRestroom = catalog.filter(({ slug }) => slug !== "restroom-water");
    expect(resolveReportFormFocus(onlyOneRestroom, { topic: "restroom" })).toEqual({
      categoryIds: ["restroom-paper"],
      initialCategoryId: "restroom-paper",
    });
  });

  test("an explicit category slug wins and works without a topic", () => {
    expect(resolveReportFormFocus(catalog, { categorySlug: "broken-light" })).toEqual({
      categoryIds: [],
      initialCategoryId: "broken-light",
    });
    expect(
      resolveReportFormFocus(catalog, { topic: "restroom", categorySlug: "restroom-water" })
        .initialCategoryId,
    ).toBe("restroom-water");
    expect(resolveReportFormFocus(catalog, { categorySlug: "missing" }).initialCategoryId).toBe("");
  });

  test("each topic short link is listed for the catalog", () => {
    expect(reportTopicShortLinks().map(({ path, topic }) => [path, topic])).toEqual([
      ["/wc", "restroom"],
      ["/basura", "trash"],
      ["/agua", "water"],
      ["/aire", "air"],
    ]);
  });
});
