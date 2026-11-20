import { ImageResponse } from "next/og";

import { brandColors, LeafMark } from "@/components/brand/leaf-mark";

const variants = {
  "192": { size: 192, glyph: 112, radius: 40 },
  "512": { size: 512, glyph: 300, radius: 108 },
  // Maskable icons keep the glyph inside the central 80% safe zone and fill the canvas.
  "maskable-512": { size: 512, glyph: 240, radius: 0 },
} as const;

type Variant = keyof typeof variants;

export function generateStaticParams() {
  return Object.keys(variants).map((variant) => ({ variant }));
}

function isVariant(value: string): value is Variant {
  return value in variants;
}

export async function GET(_: Request, context: RouteContext<"/pwa-icon/[variant]">) {
  const { variant } = await context.params;
  if (!isVariant(variant)) return new Response(null, { status: 404 });
  const spec = variants[variant];
  const styles = {
    frame: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      borderRadius: spec.radius,
      background: brandColors.accent,
    },
  } as const;
  return new ImageResponse(
    <div style={styles.frame}>
      <LeafMark color={brandColors.foreground} size={spec.glyph} />
    </div>,
    {
      width: spec.size,
      height: spec.size,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
