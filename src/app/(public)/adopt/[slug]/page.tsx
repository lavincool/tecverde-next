import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { StatusChip } from "@/components/ui/status-chip";
import { petImageUrl } from "@/features/adoption/components/pet-card";
import { PhotoCarousel } from "@/features/adoption/components/photo-carousel";
import { AdoptionRequestForm } from "@/features/adoption/components/request-form";
import { ShareButton } from "@/features/adoption/components/share-button";
import { getPublicPet } from "@/features/adoption/queries";
import { navBack } from "@/lib/navigation";
import { adoption, common } from "@/messages/es-MX";
import {
  ageGroupLabels,
  healthStateLabels,
  sexLabels,
  sizeLabels,
  speciesLabels,
  temperamentLabels,
} from "@/messages/es-MX/enums";

import type { CarouselPhoto } from "@/features/adoption/components/photo-carousel";
import type { Metadata } from "next";

const copy = adoption.detail;

export async function generateMetadata({ params }: PageProps<"/adopt/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const pet = await getPublicPet(slug);
  if (!pet) return { title: adoption.gallery.title };
  return {
    title: pet.name,
    description: copy.shareText(pet.name),
    openGraph: { title: pet.name, description: copy.shareText(pet.name), type: "article" },
  };
}

async function PetDetail({ params }: PageProps<"/adopt/[slug]">) {
  const { slug } = await params;
  const pet = await getPublicPet(slug);
  if (!pet) notFound();

  const photos: CarouselPhoto[] = pet.photos.flatMap((photo, index) => {
    const src = petImageUrl(photo.key);
    return src ? [{ ...photo, src, alt: copy.photoAlt(pet.name, index + 1) }] : [];
  });
  const speciesName =
    pet.species === "other"
      ? (pet.speciesOther ?? speciesLabels.other)
      : speciesLabels[pet.species];
  const facts = [
    [adoption.post.species, speciesName],
    [adoption.post.sex, sexLabels[pet.sex]],
    [adoption.post.ageGroup, ageGroupLabels[pet.ageGroup]],
    [adoption.post.size, sizeLabels[pet.size]],
    [
      copy.area,
      [pet.areaName, pet.areaReference].filter(Boolean).join(common.separator) || copy.areaUnknown,
    ],
  ] as const;
  const health = [
    [copy.vaccinated, healthStateLabels[pet.vaccinated]],
    [copy.sterilized, healthStateLabels[pet.sterilized]],
    [copy.dewormed, healthStateLabels[pet.dewormed]],
  ] as const;

  return (
    <article className="grid gap-7">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <ViewTransition name={`pet-${pet.id}`}>
          <div>
            {photos.length > 0 ? (
              <PhotoCarousel photos={photos} />
            ) : (
              <p className="rounded-card border border-line bg-panel p-6 text-muted">
                {copy.noPhotos}
              </p>
            )}
          </div>
        </ViewTransition>
        <div className="grid gap-5">
          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{pet.name}</h1>
              <StatusChip domain="pet" status={pet.status} />
            </div>
            <ShareButton text={copy.shareText(pet.name)} title={pet.name} />
          </header>
          {pet.status === "adopted" && <p className="text-muted">{copy.adoptedNotice}</p>}
          {pet.status === "in_process" && <p className="text-muted">{copy.inProcessNotice}</p>}
          <section aria-labelledby="pet-about" className="report-panel">
            <h2 className="text-lg font-semibold" id="pet-about">
              {copy.about}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div className="grid gap-0.5" key={label}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {pet.temperament.length > 0 && (
              <div className="grid gap-2">
                <h3 className="text-sm text-muted">{copy.temperament}</h3>
                <ul className="flex flex-wrap gap-2">
                  {pet.temperament.map((value) => (
                    <li className="rounded-full border border-line px-3 py-1 text-sm" key={value}>
                      {temperamentLabels[value]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section aria-labelledby="pet-health" className="report-panel">
            <h2 className="text-lg font-semibold" id="pet-health">
              {copy.health}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              {health.map(([label, value]) => (
                <div className="grid gap-0.5" key={label}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {pet.healthNotes && <p className="text-sm leading-relaxed">{pet.healthNotes}</p>}
          </section>
        </div>
      </div>

      <section aria-labelledby="pet-story" className="report-panel">
        <h2 className="text-lg font-semibold" id="pet-story">
          {copy.story}
        </h2>
        <p className="max-w-prose leading-relaxed whitespace-pre-wrap">{pet.story}</p>
      </section>
      {pet.successStory && (
        <section aria-labelledby="pet-success" className="report-panel">
          <h2 className="text-lg font-semibold" id="pet-success">
            {copy.successStory}
          </h2>
          <p className="max-w-prose leading-relaxed whitespace-pre-wrap">{pet.successStory}</p>
        </section>
      )}

      {pet.status !== "adopted" && (
        <details className="grid gap-4">
          <summary className="button button--primary w-fit">{adoption.request.open}</summary>
          <div className="pt-4">
            <AdoptionRequestForm petId={pet.id} petName={pet.name} />
          </div>
        </details>
      )}

      <Link
        className="button button--secondary justify-self-start"
        href="/adopt"
        transitionTypes={navBack}
      >
        {copy.back}
      </Link>
    </article>
  );
}

const loading = <SkeletonCard />;

export default function PetPage(props: PageProps<"/adopt/[slug]">) {
  return (
    <Suspense fallback={loading}>
      <PetDetail {...props} />
    </Suspense>
  );
}
