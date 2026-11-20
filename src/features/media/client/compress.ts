export const FULL_LONG_EDGE = 1600;
export const WEBP_QUALITY = 0.82;

export type PreparedPhoto = {
  blob: Blob;
  width: number;
  height: number;
  dominantColor: string;
};

export class PhotoDecodeError extends Error {}

export function fitWithin(width: number, height: number, longEdge: number) {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function toHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0");
}

/**
 * Decodes, orients, downsizes and re-encodes a photo to WebP. Re-encoding through a canvas
 * drops every metadata block, including EXIF and GPS coordinates.
 */
export async function preparePhoto(file: File, longEdge = FULL_LONG_EDGE): Promise<PreparedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoDecodeError("decode");
  }

  try {
    const size = fitWithin(bitmap.width, bitmap.height, longEdge);
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");
    if (!context) throw new PhotoDecodeError("canvas");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY });
    if (blob.type !== "image/webp") throw new PhotoDecodeError("webp");

    const sample = new OffscreenCanvas(1, 1);
    const sampleContext = sample.getContext("2d");
    sampleContext?.drawImage(bitmap, 0, 0, 1, 1);
    const [red = 0, green = 0, blue = 0] = sampleContext?.getImageData(0, 0, 1, 1).data ?? [];

    return {
      blob,
      width: size.width,
      height: size.height,
      dominantColor: `#${toHex(red)}${toHex(green)}${toHex(blue)}`,
    };
  } finally {
    bitmap.close();
  }
}
