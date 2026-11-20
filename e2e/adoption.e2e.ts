import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { adoption } from "../src/messages/es-MX";
import { uniqueText, waitForDraft } from "./helpers";

const post = adoption.post;

test("posting an animal returns a private management link that waits for verification", async ({
  page,
}) => {
  await page.goto("/adopt/new");
  await waitForDraft(page);
  await page.getByLabel(post.name).fill(uniqueText("Canela"));
  await page.getByLabel(post.species, { exact: true }).selectOption("dog");
  await page.getByLabel(post.sex).selectOption("female");
  await page.getByLabel(post.ageGroup).selectOption("young");
  await page.getByLabel(post.size).selectOption("medium");
  await page.getByText("Tranquilo").click();
  await page.getByLabel(post.story).fill("Le gusta dormir bajo los árboles y saluda a todos.");
  await page.getByLabel(post.posterName).fill("Persona de prueba");
  await page.getByLabel(post.posterEmail).fill("e2e@example.com");
  await page.getByLabel(post.consent).check();
  await page.getByRole("button", { name: post.submit }).click();
  await expect(page.getByRole("heading", { name: post.done.title })).toBeVisible();

  const manageUrl = await page.getByLabel(post.done.manage).inputValue();
  await page.goto(new URL(manageUrl).pathname);
  await expect(page.getByText(adoption.manage.pendingVerification)).toBeVisible();
  // Unapproved posts never reach the public gallery.
  await page.goto("/adopt");
  await expect(page.getByText("e2e@example.com")).toHaveCount(0);
});

for (const path of ["/adopt", "/adopt/new", "/adopt/adopted", "/privacy"]) {
  test(`${path} has no serious or critical accessibility findings`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .exclude("iframe")
      .analyze();
    expect(
      result.violations.filter(({ impact }) => impact === "critical" || impact === "serious"),
    ).toEqual([]);
  });
}
