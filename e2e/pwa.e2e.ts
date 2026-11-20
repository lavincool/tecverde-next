import { expect, test } from "@playwright/test";

import { common } from "../src/messages/es-MX";

test("the web app manifest and icons are installable", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ lang: "es-MX", display: "standalone", start_url: "/" });
  const icons: { src: string }[] = manifest.icons;
  const responses = await Promise.all(icons.map((icon) => request.get(icon.src)));
  for (const response of responses)
    expect(response.headers()["content-type"]).toContain("image/png");
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
});

test("navigation falls back to the Spanish offline page", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Offline emulation of service workers is Chromium-only.");
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto("/adopt").catch(() => undefined);
  await expect(page.getByText(common.offline.title)).toBeVisible();
  await context.setOffline(false);
});
