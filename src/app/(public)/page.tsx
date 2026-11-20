import { ClipboardPlus, HeartHandshake, PawPrint } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PetCard } from "@/features/adoption/components/pet-card";
import { getAdoptedStories, getGallery } from "@/features/adoption/queries";
import { navForward } from "@/lib/navigation";
import { adoption, common, reports } from "@/messages/es-MX";

const actions = [
  {
    href: "/reports/new",
    title: reports.new.title,
    description: reports.new.description,
    icon: ClipboardPlus,
  },
  {
    href: "/adopt",
    title: adoption.gallery.title,
    description: adoption.gallery.description,
    icon: PawPrint,
  },
] as const;

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
              {adoption.gallery.title}
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
          <h1 className="max-w-[12ch] text-[clamp(2.65rem,7vw,5.25rem)] leading-[0.98] font-semibold tracking-[-0.065em]">
            {common.home.title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-hero-muted sm:text-lg">
            {common.home.description}
          </p>
        </div>
      </header>

      <section aria-labelledby="home-actions" className="grid gap-4">
        <h2 id="home-actions" className="text-xl font-semibold tracking-tight">
          {common.home.actions}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map(({ href, title, description, icon: Icon }, index) => (
            <Link
              className="home-action"
              data-primary={index === 0}
              href={href}
              key={href}
              transitionTypes={navForward}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-panel text-foreground">
                <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <span className="grid gap-1">
                <span className="text-lg font-semibold tracking-tight">{title}</span>
                <span className="home-action-description text-sm leading-snug">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Suspense fallback={loading}>
        <HomePets />
      </Suspense>
    </div>
  );
}
