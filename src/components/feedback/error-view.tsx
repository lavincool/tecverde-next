"use client";

import { Button } from "@heroui/react";

import { common, errors } from "@/messages/es-MX";

export function ErrorView({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-lg content-center justify-items-start gap-5 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{errors.unexpected.title}</h1>
      <p className="text-muted">{errors.unexpected.description}</p>
      <Button onPress={reset}>{common.retry}</Button>
    </main>
  );
}
