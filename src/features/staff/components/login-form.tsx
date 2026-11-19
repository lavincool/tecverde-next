"use client";

import { useState } from "react";

import { formText } from "@/lib/form-text";
import { dashboard } from "@/messages/es-MX/dashboard";

import { authClient } from "../auth-client";

const copy = dashboard.login;

export function LoginForm() {
  const [step, setStep] = useState<"password" | "totp" | "backup">("password");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(form: FormData) {
    setPending(true);
    setError(undefined);
    try {
      if (step === "password") {
        const { data, error: signInError } = await authClient.signIn.email({
          email: formText(form, "email"),
          password: formText(form, "password"),
        });
        if (signInError) {
          setError(copy.invalid);
          return;
        }
        if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
          setStep("totp");
          return;
        }
        if (
          data?.user &&
          "role" in data.user &&
          data.user.role === "admin" &&
          !data.user.twoFactorEnabled
        ) {
          window.location.replace("/dashboard/settings");
          return;
        }
      } else {
        const code = formText(form, "code").trim();
        const { error: verificationError } =
          step === "totp"
            ? await authClient.twoFactor.verifyTotp({ code })
            : await authClient.twoFactor.verifyBackupCode({ code });
        if (verificationError) {
          setError(copy.invalid);
          return;
        }
      }
      window.location.replace("/dashboard");
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="staff-panel">
      {step === "password" ? (
        <>
          <label className="staff-field">
            {copy.email}
            <input
              className="staff-input"
              name="email"
              required
              type="email"
              autoComplete="username"
            />
          </label>
          <label className="staff-field">
            {copy.password}
            <input
              className="staff-input"
              name="password"
              required
              type="password"
              autoComplete="current-password"
            />
          </label>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{copy.verifyTitle}</h2>
          <p className="text-sm text-muted">{copy.verifyDescription}</p>
          <label className="staff-field">
            {step === "totp" ? copy.code : copy.backupCode}
            <input
              className="staff-input"
              key={step}
              name="code"
              required
              inputMode={step === "totp" ? "numeric" : "text"}
              autoComplete="one-time-code"
              maxLength={step === "totp" ? 6 : 64}
            />
          </label>
          <button
            type="button"
            className="justify-self-start rounded-full px-2 py-2 text-sm font-medium text-accent"
            onClick={() => setStep(step === "totp" ? "backup" : "totp")}
          >
            {step === "totp" ? copy.switchToBackup : copy.switchToTotp}
          </button>
        </>
      )}
      <output className="text-sm text-muted">{error}</output>
      <button className="button button--primary" disabled={pending} type="submit">
        {pending ? copy.pending : step === "password" ? copy.signIn : copy.verify}
      </button>
    </form>
  );
}
