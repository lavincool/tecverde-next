import { Leaf } from "lucide-react";
import Link from "next/link";

import { common } from "@/messages/es-MX";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-full font-semibold tracking-tight"
    >
      <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground">
        <Leaf aria-hidden="true" size={17} strokeWidth={2.1} />
      </span>
      <span>{common.appName}</span>
    </Link>
  );
}
