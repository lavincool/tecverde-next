import { shortLinks } from "@/lib/short-links";

/**
 * Report topics narrow the report form to a family of categories, for example from a QR code
 * on a restroom door. Categories are matched by slug, so admins keep these slugs (or the
 * prefixes) when they rename categories in the catalog.
 */
export const reportTopicKeys = ["restroom", "trash", "water", "air"] as const;

export type ReportTopicKey = (typeof reportTopicKeys)[number];

type ReportTopicRule = {
  /** Category slugs in display order. */
  categorySlugs: readonly string[];
  /** Categories whose slug starts with one of these prefixes also belong to the topic. */
  categorySlugPrefixes: readonly string[];
  /** Preselect the first matching category instead of asking the visitor to choose. */
  preselect: boolean;
};

export const reportTopicRules = {
  restroom: {
    categorySlugs: ["restroom-paper", "restroom-water"],
    categorySlugPrefixes: ["restroom-"],
    preselect: false,
  },
  trash: { categorySlugs: ["full-bins"], categorySlugPrefixes: ["trash-"], preselect: true },
  water: {
    categorySlugs: ["water-leak", "restroom-water"],
    categorySlugPrefixes: ["water-"],
    preselect: true,
  },
  air: {
    categorySlugs: ["air-conditioning"],
    categorySlugPrefixes: ["air-"],
    preselect: true,
  },
} as const satisfies Record<ReportTopicKey, ReportTopicRule>;

export function parseReportTopic(value: unknown): ReportTopicKey | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return reportTopicKeys.find((key) => key === candidate);
}

function topicRank(rule: ReportTopicRule, slug: string) {
  const index = rule.categorySlugs.indexOf(slug);
  if (index !== -1) return index;
  if (rule.categorySlugPrefixes.some((prefix) => slug.startsWith(prefix))) {
    return rule.categorySlugs.length;
  }
  return -1;
}

export type ReportFormFocus = {
  /** Categories to show first; empty when the topic matches nothing in the active catalog. */
  categoryIds: string[];
  initialCategoryId: string;
};

/**
 * Resolves the categories a topic or a category slug points to inside the active catalog.
 * Unknown topics and slugs resolve to an unfocused form instead of failing.
 */
export function resolveReportFormFocus(
  categories: readonly { id: string; slug: string }[],
  options: { topic?: ReportTopicKey | undefined; categorySlug?: string | undefined },
): ReportFormFocus {
  const direct = options.categorySlug
    ? categories.find((category) => category.slug === options.categorySlug)
    : undefined;

  if (!options.topic) {
    return { categoryIds: [], initialCategoryId: direct?.id ?? "" };
  }

  const rule: ReportTopicRule = reportTopicRules[options.topic];
  const matches = categories
    .map((category, order) => ({ category, order, rank: topicRank(rule, category.slug) }))
    .filter((entry) => entry.rank !== -1)
    .toSorted((left, right) => left.rank - right.rank || left.order - right.order)
    .map((entry) => entry.category);

  const categoryIds = matches.map((category) => category.id);
  const [first] = matches;
  let initialCategoryId = "";
  if (direct) initialCategoryId = direct.id;
  else if (first && (rule.preselect || matches.length === 1)) initialCategoryId = first.id;

  return { categoryIds, initialCategoryId };
}

/** Short links that open the report form on a topic, for documentation in the catalog. */
export function reportTopicShortLinks() {
  return Object.entries(shortLinks).flatMap(([path, destination]) => {
    const topic = parseReportTopic(
      new URL(destination, "http://short.link").searchParams.get("topic"),
    );
    return topic ? [{ path: `/${path}`, topic, rule: reportTopicRules[topic] }] : [];
  });
}
