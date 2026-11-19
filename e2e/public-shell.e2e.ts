import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { common, errors, nav, reports } from "../src/messages/es-MX";

for (const width of [360, 768, 1280]) {
  test(`the public shell fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 840 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: common.home.title })).toBeVisible();

    const navigation = page.getByRole("navigation", { name: nav.main });
    await expect(navigation.getByRole("link", { name: nav.home })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

    await navigation.getByRole("link", { name: nav.report }).click();
    await expect(page.getByRole("heading", { name: reports.new.title })).toBeVisible();
    await expect(navigation.getByRole("link", { name: nav.report })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`the ${colorScheme} theme has no serious or critical accessibility findings`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${colorScheme}\\b`));
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
    ).toEqual([]);
  });
}

test("keyboard users can skip navigation and see focus on interactive controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: common.skipLink });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Reportar un problema/ })).toBeFocused();
});

test("the UI gallery is unavailable in production", async ({ page }) => {
  const response = await page.goto("/dev/ui");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: errors.notFound.title })).toBeVisible();
});
