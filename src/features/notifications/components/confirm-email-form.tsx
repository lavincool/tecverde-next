"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { common } from "@/messages/es-MX/common";

import { confirmEmail } from "../actions";

import type { ConfirmEmailState } from "../actions";

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmEmailState>(
    confirmEmail.bind(null, token),
    {},
  );

  if (state.ok) {
    return (
      <div className="report-panel">
        <p className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-accent" size={20} />
          <output>{state.message}</output>
        </p>
        <Link className="button button--secondary justify-self-start" href="/">
          {common.goHome}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="report-panel">
      <p className="max-w-prose text-muted">{common.verify.description}</p>
      <output aria-live="polite" className="report-error text-sm">
        {state.error}
      </output>
      <button
        className="button button--primary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {pending ? common.verify.pending : common.verify.confirm}
      </button>
    </form>
  );
}
