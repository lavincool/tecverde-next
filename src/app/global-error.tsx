"use client";

import { ErrorView } from "@/components/feedback/error-view";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es-MX">
      <body>
        <ErrorView reset={reset} />
      </body>
    </html>
  );
}
