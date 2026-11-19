import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TecVerde",
  description: "Reportes y adopciones del Tec campus Matamoros.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
