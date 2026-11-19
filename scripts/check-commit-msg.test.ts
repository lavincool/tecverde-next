import { describe, expect, test } from "bun:test";

import { hasAutomatedAttribution } from "./check-commit-msg";

describe("commit and pull request attribution", () => {
  test.each([
    "Co-Authored-By: Claude <example@example.com>",
    "co-authored-by: OpenAI Codex <example@example.com>",
    "Co-authored-by: Example <noreply@anthropic.com>",
    "Generated with Example",
    "Claude-Session: example",
    "feat: add alerts 🤖",
  ])("rejects automated attribution in %s", (message) => {
    expect(hasAutomatedAttribution(message)).toBe(true);
  });

  test("allows a human co-author", () => {
    expect(hasAutomatedAttribution("Co-authored-by: Ana Pérez <ana@example.com>")).toBe(false);
  });
});
