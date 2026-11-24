import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { adoption, reports } from "../src/messages/es-MX";
import { uniqueText, waitForDraft } from "./helpers";

const form = reports.form;

test("an anonymous report appears in the device's report list and tracking page", async ({
  page,
}) => {
  const location = uniqueText("Pasillo de prueba");
  await page.goto("/reports/new?building=library");
  await waitForDraft(page);
  await page.getByText("Luminaria fundida").click();
  await expect(page.getByLabel(form.buildingLabel)).toHaveValue(/.+/);
  await page.getByLabel(form.locationLabel).fill(location);
  await page.getByLabel(form.descriptionLabel).fill("La luminaria parpadea toda la noche.");
  await page.getByRole("button", { name: form.submit }).click();
  await expect(page.getByRole("heading", { name: form.success.title })).toBeVisible();

  const trackingUrl = await page.getByLabel(form.success.trackingLinkLabel).inputValue();
  await page.goto("/reports/mine");
  await expect(page.getByText(location)).toBeVisible();

  const tracking = await page.context().browser()?.newContext();
  if (!tracking) throw new Error("Expected a browser.");
  const other = await tracking.newPage();
  await other.goto(new URL(trackingUrl).pathname);
  await expect(other.getByText(location)).toBeVisible();
  await tracking.close();
});

test("another device can confirm a similar open report only once", async ({ browser, page }) => {
  const location = uniqueText("Baño planta alta");
  await page.goto("/reports/new?building=cafeteria");
  await waitForDraft(page);
  await page.getByText("Baño sin agua").click();
  await page.getByLabel(form.locationLabel).fill(location);
  await page.getByLabel(form.descriptionLabel).fill("No sale agua de los lavabos.");
  await page.getByRole("button", { name: form.submit }).click();
  await expect(page.getByRole("heading", { name: form.success.title })).toBeVisible();

  const visitor = await browser.newContext();
  const other = await visitor.newPage();
  await other.goto("/reports/new?building=cafeteria");
  await other.getByText("Baño sin agua").click();
  const confirm = other.getByRole("button", { name: reports.similar.confirmLabel(location) });
  await confirm.click();
  await expect(other.getByText(reports.similar.results.confirmed)).toBeVisible();
  await expect(confirm).toBeDisabled();

  await other.reload();
  await other.getByText("Baño sin agua").click();
  await expect(
    other.getByRole("button", { name: reports.similar.confirmLabel(location) }),
  ).toBeDisabled();
  await visitor.close();
});

test("printed short links open the report form on the matching problem", async ({ page }) => {
  await page.goto("/WC?building=library");
  await expect(page).toHaveURL(/\/reports\/new\?topic=restroom&building=library$/);
  await expect(page.getByRole("heading", { name: reports.topics.restroom.title })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Baño sin papel" })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: "Luminaria fundida" })).toHaveCount(0);
  await expect(page.getByLabel(form.buildingLabel)).toHaveValue(/.+/);
  await page.getByRole("button", { name: form.showAllCategories }).click();
  await expect(page.getByRole("radio", { name: "Luminaria fundida" })).toHaveCount(1);
  // Keyboard focus moves to the newly revealed options instead of getting lost.
  await expect(page.locator("input[name=categoryId]:focus")).toHaveCount(1);
});

for (const [path, topic, category] of [
  ["/basura", "trash", "Botes de basura llenos"],
  ["/agua", "water", "Fuga de agua"],
  ["/aire", "air", "Aire acondicionado con falla"],
] as const) {
  test(`${path} preselects ${category}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/reports/new\\?topic=${topic}$`));
    await expect(page.getByRole("heading", { name: reports.topics[topic].title })).toBeVisible();
    await expect(page.getByRole("radio", { name: category })).toBeChecked();
  });
}

test("the adoption short link opens the gallery", async ({ page }) => {
  await page.goto("/adopta");
  await expect(page).toHaveURL(/\/adopt$/);
  await expect(page.getByRole("heading", { level: 1, name: adoption.gallery.title })).toBeVisible();
});

for (const path of ["/reports/new", "/reports/new?topic=air"]) {
  test(`${path} has no serious or critical accessibility findings`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await expect(page.getByRole("button", { name: form.submit })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .exclude("iframe")
      .analyze();
    expect(
      result.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
    ).toEqual([]);
  });
}
