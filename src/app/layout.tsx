import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import { Suspense } from "react";

import { ServiceWorker } from "@/components/layout/service-worker";
import { AppThemeProvider } from "@/components/layout/theme-provider";
import { common, seo } from "@/messages/es-MX";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: common.appName, template: `%s | ${common.appName}` },
  description: seo.description,
  applicationName: common.appName,
  appleWebApp: { capable: true, title: common.appName, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
        <ServiceWorker />
        <Suspense fallback={null}>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
