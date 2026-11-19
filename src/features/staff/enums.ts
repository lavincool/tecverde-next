export const staffRoles = ["admin", "maintenance", "moderator"] as const;
export type StaffRole = (typeof staffRoles)[number];
