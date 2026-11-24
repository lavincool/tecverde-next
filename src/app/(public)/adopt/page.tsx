import { ChevronDown, HeartHandshake, PawPrint, Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { PetCard } from "@/features/adoption/components/pet-card";
import { ageGroups, sexes, sizes, species } from "@/features/adoption/enums";
import { getCampusAreas, getGallery, parseGalleryFilters } from "@/features/adoption/queries";
import { navForward } from "@/lib/navigation";
import { adoption } from "@/messages/es-MX";
import { ageGroupLabels, sexLabels, sizeLabels, speciesLabels } from "@/messages/es-MX/enums";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: adoption.gallery.title,
  description: adoption.gallery.description,
};

const copy = adoption.gallery;

function FilterSelect({
  label,
  name,
  allLabel,
  value,
  options,
}: {
  label: string;
  name: string;
  allLabel: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="report-field">
      {label}
      <select className="report-input" defaultValue={value ?? ""} name={name}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const speciesOptions = species.map((value) => ({ value, label: speciesLabels[value] }));
const sexOptions = sexes.map((value) => ({ value, label: sexLabels[value] }));
const sizeOptions = sizes.map((value) => ({ value, label: sizeLabels[value] }));
const ageOptions = ageGroups.map((value) => ({ value, label: ageGroupLabels[value] }));

async function Gallery({ searchParams }: PageProps<"/adopt">) {
  const filters = parseGalleryFilters(await searchParams);
  const [pets, areas] = await Promise.all([getGallery(filters), getCampusAreas()]);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filtered = activeFilters > 0;
  const options = { area: areas.map((area) => ({ value: area.id, label: area.name })) };

  return (
    <>
      <details className="filter-panel" open={filtered}>
        <summary>
          <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>{copy.filters}</span>
          {filtered && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
              {copy.activeFilters(activeFilters)}
            </span>
          )}
          <ChevronDown aria-hidden="true" className="filter-panel-chevron" size={18} />
        </summary>
        <form
          aria-label={copy.filtersLabel}
          className="filter-panel-body grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
          method="get"
        >
          <FilterSelect
            allLabel={copy.allSpecies}
            label={copy.species}
            name="species"
            options={speciesOptions}
            value={filters.species}
          />
          <FilterSelect
            allLabel={copy.allSexes}
            label={copy.sex}
            name="sex"
            options={sexOptions}
            value={filters.sex}
          />
          <FilterSelect
            allLabel={copy.allSizes}
            label={copy.size}
            name="size"
            options={sizeOptions}
            value={filters.size}
          />
          <FilterSelect
            allLabel={copy.allAges}
            label={copy.age}
            name="age"
            options={ageOptions}
            value={filters.age}
          />
          <FilterSelect
            allLabel={copy.allAreas}
            label={copy.area}
            name="area"
            options={options.area}
            value={filters.area}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-3 lg:col-span-5">
            <button className="button button--primary" type="submit">
              {copy.apply}
            </button>
            <Link className="button button--ghost" href="/adopt">
              {copy.clear}
            </Link>
          </div>
        </form>
      </details>
      {pets.length === 0 ? (
        <EmptyState
          description={filtered ? copy.filteredEmpty : copy.empty}
          icon={PawPrint}
          title={filtered ? copy.filteredEmptyTitle : copy.emptyTitle}
        />
      ) : (
        <ul className="pet-grid">
          {pets.map((pet, index) => (
            <li key={pet.id}>
              <PetCard pet={pet} priority={index < 2} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const loading = <SkeletonCard />;

export default function AdoptionPage(props: PageProps<"/adopt">) {
  return (
    <div className="grid gap-7">
      <PageHeader title={copy.title} description={copy.description}>
        <div className="flex flex-wrap gap-2">
          <Link className="button button--primary" href="/adopt/new" transitionTypes={navForward}>
            <Plus aria-hidden="true" size={16} />
            {copy.post}
          </Link>
          <Link
            className="button button--secondary"
            href="/adopt/adopted"
            transitionTypes={navForward}
          >
            <HeartHandshake aria-hidden="true" size={16} />
            {copy.adopted}
          </Link>
        </div>
      </PageHeader>
      <Suspense fallback={loading}>
        <Gallery {...props} />
      </Suspense>
    </div>
  );
}
