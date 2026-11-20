import Link from "next/link";
import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { Brand } from "@/components/layout/brand";
import { SignOut } from "@/features/staff/components/sign-out";
import { common, dashboard } from "@/messages/es-MX";
import { staffRoleLabels } from "@/messages/es-MX/enums";
import { requireStaffPage } from "@/server/auth/guards";
import { hasStaffPermission } from "@/server/auth/permissions";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function DashboardFrame({ children }: { children: ReactNode }) {
  const staff = await requireStaffPage(undefined, true);
  const enrollmentRequired = staff.role === "admin" && !staff.twoFactorEnabled;

  return (
    <>
      <a href="#main-content" className="skip-link">
        {common.skipLink}
      </a>
      <header className="public-header">
        <Brand />
        <span className="hidden text-sm text-muted sm:inline">{staffRoleLabels[staff.role]}</span>
        <SignOut />
      </header>
      <div className="staff-shell">
        <nav className="staff-nav" aria-label={dashboard.nav.label}>
          {!enrollmentRequired && (
            <Link className="staff-nav-link" href="/dashboard">
              {dashboard.nav.home}
            </Link>
          )}
          {!enrollmentRequired && hasStaffPermission(staff.role, { report: ["read"] }) && (
            <Link className="staff-nav-link" href="/dashboard/reports">
              {dashboard.nav.reports}
            </Link>
          )}
          {!enrollmentRequired && hasStaffPermission(staff.role, { metrics: ["read"] }) && (
            <Link className="staff-nav-link" href="/dashboard/metrics">
              {dashboard.nav.metrics}
            </Link>
          )}
          {staff.role === "admin" && staff.twoFactorEnabled && (
            <Link className="staff-nav-link" href="/dashboard/staff">
              {dashboard.nav.staff}
            </Link>
          )}
          <Link className="staff-nav-link" href="/dashboard/settings">
            {dashboard.nav.settings}
          </Link>
        </nav>
        <main id="main-content" tabIndex={-1} className="public-content">
          {children}
        </main>
      </div>
    </>
  );
}

const loading = (
  <div className="p-6">
    <SkeletonCard />
  </div>
);

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={loading}>
      <DashboardFrame>{children}</DashboardFrame>
    </Suspense>
  );
}
