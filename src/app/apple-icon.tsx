import { ImageResponse } from "next/og";

import { brandColors, LeafMark } from "@/components/brand/leaf-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const frame = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  background: brandColors.accent,
} as const;

export default function AppleIcon() {
  return new ImageResponse(
    <div style={frame}>
      <LeafMark color={brandColors.foreground} size={108} />
    </div>,
    size,
  );
}
