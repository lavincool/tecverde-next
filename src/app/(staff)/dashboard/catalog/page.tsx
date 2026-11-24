import { Suspense } from "react";

import { SkeletonCard } from "@/components/feedback/skeleton-card";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryIcon } from "@/features/catalog/category-icon";
import { BuildingForm, CategoryForm } from "@/features/catalog/components/catalog-forms";
import { getCatalogForAdmin } from "@/features/catalog/queries";
import { reportTopicShortLinks } from "@/features/reports/topics";
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
      <section aria-labelledby="catalog-short-links" className="staff-panel">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold" id="catalog-short-links">
            {copy.shortLinks.title}
          </h2>
          <p className="max-w-prose text-sm text-muted">{copy.shortLinks.description}</p>
        </div>
        <table className="w-full text-start text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 pe-4 text-start font-medium" scope="col">
                {copy.shortLinks.path}
              </th>
              <th className="py-2 text-start font-medium" scope="col">
                {copy.shortLinks.categories}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {topicLinks.map(({ path, rule }) => (
              <tr key={path}>
                <td className="py-2 pe-4 font-mono">{path}</td>
                <td className="py-2 font-mono text-muted">
                  {[
                    ...rule.categorySlugs,
                    ...rule.categorySlugPrefixes.map(copy.shortLinks.prefix),
                  ].join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const topicLinks = reportTopicShortLinks();

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
