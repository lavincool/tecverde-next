import "./src/lib/env";

import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function mediaRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [];
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (base) {
    const url = new URL(base);
    patterns.push({
      protocol: "https",
      hostname: url.hostname,
      pathname: `${url.pathname.replace(/\/$/, "")}/pets/**`,
    });
  }
  if (process.env.VERCEL_ENV !== "production") {
    patterns.push({ protocol: "https", hostname: "*.r2.dev", pathname: "/pets/**" });
  }
  return patterns;
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  typedRoutes: true,
  images: {
    remotePatterns: mediaRemotePatterns(),
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    deviceSizes: [360, 640, 828, 1080, 1600],
    imageSizes: [96, 160, 256, 384],
    // Media keys are immutable, so optimized variants can be cached for a month.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
