import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { petImageUrl } from "@/features/adoption/components/pet-card";
import { RequestList } from "@/features/adoption/components/request-list";
import {
  AddPetPhotosForm,
  DeletePetForm,
  ModerationForms,
  PetProfileForm,
  PetStatusForm,
} from "@/features/adoption/components/staff-forms";
import { getStaffPet } from "@/features/adoption/queries";
import { mediaLimits } from "@/features/media/keys";
import { navBack } from "@/lib/navigation";
import { adoption, common, dashboard } from "@/messages/es-MX";
import {
  ageGroupLabels,
  healthStateLabels,
  petStatusLabels,
  sexLabels,
  sizeLabels,
  speciesLabels,
} from "@/messages/es-MX/enums";
import { media } from "@/messages/es-MX/media";
import { handleStaffPageError } from "@/server/auth/guards";

import type { Metadata } from "next";

export const metadata: Metadata = { title: adoption.staff.title };

const copy = adoption.staff;
const formatDate = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Matamoros",
});

async function PetEditor({ params }: PageProps<"/dashboard/adoption/[id]">) {
  const { id } = await params;
  const data = await getStaffPet(id).catch(handleStaffPageError);
  if (!data) notFound();
  const { pet, transitions, can } = data;
  const photos = pet.photos.flatMap((photo, index) => {
    const src = petImageUrl(photo.key);
    return src
      ? [
          {
            ...photo,
            src,
            alt: media.gallery.petPhoto(pet.name, index + 1),
            style: { backgroundColor: photo.dominantColor },
          },
        ]
      : [];
  });
  const facts = [
    [
      adoption.post.species,
      pet.species === "other"
        ? (pet.speciesOther ?? speciesLabels.other)
        : speciesLabels[pet.species],
    ],
    [adoption.post.sex, sexLabels[pet.sex]],
    [adoption.post.ageGroup, ageGroupLabels[pet.ageGroup]],
    [adoption.post.size, sizeLabels[pet.size]],
    [adoption.detail.vaccinated, healthStateLabels[pet.vaccinated]],
    [adoption.detail.sterilized, healthStateLabels[pet.sterilized]],
    [adoption.detail.dewormed, healthStateLabels[pet.dewormed]],
    [
      adoption.detail.area,
      [pet.areaName, pet.areaReference].filter(Boolean).join(common.separator) ||
        adoption.detail.areaUnknown,
    ],
  ] as const;

  return (
    <div className="grid gap-6">
      <PageHeader title={pet.name}>
        <StatusChip domain="pet" status={pet.status} />
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="pet-facts" className="staff-panel">
            <h2 className="sr-only" id="pet-facts">
              {adoption.detail.about}
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div className="grid gap-0.5" key={label}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {photos.length > 0 && (
              <ul aria-label={copy.photos} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((photo) => (
                  <li key={photo.id}>
                    <Image
                      alt={photo.alt}
                      className="aspect-square w-full rounded-2xl border border-line object-cover"
                      height={photo.height}
                      src={photo.src}
                      style={photo.style}
                      unoptimized
                      width={photo.width}
                    />
                  </li>
                ))}
              </ul>
            )}
            {data.uploadsEnabled && (
              <AddPetPhotosForm
                petId={pet.id}
                remaining={mediaLimits.pet_gallery - pet.photos.length}
              />
            )}
          </section>
          <section aria-labelledby="pet-poster" className="staff-panel">
            <h2 className="text-lg font-semibold" id="pet-poster">
              {copy.poster}
            </h2>
            <div className="grid gap-1 text-sm">
              <p className="font-medium">{pet.posterName}</p>
              {pet.posterEmail && (
                <a className="break-all underline" href={`mailto:${pet.posterEmail}`}>
                  {pet.posterEmail}
                </a>
              )}
              {pet.posterPhone && <p>{pet.posterPhone}</p>}
              {pet.posterEmailVerifiedAt && <p className="text-muted">{copy.emailVerified}</p>}
            </div>
          </section>
          <section aria-labelledby="pet-edit" className="staff-panel">
            <h2 className="text-lg font-semibold" id="pet-edit">
              {copy.editProfile}
            </h2>
            <PetProfileForm pet={pet} />
          </section>
          <section aria-labelledby="pet-requests" className="staff-panel">
            <h2 className="text-lg font-semibold" id="pet-requests">
              {adoption.manage.requests}
            </h2>
            <RequestList
              requests={pet.requests}
              staffCanUpdate={can.requests}
              staffPetId={pet.id}
            />
          </section>
        </div>
        <aside aria-label={copy.status} className="grid content-start gap-4">
          {pet.status === "pending_approval" ? (
            <section className="staff-panel" aria-label={copy.review}>
              <ModerationForms petId={pet.id} />
            </section>
          ) : (
            <section className="staff-panel" aria-labelledby="pet-status">
              <h2 className="font-semibold" id="pet-status">
                {copy.status}
              </h2>
              <PetStatusForm petId={pet.id} transitions={transitions} />
            </section>
          )}
          <section className="staff-panel" aria-labelledby="pet-timeline">
            <h2 className="font-semibold" id="pet-timeline">
              {copy.timeline}
            </h2>
            <ol className="grid divide-y divide-line">
              {pet.events.map((event) => (
                <li className="grid gap-0.5 py-2" key={event.id}>
                  <p className="font-medium">{petStatusLabels[event.toStatus]}</p>
                  <p className="text-sm text-muted">
                    {event.actorName ?? (event.actorUserId ? dashboard.staff.deleted : copy.system)}
                  </p>
                  {event.note && <p className="text-sm">{event.note}</p>}
                  <time
                    className="font-mono text-xs text-muted"
                    dateTime={event.createdAt.toISOString()}
                  >
                    {formatDate.format(event.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
          {can.delete && (
            <section className="staff-panel" aria-labelledby="pet-delete">
              <h2 className="font-semibold" id="pet-delete">
                {copy.delete}
              </h2>
              <DeletePetForm petId={pet.id} />
            </section>
          )}
        </aside>
      </div>
      <Link
        className="button button--secondary justify-self-start"
        href="/dashboard/adoption"
        transitionTypes={navBack}
      >
        {copy.back}
      </Link>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function StaffPetPage(props: PageProps<"/dashboard/adoption/[id]">) {
  return (
    <Suspense fallback={loading}>
      <PetEditor {...props} />
    </Suspense>
  );
}
