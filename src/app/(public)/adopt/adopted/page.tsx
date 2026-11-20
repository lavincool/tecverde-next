import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { PetCard } from "@/features/adoption/components/pet-card";
import { getAdoptedStories } from "@/features/adoption/queries";
import { navBack } from "@/lib/navigation";
import { adoption } from "@/messages/es-MX";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: adoption.adopted.title,
  description: adoption.adopted.description,
};

async function Stories() {
  const stories = await getAdoptedStories();
  if (stories.length === 0) {
    return (
      <EmptyState
        description={adoption.adopted.empty}
        icon={HeartHandshake}
        title={adoption.adopted.emptyTitle}
      />
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {stories.map((story) => (
        <li className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]" key={story.id}>
          <PetCard pet={story} />
          {story.successStory && (
            <p className="leading-relaxed whitespace-pre-wrap text-muted">{story.successStory}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

const loading = <SkeletonCard />;

export default function AdoptedPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={adoption.adopted.title} description={adoption.adopted.description} />
      <Suspense fallback={loading}>
        <Stories />
      </Suspense>
      <Link
        className="button button--secondary justify-self-start"
        href="/adopt"
        transitionTypes={navBack}
      >
        {adoption.detail.back}
      </Link>
    </div>
  );
}
