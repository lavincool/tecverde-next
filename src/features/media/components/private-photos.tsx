import Image from "next/image";

import type { ViewablePhoto } from "../queries";

/** Renders pre-sized photos from signed URLs without the optimizer, which cannot cache them. */
export function PrivatePhotos({
  photos,
  label,
  altFor,
}: {
  photos: ViewablePhoto[];
  label: string;
  altFor: (index: number) => string;
}) {
  if (photos.length === 0) return null;
  const styled = photos.map((photo) => ({
    ...photo,
    style: { backgroundColor: photo.dominantColor },
  }));
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {styled.map((photo, index) => (
        <li key={photo.id}>
          <a href={photo.url} rel="noreferrer" target="_blank">
            <Image
              alt={altFor(index + 1)}
              className="aspect-square w-full rounded-2xl border border-line object-cover"
              height={photo.height}
              referrerPolicy="no-referrer"
              src={photo.url}
              style={photo.style}
              unoptimized
              width={photo.width}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
