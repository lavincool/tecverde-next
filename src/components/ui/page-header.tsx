import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-prose text-base text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
