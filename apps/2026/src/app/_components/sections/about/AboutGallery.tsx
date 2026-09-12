"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import { useViewportActivity } from "../../useViewportActivity";
import styles from "./AboutSection.module.css";

const AUTO_ADVANCE_DELAY_MS = 4600;

const GALLERY_IMAGES = [
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-community.webp",
    alt: "Hackers gathering in the UCF Student Union during Knight Hacks",
  },
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-crowd.webp",
    alt: "Knight Hacks participants filling the UCF Student Union",
  },
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-team.webp",
    alt: "Knight Hacks organizers and attendees holding a signed event banner",
  },
] as const;

export function AboutGallery() {
  const [galleryRef, isGalleryActive] = useViewportActivity<HTMLDivElement>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedImageIndexes, setLoadedImageIndexes] = useState(
    () => new Set([0, 1]),
  );

  const loadImage = useCallback((index: number) => {
    setLoadedImageIndexes((currentIndexes) => {
      if (currentIndexes.has(index)) return currentIndexes;

      return new Set(currentIndexes).add(index);
    });
  }, []);

  const showImage = useCallback(
    (index: number) => {
      loadImage(index);
      setActiveImageIndex(index);
      loadImage((index + 1) % GALLERY_IMAGES.length);
    },
    [loadImage],
  );

  const showPreviousImage = () => {
    showImage(
      (activeImageIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length,
    );
  };

  const showNextImage = useCallback(() => {
    showImage((activeImageIndex + 1) % GALLERY_IMAGES.length);
  }, [activeImageIndex, showImage]);

  useEffect(() => {
    if (isPaused || !isGalleryActive) return;

    const timeoutId = window.setTimeout(showNextImage, AUTO_ADVANCE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isGalleryActive, isPaused, showNextImage]);

  return (
    <div
      ref={galleryRef}
      className={styles.gallery}
      aria-label="Knight Hacks event photo gallery"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className={styles.galleryViewport}>
        {GALLERY_IMAGES.map((image, index) =>
          loadedImageIndexes.has(index) ? (
            <Image
              key={image.src}
              src={image.src}
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 58vw, 43vw"
              alt={image.alt}
              className={styles.galleryImage}
              data-active={index === activeImageIndex}
              decoding="async"
              fetchPriority={index === activeImageIndex ? "high" : "low"}
              loading="eager"
              quality={72}
              draggable={false}
            />
          ) : null,
        )}
      </div>

      <div className={styles.galleryControls}>
        <button
          className={styles.galleryArrow}
          type="button"
          aria-label="Show previous gallery image"
          onClick={showPreviousImage}
          onFocus={() =>
            loadImage(
              (activeImageIndex - 1 + GALLERY_IMAGES.length) %
                GALLERY_IMAGES.length,
            )
          }
          onPointerEnter={() =>
            loadImage(
              (activeImageIndex - 1 + GALLERY_IMAGES.length) %
                GALLERY_IMAGES.length,
            )
          }
        >
          <ArrowBigLeft aria-hidden="true" />
        </button>
        <p className={styles.galleryCount} aria-live="polite">
          {String(activeImageIndex + 1).padStart(2, "0")} /{" "}
          {String(GALLERY_IMAGES.length).padStart(2, "0")}
        </p>
        <button
          className={styles.galleryArrow}
          type="button"
          aria-label="Show next gallery image"
          onClick={showNextImage}
          onFocus={() =>
            loadImage((activeImageIndex + 1) % GALLERY_IMAGES.length)
          }
          onPointerEnter={() =>
            loadImage((activeImageIndex + 1) % GALLERY_IMAGES.length)
          }
        >
          <ArrowBigRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
