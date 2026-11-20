import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api/",
        "/reports/",
        "/adopt/manage/",
        "/verify/",
        "/login",
        "/invite/",
        "/dev/",
      ],
    },
    ...(configured ? { sitemap: `${configured}/sitemap.xml` } : {}),
  };
}
