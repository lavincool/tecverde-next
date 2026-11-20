import { z } from "zod";

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const siteverifyResponse = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  hostname: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

export type TurnstileConfig = {
  secretKey: string | undefined;
  /** Hostnames the token must be issued for. Empty accepts any hostname. */
  hostnames: string[];
  /** Fails closed when no secret is configured. */
  required: boolean;
};

type Environment = Readonly<Record<string, string | undefined>>;
export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export function readTurnstileConfig(environment: Environment = process.env): TurnstileConfig {
  const hostnames: string[] = [];
  for (const candidate of [environment.NEXT_PUBLIC_APP_URL, environment.VERCEL_URL]) {
    if (!candidate) continue;
    try {
      hostnames.push(
        new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname,
      );
    } catch {
      // Ignore malformed origins; env validation reports them at startup.
    }
  }
  return {
    secretKey: environment.TURNSTILE_SECRET_KEY || undefined,
    hostnames,
    required: environment.VERCEL_ENV === "production",
  };
}

export async function verifyTurnstile(
  token: string,
  options: {
    action: string;
    remoteIp?: string | undefined;
    config?: TurnstileConfig;
    fetcher?: Fetcher;
  },
): Promise<boolean> {
  const config = options.config ?? readTurnstileConfig();
  if (!config.secretKey) return !config.required;
  if (!token || token.length > 2048) return false;

  const body = new FormData();
  body.set("secret", config.secretKey);
  body.set("response", token);
  if (options.remoteIp) body.set("remoteip", options.remoteIp);

  try {
    const response = await (options.fetcher ?? fetch)(siteverifyUrl, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = siteverifyResponse.safeParse(await response.json());
    if (!result.success || !result.data.success) return false;
    if (result.data.action && result.data.action !== options.action) return false;
    if (
      config.hostnames.length > 0 &&
      result.data.hostname &&
      !config.hostnames.includes(result.data.hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
