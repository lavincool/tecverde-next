"use client";

import { useActionState, useState } from "react";

import { dashboard } from "@/messages/es-MX/dashboard";
import { staffRoleLabels } from "@/messages/es-MX/enums";

import { createStaffInvite, revokeStaffInvite, updateStaffAccount } from "../actions";
import { staffRoles } from "../enums";

import type { StaffRole } from "../enums";

const staff = dashboard.staff;

function RoleSelect({ current }: { current: StaffRole }) {
  return (
    <label className="staff-field">
      {staff.role}
      <select className="staff-input" name="role" defaultValue={current}>
        {staffRoles.map((role) => (
          <option value={role} key={role}>
            {staffRoleLabels[role]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InviteStaffForm() {
  const [state, action, pending] = useActionState(createStaffInvite, {});
  const [copied, setCopied] = useState<string>();

  async function copyLink() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(state.link);
  }

  return (
    <div className="staff-panel">
      <h2 className="text-xl font-semibold">{staff.invite}</h2>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <label className="staff-field">
          {dashboard.login.email}
          <input className="staff-input" name="email" type="email" maxLength={254} required />
        </label>
        <RoleSelect current="maintenance" />
        <output className="text-sm text-muted sm:col-span-2">{state.error}</output>
        <button
          className="button button--primary justify-self-start"
          disabled={pending}
          type="submit"
        >
          {staff.invite}
        </button>
      </form>
      {state.link && (
        <div className="grid gap-3">
          <label className="staff-field">
            {staff.inviteLink}
            <input className="staff-input font-mono" readOnly value={state.link} />
          </label>
          <button
            className="button button--secondary justify-self-start"
            type="button"
            onClick={copyLink}
          >
            {staff.copyLink}
          </button>
          <output className="text-sm text-muted">
            {copied === state.link ? staff.copied : undefined}
          </output>
        </div>
      )}
    </div>
  );
}

export function RevokeInviteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revokeStaffInvite, {});
  return (
    <form action={action} className="grid justify-items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <button className="button button--secondary button--sm" disabled={pending} type="submit">
        {staff.revoke}
      </button>
      <output className="text-sm text-muted">{state.error}</output>
    </form>
  );
}

export function UpdateStaffForm({
  id,
  role,
  banned,
}: {
  id: string;
  role: StaffRole;
  banned: boolean;
}) {
  const [state, action, pending] = useActionState(updateStaffAccount, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <RoleSelect current={role} />
      <label className="inline-flex min-h-8 items-center gap-2 text-sm">
        <input type="checkbox" name="banned" defaultChecked={banned} />
        {staff.banned}
      </label>
      <output className="text-sm text-muted">
        {state.error ?? (state.ok ? staff.done : undefined)}
      </output>
      <button
        className="button button--secondary justify-self-start"
        disabled={pending}
        type="submit"
      >
        {staff.save}
      </button>
    </form>
  );
}
