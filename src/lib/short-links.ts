/**
 * Short, printable paths (for posters and QR codes) mapped to the pages they open. The proxy
 * matches them case-insensitively and keeps the visitor's query string, so
 * `/wc?building=library` also preselects the building.
 */
export const shortLinks = {
  wc: "/reports/new?topic=restroom",
  basura: "/reports/new?topic=trash",
  agua: "/reports/new?topic=water",
  aire: "/reports/new?topic=air",
  adopta: "/adopt",
} as const satisfies Record<string, `/${string}`>;

export type ShortLink = keyof typeof shortLinks;

function isShortLink(value: string): value is ShortLink {
  return Object.hasOwn(shortLinks, value);
}

/** Returns the destination URL for a short path, or `undefined` for any other path. */
export function resolveShortLink(pathname: string, search = ""): string | undefined {
  const key = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!isShortLink(key)) return undefined;

  const destination = new URL(shortLinks[key], "http://short.link");
  for (const [name, value] of new URLSearchParams(search)) {
    if (!destination.searchParams.has(name)) destination.searchParams.append(name, value);
  }
  return `${destination.pathname}${destination.search}`;
}
