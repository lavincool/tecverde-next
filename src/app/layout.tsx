import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";

import { AppThemeProvider } from "@/components/layout/theme-provider";
import { common, seo } from "@/messages/es-MX";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: common.appName, template: `%s | ${common.appName}` },
  description: seo.description,
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
