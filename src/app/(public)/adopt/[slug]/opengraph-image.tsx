import { ImageResponse } from "next/og";

import { getPublicPet } from "@/features/adoption/queries";
import { adoption } from "@/messages/es-MX/adoption";
import { common } from "@/messages/es-MX/common";
import { speciesLabels } from "@/messages/es-MX/enums";

export const alt = adoption.gallery.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const frame = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  width: "100%",
  height: "100%",
  padding: "72px",
  color: "#f5f5f5",
  fontSize: 32,
} as const;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pet = await getPublicPet(slug);
  const name = pet?.name ?? adoption.gallery.title;
  const accent = pet?.cover?.dominantColor ?? "#1f7a46";
  const species = pet ? speciesLabels[pet.species] : "";

  const styles = {
    root: { ...frame, background: `linear-gradient(135deg, #111 40%, ${accent})` },
    brand: { display: "flex", color: "#8fe0ad", fontWeight: 700 },
    middle: { display: "flex", flexDirection: "column", gap: 16 },
    name: { display: "flex", fontSize: 108, fontWeight: 700, letterSpacing: -4 },
    line: { display: "flex", opacity: 0.85 },
    footer: { display: "flex", opacity: 0.7 },
  } as const;

  return new ImageResponse(
    <div style={styles.root}>
      <div style={styles.brand}>{common.appName}</div>
      <div style={styles.middle}>
        <div style={styles.name}>{name}</div>
        <div style={styles.line}>
          {pet ? adoption.detail.shareText(pet.name) : adoption.gallery.description}
        </div>
      </div>
      <div style={styles.footer}>
        {[species, common.campus].filter(Boolean).join(common.separator)}
      </div>
    </div>,
    size,
  );
}
