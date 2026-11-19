"use client";

import { Skeleton } from "@heroui/react";

import { common } from "@/messages/es-MX";

export function SkeletonCard() {
  return (
    <div className="grid gap-3 rounded-card border border-line bg-panel p-6">
      <output className="sr-only">{common.loading}</output>
      <Skeleton aria-hidden="true" className="size-10 rounded-full" />
      <Skeleton aria-hidden="true" className="h-5 w-2/5 rounded-full" />
      <Skeleton aria-hidden="true" className="h-4 w-4/5 rounded-full" />
    </div>
  );
}
