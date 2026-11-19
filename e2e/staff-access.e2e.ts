import { expect, test } from "@playwright/test";

import { dashboard } from "../src/messages/es-MX/dashboard";

test("anonymous dashboard visitors reach the staff login", async ({ page }) => {
  await page.goto("/dashboard/staff");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: dashboard.login.title })).toBeVisible();
});

for (const path of ["sign-up/email", "admin/create-user"]) {
  test(`the ${path} endpoint is not exposed`, async ({ request }) => {
    const response = await request.post(`/api/auth/${path}`, { data: {} });
    expect(response.status()).toBe(404);
  });
}
