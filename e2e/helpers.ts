import { expect } from "@playwright/test";

import type { Page } from "@playwright/test";

/** Waits until the anonymous draft (Turnstile test keys or no keys) has been issued. */
export async function waitForDraft(page: Page) {
  const draft = page.locator("input[name=draftToken]");
  await expect
    .poll(async () => (await draft.inputValue()).length, { timeout: 20_000 })
    .toBeGreaterThan(50);
}

export function uniqueText(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
