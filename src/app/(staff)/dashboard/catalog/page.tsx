import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryIcon } from "@/features/catalog/category-icon";
import { BuildingForm, CategoryForm } from "@/features/catalog/components/catalog-forms";
import { getCatalogForAdmin } from "@/features/catalog/queries";
import { dashboard } from "@/messages/es-MX";
import { handleStaffPageError } from "@/server/auth/guards";

import type { Metadata } from "next";

export const metadata: Metadata = { title: dashboard.catalog.title };

const copy = dashboard.catalog;

async function Catalog() {
  const { buildings, categories } = await getCatalogForAdmin().catch(handleStaffPageError);
  return (
    <div className="grid gap-6">
      <section aria-labelledby="catalog-buildings" className="staff-panel">
        <h2 className="text-xl font-semibold" id="catalog-buildings">
          {copy.buildings}
        </h2>
        <ul className="grid divide-y divide-line">
          {buildings.map((item) => (
            <li className="py-3" key={item.id}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono text-sm text-muted">
                    {item.isActive ? item.slug : copy.inactive}
                  </span>
                </summary>
                <div className="pt-3">
                  <BuildingForm value={item} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="border-t border-line pt-4">
          <summary className="cursor-pointer font-semibold">{copy.newBuilding}</summary>
          <div className="pt-3">
            <BuildingForm />
          </div>
        </details>
      </section>
      <section aria-labelledby="catalog-categories" className="staff-panel">
        <h2 className="text-xl font-semibold" id="catalog-categories">
          {copy.categories}
        </h2>
        <ul className="grid divide-y divide-line">
          {categories.map((item) => (
            <li className="py-3" key={item.id}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <CategoryIcon iconKey={item.iconKey} size={17} strokeWidth={1.8} />
                    {item.name}
                  </span>
                  <span className="font-mono text-sm text-muted">
                    {item.isActive ? item.slug : copy.inactive}
                  </span>
                </summary>
                <div className="pt-3">
                  <CategoryForm value={item} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="border-t border-line pt-4">
          <summary className="cursor-pointer font-semibold">{copy.newCategory}</summary>
          <div className="pt-3">
            <CategoryForm />
          </div>
        </details>
      </section>
    </div>
  );
}

const loading = <SkeletonCard />;

export default function CatalogPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} />
      <Suspense fallback={loading}>
        <Catalog />
      </Suspense>
    </div>
  );
}
