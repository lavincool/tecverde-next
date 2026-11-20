"use client";

import { Share2 } from "lucide-react";
import { useCallback, useState } from "react";

import { adoption } from "@/messages/es-MX/adoption";

/** Uses the Web Share API when available and falls back to copying the link. */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }, [text, title]);

  return (
    <div className="flex items-center gap-3">
      <button className="button button--secondary" onClick={share} type="button">
        <Share2 aria-hidden="true" size={16} />
        {adoption.detail.share}
      </button>
      <output aria-live="polite" className="text-sm text-muted">
        {copied ? adoption.detail.copied : undefined}
      </output>
    </div>
  );
}
