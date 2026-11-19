import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import { staffRoles } from "@/features/staff/enums";

import type { StaffRole } from "@/features/staff/enums";

const statements = {
  ...defaultStatements,
  report: ["read", "triage", "assign", "resolve", "delete", "export"],
  pet: ["moderate", "update", "archive", "delete"],
  adoption_request: ["read", "update"],
  catalog: ["manage"],
  staff: ["invite", "set_role", "ban"],
  metrics: ["read"],
} as const;

export const accessControl = createAccessControl(statements);
export const roles = {
  admin: accessControl.newRole(statements),
  maintenance: accessControl.newRole({
    report: ["read", "triage", "assign", "resolve"],
    metrics: ["read"],
  }),
  moderator: accessControl.newRole({
    pet: ["moderate", "update", "archive"],
    adoption_request: ["read", "update"],
  }),
};

type FeatureResource = Exclude<keyof typeof statements, keyof typeof defaultStatements>;
export type StaffPermission = {
  [Resource in FeatureResource]?: (typeof statements)[Resource][number][];
};

export function isStaffRole(role: string): role is StaffRole {
  return staffRoles.some((allowed) => allowed === role);
}

export function hasStaffPermission(role: StaffRole, permission: StaffPermission) {
  return roles[role].authorize(permission).success;
}
