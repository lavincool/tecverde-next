import { PageHeader } from "@/components/ui/page-header";
import { privacy } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = { title: privacy.title, description: privacy.description };

export default function PrivacyPage() {
  return (
    <article className="grid max-w-prose gap-7">
      <PageHeader title={privacy.title} description={privacy.description} />
      <p className="rounded-card border border-line bg-panel p-4 text-sm text-muted">
        {privacy.draft}
      </p>
      {privacy.sections.map((section) => (
        <section className="grid gap-2" key={section.heading}>
          <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
          <p className="leading-relaxed">{section.body}</p>
        </section>
      ))}
    </article>
  );
}
