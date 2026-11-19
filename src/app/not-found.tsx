import Link from "next/link";

import { common, errors } from "@/messages/es-MX";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg content-center justify-items-start gap-5 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">{errors.notFound.title}</h1>
      <p className="text-muted">{errors.notFound.description}</p>
      <Link className="button button--primary" href="/">
        {common.goHome}
      </Link>
    </main>
  );
}
