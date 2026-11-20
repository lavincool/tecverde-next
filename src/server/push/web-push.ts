import "server-only";

import { sendNotification, setVapidDetails } from "web-push";

export type PushPayload = { title: string; body: string; url: string; tag?: string };
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

let configured: boolean | undefined;

export function isPushConfigured() {
  if (configured !== undefined) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(publicKey && privateKey && subject);
  if (configured && publicKey && privateKey && subject) {
    setVapidDetails(subject, publicKey, privateKey);
  }
  return configured;
}

/** Sends one notification. Returns "gone" when the push service says the subscription expired. */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<"sent" | "gone" | "failed"> {
  if (!isPushConfigured()) return "failed";
  try {
    await sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "sent";
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
