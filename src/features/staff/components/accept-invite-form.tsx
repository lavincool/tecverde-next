"use client";

import Link from "next/link";
import { useActionState } from "react";

import { dashboard } from "@/messages/es-MX/dashboard";

import { acceptInvite } from "../actions";

const copy = dashboard.invite;

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), {});
  if (state.ok) {
    return (
      <div className="staff-panel">
        <p>{copy.done}</p>
        <Link className="button button--primary" href="/login" replace>
          {dashboard.login.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="staff-panel">
      <label className="staff-field">
        {copy.name}
        <input className="staff-input" name="name" maxLength={100} required autoComplete="name" />
      </label>
      <label className="staff-field">
        {copy.password}
        <input
          className="staff-input"
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
          aria-describedby="password-length"
        />
      </label>
      <p id="password-length" className="text-sm text-muted">
        {copy.length}
      </p>
      <output className="text-sm text-muted">{state.error}</output>
      <button className="button button--primary" disabled={pending} type="submit">
        {copy.accept}
      </button>
    </form>
  );
}
