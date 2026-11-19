"use client";

import { useState } from "react";

import { dashboard } from "@/messages/es-MX/dashboard";

import { authClient } from "../auth-client";

export function SignOut() {
  const [error, setError] = useState<string>();

  async function signOut() {
    try {
      const { error: signOutError } = await authClient.signOut();
      if (!signOutError) {
        window.location.replace("/login");
        return;
      }
    } catch {
      setError(dashboard.login.unavailable);
      return;
    }
    setError(dashboard.login.unavailable);
  }

  return (
    <div className="grid justify-items-end gap-1">
      <button type="button" className="button button--ghost" onClick={signOut}>
        {dashboard.nav.exit}
      </button>
      <output className="text-sm text-muted">{error}</output>
    </div>
  );
}
