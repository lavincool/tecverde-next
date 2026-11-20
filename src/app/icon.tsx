import { ImageResponse } from "next/og";

import { brandColors, LeafMark } from "@/components/brand/leaf-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const frame = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  borderRadius: 16,
  background: brandColors.accent,
} as const;

export default function Icon() {
  return new ImageResponse(
    <div style={frame}>
      <LeafMark color={brandColors.foreground} size={20} />
    </div>,
    size,
  );
}
