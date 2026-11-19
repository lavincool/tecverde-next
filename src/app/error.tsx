"use client";

import { ErrorView } from "@/components/feedback/error-view";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <ErrorView reset={reset} />;
}
