import { PageHeader } from "@/components/ui/page-header";
import { LoginForm } from "@/features/staff/components/login-form";
import { dashboard } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: dashboard.login.title, robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={dashboard.login.title} description={dashboard.login.description} />
      <LoginForm />
    </div>
  );
}
