import { readFile } from "node:fs/promises";

const attribution =
  /noreply@anthropic\.com|generated\s+with|claude-session|🤖|^\s*co-authored-by\s*:[^\r\n]*\b(?:claude|anthropic|copilot|chatgpt|openai|codex|gemini|cursor|codeium|windsurf|aider|devin|dependabot\s+ai)\b/im;

export function hasAutomatedAttribution(message: string): boolean {
  return attribution.test(message);
}

if (import.meta.main) {
  const path = process.argv[2];

  try {
    const message = await readFile(path ?? "/dev/stdin", "utf8");
    if (hasAutomatedAttribution(message)) {
      console.error("Remove automated attribution from the commit message or pull request body.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
