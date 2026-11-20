import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Lets the provider drop accidental duplicates, e.g. on retries. */
  idempotencyKey?: string;
};

export type EmailTransport = {
  name: "resend" | "console" | "memory";
  send: (message: EmailMessage) => Promise<void>;
};

const memoryOutbox: EmailMessage[] = [];

/** Messages captured by the memory transport (tests and E2E only). */
export function readMemoryOutbox(): readonly EmailMessage[] {
  return memoryOutbox;
}

export function clearMemoryOutbox() {
  memoryOutbox.length = 0;
}

export function createMemoryTransport(): EmailTransport {
  return {
    name: "memory",
    send(message) {
      memoryOutbox.push(message);
      return Promise.resolve();
    },
  };
}

function createConsoleTransport(): EmailTransport {
  return {
    name: "console",
    send(message) {
      console.info(`[email] to=${message.to} subject=${message.subject}\n${message.text}`);
      return Promise.resolve();
    },
  };
}

function createResendTransport(apiKey: string, from: string): EmailTransport {
  const client = new Resend(apiKey);
  return {
    name: "resend",
    async send(message) {
      const { error } = await client.emails.send(
        {
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
        message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
      );
      if (error) throw new Error(`Resend rejected the email: ${error.name}`);
    },
  };
}

type Environment = Readonly<Record<string, string | undefined>>;

export function selectEmailTransport(environment: Environment = process.env): EmailTransport {
  const requested = environment.EMAIL_TRANSPORT;
  if (requested === "memory") return createMemoryTransport();
  if (requested === "console") return createConsoleTransport();

  const apiKey = environment.RESEND_API_KEY;
  const from = environment.EMAIL_FROM;
  if (apiKey && from) return createResendTransport(apiKey, from);
  if (requested === "resend" || environment.VERCEL_ENV === "production") {
    throw new Error("Configure RESEND_API_KEY and EMAIL_FROM to send email.");
  }
  return createConsoleTransport();
}

let cached: EmailTransport | undefined;

export function getEmailTransport(): EmailTransport {
  cached ??= selectEmailTransport();
  return cached;
}
