"use client";

import { useEffect, useState } from "react";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import styles from "./AboutSection.module.css";

const AUTO_ADVANCE_DELAY_MS = 4600;

const GALLERY_IMAGES = [
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-community.webp",
    srcSet:
      "https://assets.knighthacks.org/khix/about-gallery-community-640.webp 640w, https://assets.knighthacks.org/khix/about-gallery-community-1280.webp 1280w",
    alt: "Hackers gathering in the UCF Student Union during Knight Hacks",
  },
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-crowd.webp",
    srcSet:
      "https://assets.knighthacks.org/khix/about-gallery-crowd-640.webp 640w, https://assets.knighthacks.org/khix/about-gallery-crowd-1280.webp 1280w",
    alt: "Knight Hacks participants filling the UCF Student Union",
  },
  {
    src: "https://assets.knighthacks.org/khix/about-gallery-team.webp",
    srcSet:
      "https://assets.knighthacks.org/khix/about-gallery-team-640.webp 640w, https://assets.knighthacks.org/khix/about-gallery-team-1280.webp 1280w",
    alt: "Knight Hacks organizers and attendees holding a signed event banner",
  },
] as const;

export function AboutGallery() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadedImageIndexes, setLoadedImageIndexes] = useState(
    () => new Set([0, 1]),
  );
  const [readyImageIndexes, setReadyImageIndexes] = useState(
    () => new Set<number>(),
  );
  const [pendingImageIndex, setPendingImageIndex] = useState<number | null>(
    null,
  );

  const loadImage = (index: number) => {
    setLoadedImageIndexes((currentIndexes) => {
      if (currentIndexes.has(index)) return currentIndexes;

      return new Set(currentIndexes).add(index);
    });
  };

  const showImage = (index: number) => {
    loadImage(index);

    if (readyImageIndexes.has(index)) {
      setActiveImageIndex(index);
      loadImage((index + 1) % GALLERY_IMAGES.length);
      return;
    }

    setPendingImageIndex(index);
  };

  const markImageReady = (index: number) => {
    setReadyImageIndexes((currentIndexes) => {
      if (currentIndexes.has(index)) return currentIndexes;

      return new Set(currentIndexes).add(index);
    });

    if (pendingImageIndex === index) {
      setActiveImageIndex(index);
      setPendingImageIndex(null);
      loadImage((index + 1) % GALLERY_IMAGES.length);
    }
  };

  const showPreviousImage = () => {
    showImage(
      (activeImageIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length,
    );
  };

  const showNextImage = () => {
    showImage((activeImageIndex + 1) % GALLERY_IMAGES.length);
  };

  useEffect(() => {
    if (isPaused) return;

    const timeoutId = window.setTimeout(showNextImage, AUTO_ADVANCE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeImageIndex, isPaused]);

  return (
    <div
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
            <img
              key={image.src}
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 760px) 100vw, (max-width: 1100px) 58vw, 43vw"
              alt={image.alt}
              className={styles.galleryImage}
              data-active={index === activeImageIndex}
              decoding="async"
              fetchPriority={index === activeImageIndex ? "high" : "low"}
              loading="eager"
              draggable={false}
              onLoad={() => markImageReady(index)}
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
