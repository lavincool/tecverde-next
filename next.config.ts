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

function contentSecurityPolicy() {
  const production = process.env.NODE_ENV === "production";
  const mediaHost = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).origin
    : "";
  const r2 = "https://*.r2.cloudflarestorage.com";
  const turnstile = "https://challenges.cloudflare.com";
  const directives = {
    "default-src": ["'self'"],
    // Next.js inlines bootstrap scripts; nonces would force every page to render dynamically.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      turnstile,
      ...(production ? [] : ["'unsafe-eval'"]),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", r2, "https://*.r2.dev", mediaHost].filter(Boolean),
    "font-src": ["'self'"],
    "connect-src": ["'self'", r2, turnstile, ...(production ? [] : ["ws:"])],
    "frame-src": [turnstile],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
  return production ? `${policy}; upgrade-insecure-requests` : policy;
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
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
