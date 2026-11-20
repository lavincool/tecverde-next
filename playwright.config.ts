import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3190";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "es-MX",
    timezoneId: "America/Matamoros",
    trace: "retain-on-failure",
    ...(bypass
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": bypass,
            "x-vercel-set-bypass-cookie": "samesitenone",
          },
        }
      : {}),
  },
  projects: [
    { name: "desktop-chrome", use: devices["Desktop Chrome"] },
    { name: "mobile-chrome", use: devices["Pixel 7"] },
    { name: "mobile-safari", use: devices["iPhone 15"] },
  ],
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: "bun run start --hostname 127.0.0.1 --port 3190",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
