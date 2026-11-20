"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { common } from "@/messages/es-MX/common";

import { removePushSubscription, savePushSubscription } from "../push-actions";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const copy = common.push;

function decodeKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  return Uint8Array.from(atob(padded), (character) => character.codePointAt(0) ?? 0);
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushToggle({ audience, hint }: { audience: "device" | "staff"; hint: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    async function detect(): Promise<Status> {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return "unsupported";
      }
      if (Notification.permission === "denied") return "denied";
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      return subscription ? "on" : "off";
    }
    async function run() {
      const next = await detect();
      if (active) setStatus(next);
    }
    void run();
    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(() => {
    if (!publicKey) return;
    startTransition(async () => {
      setError(undefined);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(publicKey),
        });
        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
          audience,
        });
        if (!result.ok) {
          await subscription.unsubscribe();
          setError(copy.failed);
          return;
        }
        setStatus("on");
      } catch {
        setError(copy.failed);
      }
    });
  }, [audience]);

  const disable = useCallback(() => {
    startTransition(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription({ endpoint: subscription.endpoint, audience });
        await subscription.unsubscribe();
      }
      setStatus("off");
    });
  }, [audience]);

  if (!publicKey || status === "loading") return null;

  let message: string | undefined = error;
  if (!message && status === "unsupported") message = copy.unsupported;
  if (!message && status === "denied") message = copy.denied;
  if (!message && status === "on") message = copy.enabled;

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">{hint}</p>
      {status === "off" && (
        <button
          className="button button--secondary justify-self-start"
          disabled={pending}
          onClick={enable}
          type="button"
        >
          <Bell aria-hidden="true" size={16} />
          {copy.enable}
        </button>
      )}
      {status === "on" && (
        <button
          className="button button--ghost justify-self-start"
          disabled={pending}
          onClick={disable}
          type="button"
        >
          <BellOff aria-hidden="true" size={16} />
          {copy.disable}
        </button>
      )}
      <output aria-live="polite" className={error ? "report-error text-sm" : "text-sm text-muted"}>
        {message}
      </output>
    </div>
  );
}
