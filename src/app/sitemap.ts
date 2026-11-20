import { getPublicPetSlugs } from "@/features/adoption/queries";

import type { MetadataRoute } from "next";

function origin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = origin();
  const pets = await getPublicPetSlugs().catch(() => []);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/reports/new`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/adopt`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/adopt/adopted`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...pets.map((pet) => ({
      url: `${base}/adopt/${pet.slug}`,
      lastModified: pet.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
