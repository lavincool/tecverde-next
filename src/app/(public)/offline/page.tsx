import { WifiOff } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { common } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: common.offline.title, robots: { index: false } };

export default function OfflinePage() {
  return (
    <EmptyState
      description={common.offline.description}
      icon={WifiOff}
      title={common.offline.title}
    >
      <Link className="button button--primary" href="/">
        {common.offline.retry}
      </Link>
    </EmptyState>
  );
}
