"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formText } from "@/lib/form-text";
import { dashboard } from "@/messages/es-MX/dashboard";

import { authClient } from "../auth-client";

const copy = dashboard.settings;
const login = dashboard.login;

export function AccountSettings({
  enabled,
  requiredTwoFactor,
}: {
  enabled: boolean;
  requiredTwoFactor: boolean;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; backupCodes: string[] }>();
  const [passwordResult, setPasswordResult] = useState<string>();
  const [twoFactorResult, setTwoFactorResult] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function changePassword(form: FormData) {
    try {
      const { error } = await authClient.changePassword({
        currentPassword: formText(form, "currentPassword"),
        newPassword: formText(form, "newPassword"),
        revokeOtherSessions: true,
      });
      setPasswordResult(error ? copy.failed : copy.passwordChanged);
    } catch {
      setPasswordResult(login.unavailable);
    }
  }

  async function changeTwoFactor(form: FormData) {
    setBusy(true);
    setTwoFactorResult(undefined);
    try {
      if (setup) {
        const { error } = await authClient.twoFactor.verifyTotp({
          code: formText(form, "code").trim(),
        });
        if (error) {
          setTwoFactorResult(copy.failed);
          return;
        }
        setSetup(undefined);
        setTwoFactorResult(copy.enabled);
        router.refresh();
        return;
      }
      const password = formText(form, "password");
      if (enabled) {
        const { error } = await authClient.twoFactor.disable({ password });
        setTwoFactorResult(error ? copy.failed : copy.disabled);
        if (!error) router.refresh();
        return;
      }
      const { data, error } = await authClient.twoFactor.enable({ password, method: "totp" });
      if (error || data?.method !== "totp") {
        setTwoFactorResult(copy.failed);
        return;
      }
      setSetup({
        secret: new URL(data.totpURI).searchParams.get("secret") ?? "",
        backupCodes: data.backupCodes,
      });
    } catch {
      setTwoFactorResult(login.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form className="staff-panel" action={changePassword}>
        <h2 className="text-xl font-semibold">{copy.passwordTitle}</h2>
        <label className="staff-field">
          {copy.currentPassword}
          <input
            className="staff-input"
            required
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </label>
        <label className="staff-field">
          {dashboard.invite.password}
          <input
            className="staff-input"
            required
            minLength={12}
            maxLength={128}
            name="newPassword"
            type="password"
            autoComplete="new-password"
          />
        </label>
        <output className="text-sm text-muted">{passwordResult}</output>
        <button className="button button--primary" type="submit">
          {copy.updatePassword}
        </button>
      </form>
      <form className="staff-panel" action={changeTwoFactor}>
        <h2 className="text-xl font-semibold">{copy.twoFactor}</h2>
        {requiredTwoFactor && !enabled && <p className="text-sm text-muted">{copy.required}</p>}
        {enabled && <p className="text-sm text-muted">{copy.enabled}</p>}
        {setup ? (
          <>
            <p className="text-sm text-muted">{copy.setup}</p>
            <div className="staff-field">
              <p>{copy.secret}</p>
              <code className="break-all">{setup.secret}</code>
            </div>
            <p className="text-sm text-muted">{copy.backup}</p>
            <ul className="grid gap-1 font-mono text-sm sm:grid-cols-2">
              {setup.backupCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <label className="staff-field">
              {login.code}
              <input
                className="staff-input"
                name="code"
                required
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </label>
          </>
        ) : (
          (!enabled || !requiredTwoFactor) && (
            <label className="staff-field">
              {copy.currentPassword}
              <input
                className="staff-input"
                required
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </label>
          )
        )}
        <output className="text-sm text-muted">{twoFactorResult}</output>
        {(!enabled || !requiredTwoFactor || setup) && (
          <button className="button button--primary" disabled={busy} type="submit">
            {busy ? copy.pending : setup ? login.verify : enabled ? copy.disable : copy.enable}
          </button>
        )}
      </form>
    </div>
  );
}
