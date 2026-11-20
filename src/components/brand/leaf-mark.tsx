/**
 * Leaf glyph matching the Lucide icon used in the header, for ImageResponse renders where
 * component libraries are unavailable.
 */
export function LeafMark({ size, color }: { size: number; color: string }) {
  return (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.1}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export const brandColors = { accent: "#1f7a46", foreground: "#ffffff", dark: "#111111" } as const;
