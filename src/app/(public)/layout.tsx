import { LogIn } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { PublicNavigation } from "@/components/layout/public-navigation";
import { navForward } from "@/lib/navigation";
import { common, nav } from "@/messages/es-MX";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        {common.skipLink}
      </a>
      <header className="public-header">
        <div className="flex items-center gap-6">
          <Brand />
          <span className="hidden border-s border-line ps-6 text-sm text-muted sm:inline">
            {common.campus}
          </span>
        </div>
        <Link className="staff-link" href="/login" transitionTypes={navForward}>
          <LogIn aria-hidden="true" size={17} />
          {/* Staff are a handful of people; keep the public header quiet on phones. */}
          <span className="sr-only sm:not-sr-only">{nav.login}</span>
        </Link>
      </header>
      <div className="public-shell">
        <PublicNavigation />
        <main id="main-content" tabIndex={-1} className="public-content">
          {children}
        </main>
      </div>
    </>
  );
}
