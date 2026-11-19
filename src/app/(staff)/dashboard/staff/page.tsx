import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  InviteStaffForm,
  RevokeInviteForm,
  UpdateStaffForm,
} from "@/features/staff/components/staff-directory-forms";
import { getStaffDirectory } from "@/features/staff/queries";
import { dashboard } from "@/messages/es-MX/dashboard";
import { staffRoleLabels } from "@/messages/es-MX/enums";
import { StaffAccessError } from "@/server/auth/guards";
import { isStaffRole } from "@/server/auth/permissions";

const copy = dashboard.staff;
const eventLabels: Readonly<Record<string, string>> = copy.events;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

async function StaffDirectory() {
  const { users, actor, invites, events } = await getStaffDirectory().catch((error: unknown) => {
    if (!(error instanceof StaffAccessError)) throw error;
    if (error.status === 401) redirect("/login");
    if (error.needsTwoFactor) redirect("/dashboard/settings");
    notFound();
  });

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} />
      <InviteStaffForm />
      <section aria-labelledby="staff-invites" className="staff-panel">
        <h2 id="staff-invites" className="text-xl font-semibold">
          {copy.invites}
        </h2>
        {invites.length ? (
          <ul className="grid divide-y divide-line">
            {invites.map((invite) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                key={invite.id}
              >
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted">{staffRoleLabels[invite.role]}</p>
                  <time
                    className="font-mono text-sm text-muted"
                    dateTime={invite.expiresAt.toISOString()}
                  >
                    {formatDate.format(invite.expiresAt)}
                  </time>
                </div>
                <RevokeInviteForm id={invite.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{copy.noInvites}</p>
        )}
      </section>
      <section aria-labelledby="staff-members" className="grid gap-3">
        <h2 id="staff-members" className="text-xl font-semibold">
          {copy.members}
        </h2>
        <ul className="grid gap-3 xl:grid-cols-2">
          {users.map((member) => (
            <li className="staff-panel" key={member.id}>
              <div>
                <p className="font-semibold">{member.name}</p>
                <p className="text-sm break-all text-muted">{member.email}</p>
              </div>
              {member.twoFactorEnabled && (
                <p className="text-sm text-muted">{copy.twoFactorActive}</p>
              )}
              {member.id === actor.id && <p className="text-sm text-muted">{copy.self}</p>}
              {member.id !== actor.id && member.role && isStaffRole(member.role) && (
                <UpdateStaffForm
                  id={member.id}
                  role={member.role}
                  banned={member.banned === true}
                />
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="staff-audit" className="staff-panel">
        <h2 id="staff-audit" className="text-xl font-semibold">
          {copy.audit}
        </h2>
        {events.length ? (
          <ul className="grid divide-y divide-line">
            {events.map((event) => (
              <li className="flex flex-wrap justify-between gap-2 py-3" key={event.id}>
                <p className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{event.actor ?? copy.deleted}</span>
                  <span>{eventLabels[event.action] ?? copy.unknownEvent}</span>
                </p>
                <time
                  className="font-mono text-sm text-muted"
                  dateTime={event.createdAt.toISOString()}
                >
                  {formatDate.format(event.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{copy.noEvents}</p>
        )}
      </section>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function StaffPage() {
  return (
    <Suspense fallback={loading}>
      <StaffDirectory />
    </Suspense>
  );
}
