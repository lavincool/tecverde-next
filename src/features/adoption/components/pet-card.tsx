import { PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";

import { StatusChip } from "@/components/ui/status-chip";
import { navForward } from "@/lib/navigation";
import { adoption } from "@/messages/es-MX/adoption";
import { ageGroupLabels, sexLabels, speciesLabels } from "@/messages/es-MX/enums";

import type { PublicPetCard } from "../repository";

export function petImageUrl(key: string) {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) return undefined;
  return new URL(key, base.endsWith("/") ? base : `${base}/`).href;
}

export function PetCard({ pet, priority = false }: { pet: PublicPetCard; priority?: boolean }) {
  const cover = pet.cover;
  const src = cover ? petImageUrl(cover.key) : undefined;
  const styles = { placeholder: { backgroundColor: cover?.dominantColor ?? "var(--surface)" } };
  const speciesName =
    pet.species === "other"
      ? (pet.speciesOther ?? speciesLabels.other)
      : speciesLabels[pet.species];

  return (
    <Link className="pet-card" href={`/adopt/${pet.slug}`} transitionTypes={navForward}>
      <ViewTransition name={`pet-${pet.id}`}>
        <span className="pet-card-media" style={styles.placeholder}>
          {src && cover ? (
            <Image
              alt=""
              className="size-full object-cover"
              fill
              priority={priority}
              quality={60}
              sizes="(min-width: 64rem) 22vw, (min-width: 40rem) 33vw, 50vw"
              src={src}
            />
          ) : (
            <span className="grid size-full place-items-center text-muted">
              <PawPrint aria-hidden="true" size={28} />
              <span className="sr-only">{adoption.gallery.noPhoto}</span>
            </span>
          )}
        </span>
      </ViewTransition>
      <span className="grid gap-1 p-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold tracking-tight">{pet.name}</span>
          {pet.status !== "available" && <StatusChip domain="pet" status={pet.status} />}
        </span>
        <span className="text-sm text-muted">
          {[speciesName, sexLabels[pet.sex], ageGroupLabels[pet.ageGroup]].join(" · ")}
        </span>
      </span>
    </Link>
  );
}
