import { Inbox } from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  children,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-panel p-6 sm:p-7">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full border border-line bg-background text-muted"
      >
        <Icon size={19} strokeWidth={1.6} />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
