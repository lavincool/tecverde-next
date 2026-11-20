"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { media } from "@/messages/es-MX/media";

export type CarouselPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  dominantColor: string;
  alt: string;
};

/** Scroll-snap carousel with labeled buttons, so swiping is never the only way to move. */
export function PhotoCarousel({ photos }: { photos: CarouselPhoto[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (next: number) => {
      const element = track.current;
      if (!element) return;
      const clamped = Math.max(0, Math.min(photos.length - 1, next));
      element.scrollTo({ left: clamped * element.clientWidth, behavior: "smooth" });
      setIndex(clamped);
    },
    [photos.length],
  );

  const handleScroll = useCallback(() => {
    const element = track.current;
    if (!element || element.clientWidth === 0) return;
    setIndex(Math.round(element.scrollLeft / element.clientWidth));
  }, []);

  const previous = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  return (
    <div className="grid gap-3">
      <ul
        aria-label={media.gallery.label}
        className="pet-carousel"
        onScroll={handleScroll}
        ref={track}
      >
        {photos.map((photo, position) => (
          <li
            aria-label={media.gallery.position(position + 1, photos.length)}
            className="pet-carousel-slide"
            key={photo.id}
          >
            <Image
              alt={photo.alt}
              className="size-full object-cover"
              fill
              priority={position === 0}
              sizes="(min-width: 64rem) 55vw, 100vw"
              src={photo.src}
            />
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label={media.gallery.previous}
            className="button button--secondary button--icon-only"
            disabled={index === 0}
            onClick={previous}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <output aria-live="polite" className="font-mono text-sm text-muted">
            {media.gallery.position(index + 1, photos.length)}
          </output>
          <button
            aria-label={media.gallery.next}
            className="button button--secondary button--icon-only"
            disabled={index === photos.length - 1}
            onClick={next}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
