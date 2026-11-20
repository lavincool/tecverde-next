import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { PostPetForm } from "@/features/adoption/components/post-pet-form";
import { getCampusAreas } from "@/features/adoption/queries";
import { adoption } from "@/messages/es-MX";
import { isStorageConfigured } from "@/server/storage/r2";

import type { Metadata } from "next";

export const metadata: Metadata = { title: adoption.post.title, robots: { index: false } };

async function PostContent() {
  const areas = await getCampusAreas();
  return <PostPetForm areas={areas} uploadsEnabled={isStorageConfigured()} />;
}

const loading = <SkeletonCard />;

export default function NewPetPage() {
  return (
    <div className="grid gap-7">
      <PageHeader title={adoption.post.title} description={adoption.post.description} />
      <Suspense fallback={loading}>
        <PostContent />
      </Suspense>
    </div>
  );
}
