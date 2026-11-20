import { expect, test } from "@playwright/test";

import { reports } from "../src/messages/es-MX";
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
