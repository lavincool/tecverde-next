"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { errors } from "@/messages/es-MX/errors";

import { startDraft } from "../draft-actions";

import type { TurnstileInstance } from "@marsidev/react-turnstile";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const copy = errors.submissions;
const baseOptions = {
  language: "es",
  theme: "auto",
  size: "flexible",
  appearance: "interaction-only",
} as const;
const optionsByScope = {
  report: { ...baseOptions, action: "report_draft" },
  pet: { ...baseOptions, action: "pet_draft" },
  request: { ...baseOptions, action: "request_draft" },
} as const;

/**
 * Solves Cloudflare Turnstile once and exchanges the result for a signed draft token.
 * Without a configured site key (local development) the draft is requested directly.
 */
export function DraftGate({
  scope,
  onDraft,
}: {
  scope: "report" | "pet" | "request";
  onDraft: (draft: { draftId: string; draftToken: string } | undefined) => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const widget = useRef<TurnstileInstance>(undefined);
  const requested = useRef(false);

  const exchange = useCallback(
    (turnstileToken: string) => {
      startTransition(async () => {
        const result = await startDraft({ scope, turnstileToken });
        if (result.ok) {
          setError(undefined);
          onDraft({ draftId: result.draftId, draftToken: result.draftToken });
        } else {
          setError(result.error);
          onDraft(undefined);
          widget.current?.reset();
        }
      });
    },
    [onDraft, scope],
  );

  useEffect(() => {
    if (siteKey || requested.current) return;
    requested.current = true;
    exchange("");
  }, [exchange]);

  const handleExpire = useCallback(() => {
    onDraft(undefined);
    widget.current?.reset();
  }, [onDraft]);

  const handleError = useCallback(() => {
    setError(copy.challenge_failed);
    onDraft(undefined);
  }, [onDraft]);

  return (
    <div className="grid gap-2">
      {siteKey && (
        <Turnstile
          ref={widget}
          siteKey={siteKey}
          options={optionsByScope[scope]}
          onSuccess={exchange}
          onExpire={handleExpire}
          onError={handleError}
        />
      )}
      <output aria-live="polite" className={error ? "report-error text-sm" : "text-sm text-muted"}>
        {error ?? (pending ? copy.verifying : undefined)}
      </output>
    </div>
  );
}
