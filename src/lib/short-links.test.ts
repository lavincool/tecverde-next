import { describe, expect, test } from "bun:test";

import { resolveShortLink, shortLinks } from "./short-links";

describe("short links", () => {
  test("open the report form on a topic or the adoption gallery", () => {
    expect(resolveShortLink("/wc")).toBe("/reports/new?topic=restroom");
    expect(resolveShortLink("/basura")).toBe("/reports/new?topic=trash");
    expect(resolveShortLink("/agua")).toBe("/reports/new?topic=water");
    expect(resolveShortLink("/aire")).toBe("/reports/new?topic=air");
    expect(resolveShortLink("/adopta")).toBe("/adopt");
  });

  test("match printed variants regardless of case or trailing slash", () => {
    expect(resolveShortLink("/WC")).toBe(shortLinks.wc);
    expect(resolveShortLink("/Basura/")).toBe(shortLinks.basura);
    expect(resolveShortLink("/ADOPTA")).toBe(shortLinks.adopta);
  });

  test("keep the visitor's query without letting it replace the topic", () => {
    expect(resolveShortLink("/wc", "?building=library&utm_source=qr")).toBe(
      "/reports/new?topic=restroom&building=library&utm_source=qr",
    );
    expect(resolveShortLink("/aire", "?topic=restroom")).toBe("/reports/new?topic=air");
    expect(resolveShortLink("/adopta", "?species=cat")).toBe("/adopt?species=cat");
  });

  test("ignore every other path", () => {
    for (const path of [
      "/",
      "/adopt",
      "/reports/new",
      "/wc/extra",
      "/w",
      "/toString",
      "/__proto__",
    ]) {
      expect(resolveShortLink(path)).toBeUndefined();
    }
  });
});
