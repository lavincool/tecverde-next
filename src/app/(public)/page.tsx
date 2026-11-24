import { ArrowRight, ClipboardList, ClipboardPlus, HeartHandshake, PawPrint } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PetCard } from "@/features/adoption/components/pet-card";
import { getAdoptedStories, getGallery } from "@/features/adoption/queries";
import { QuickReportLinks } from "@/features/reports/components/quick-report-links";
import { navForward } from "@/lib/navigation";
import { adoption, common } from "@/messages/es-MX";

async function HomePets() {
  const [pets, stories] = await Promise.all([
    getGallery({}).catch(() => []),
    getAdoptedStories(4).catch(() => []),
  ]);
  return (
    <div className="grid gap-10">
      <section aria-labelledby="available-pets" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="available-pets" className="text-xl font-semibold tracking-tight">
            {adoption.gallery.title}
          </h2>
          {pets.length > 0 && (
            <Link className="text-sm underline" href="/adopt" transitionTypes={navForward}>
              {adoption.gallery.seeAll}
            </Link>
          )}
        </div>
        {pets.length > 0 ? (
          <ul className="pet-grid">
            {pets.slice(0, 4).map((pet) => (
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={adoption.gallery.emptyTitle}
            description={adoption.gallery.empty}
            icon={PawPrint}
          />
        )}
      </section>
      <section aria-labelledby="recent-adoptions" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent-adoptions" className="text-xl font-semibold tracking-tight">
            {adoption.adopted.title}
          </h2>
          {stories.length > 0 && (
            <Link className="text-sm underline" href="/adopt/adopted" transitionTypes={navForward}>
              {adoption.adopted.seeAll}
            </Link>
          )}
        </div>
        {stories.length > 0 ? (
          <ul className="pet-grid">
            {stories.map((pet) => (
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={adoption.adopted.emptyTitle}
            description={adoption.adopted.empty}
            icon={HeartHandshake}
          />
        )}
      </section>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function HomePage() {
  return (
    <div className="grid gap-10 lg:gap-12">
      <header className="campus-hero">
        <div aria-hidden="true" className="campus-hero-pattern" />
        <div className="relative grid max-w-2xl gap-4">
          <p className="font-mono text-sm font-medium tracking-wide text-hero-accent">
            {common.campus}
          </p>
          <h1 className="max-w-[12ch] text-[clamp(2.25rem,7vw,5.25rem)] leading-[0.98] font-semibold tracking-[-0.065em]">
            {common.home.title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-hero-muted sm:text-lg">
            {common.home.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              className="hero-action"
              data-primary
              href="/reports/new"
              transitionTypes={navForward}
            >
              <ClipboardPlus aria-hidden="true" size={18} strokeWidth={1.9} />
              {common.home.report}
            </Link>
            <Link className="hero-action" href="/adopt" transitionTypes={navForward}>
              <PawPrint aria-hidden="true" size={18} strokeWidth={1.9} />
              {common.home.adopt}
            </Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="quick-report" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="quick-report" className="text-xl font-semibold tracking-tight">
            {common.home.quickTitle}
          </h2>
          <p className="text-sm text-muted">{common.home.quickDescription}</p>
        </div>
        <QuickReportLinks />
        <Link
          className="inline-flex min-h-11 items-center gap-2 justify-self-start text-sm font-medium underline-offset-4 hover:underline"
          href="/reports/mine"
          transitionTypes={navForward}
        >
          <ClipboardList aria-hidden="true" size={17} strokeWidth={1.8} />
          {common.home.mine}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>

      <Suspense fallback={loading}>
        <HomePets />
      </Suspense>
    </div>
  );
}
