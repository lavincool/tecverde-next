"use client";

import { ClipboardList, House, PawPrint, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { navBack, navForward } from "@/lib/navigation";
import { nav } from "@/messages/es-MX";

const links = [
  { href: "/", label: nav.home, icon: House },
  { href: "/reports/new", label: nav.report, icon: Plus },
  { href: "/adopt", label: nav.adopt, icon: PawPrint },
  { href: "/reports/mine", label: nav.mine, icon: ClipboardList },
] as const;

export function PublicNavigation() {
  const pathname = usePathname();

  return (
    <nav className="public-nav" aria-label={nav.main}>
      {links.map(({ href, label, icon: Icon }) => {
        const current = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

        return (
          <Link
            aria-current={current ? "page" : undefined}
            className="public-nav-link"
            data-primary={href === "/reports/new"}
            href={href}
            key={href}
            transitionTypes={href === "/" ? navBack : navForward}
          >
            <span className="public-nav-icon">
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
