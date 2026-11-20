import { render } from "@react-email/components";

import { getEmailTransport } from "./transport";

import type { EmailTransport } from "./transport";
import type { ReactElement } from "react";

export async function renderEmail(element: ReactElement) {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

/** Renders a template and sends it. Callers run this inside `after()` so it never blocks a response. */
export async function sendEmail(
  input: { to: string; subject: string; element: ReactElement; idempotencyKey?: string },
  transport: EmailTransport = getEmailTransport(),
) {
  const { html, text } = await renderEmail(input.element);
  await transport.send({
    to: input.to,
    subject: input.subject,
    html,
    text,
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });
}
