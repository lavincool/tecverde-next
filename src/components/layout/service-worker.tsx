"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { common } from "@/messages/es-MX/common";

const dismissedKey = "tv-install-hint-dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(dismissedKey) === "1";
  } catch {
    return true;
  }
}

/** Registers the service worker and shows a one-time install hint on iOS Safari. */
export function ServiceWorker() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Registration failures only disable offline support.
    });
  }, []);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && navigator.standalone === true);
    const timer = window.setTimeout(() => setShowHint(ios && !standalone && !readDismissed()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setShowHint(false);
    try {
      window.localStorage.setItem(dismissedKey, "1");
    } catch {
      // Ignore storage failures; the hint simply shows again next time.
    }
  }, []);

  if (!showHint) return null;
  return (
    <aside aria-label={common.install.title} className="install-hint">
      <p className="text-sm">
        <span className="font-semibold">{common.install.title}</span>
        <span className="block text-muted">{common.install.ios}</span>
      </p>
      <button
        aria-label={common.install.dismiss}
        className="button button--ghost button--icon-only"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </aside>
  );
}
