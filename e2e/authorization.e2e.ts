import { expect, test } from "@playwright/test";

import { adoption, common, reports } from "../src/messages/es-MX";

test("staff-only endpoints reject anonymous requests", async ({ request }) => {
  expect((await request.get("/api/reports/export")).status()).toBe(401);
  const jobs = await Promise.all(
    ["cleanup-media", "purge", "staff-digest"].map((job) =>
      request.post(`/api/schedules/${job}`, {
        headers: { authorization: "Bearer not-the-secret-value-for-schedules" },
      }),
    ),
  );
  expect(jobs.map((response) => response.status())).toEqual([401, 401, 401]);
});

for (const path of [
  "/dashboard",
  "/dashboard/reports",
  "/dashboard/adoption",
  "/dashboard/metrics",
]) {
  test(`${path} redirects anonymous visitors to the login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("capability links reject unknown tokens", async ({ page }) => {
  const fake = "x".repeat(43);
  await page.goto(`/reports/track/${fake}`);
  await expect(page.getByText(reports.track.invalidTitle)).toBeVisible();
  await page.goto(`/adopt/manage/${fake}`);
  await expect(page.getByText(adoption.manage.invalidTitle)).toBeVisible();
  await page.goto(`/verify/${fake}`);
  await expect(page.getByText(common.verify.invalidTitle)).toBeVisible();
});

test("responses carry the security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});
