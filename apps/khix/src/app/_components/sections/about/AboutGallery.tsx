"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import styles from "./AboutSection.module.css";

const AUTO_ADVANCE_DELAY_MS = 4600;

const GALLERY_IMAGES = [
  {
    src: "/assets/about-gallery-community.webp",
    alt: "Hackers gathering in the UCF Student Union during Knight Hacks",
    aspectRatio: "2400 / 1597",
  },
  {
    src: "/assets/about-gallery-crowd.webp",
    alt: "Knight Hacks participants filling the UCF Student Union",
    aspectRatio: "2400 / 1597",
  },
  {
    src: "/assets/about-gallery-team.webp",
    alt: "Knight Hacks organizers and attendees holding a signed event banner",
    aspectRatio: "2400 / 1349",
  },
] as const;

export function AboutGallery() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeImage = GALLERY_IMAGES[activeImageIndex] ?? GALLERY_IMAGES[0];

  const showPreviousImage = () => {
    setActiveImageIndex(
      (currentIndex) =>
        (currentIndex - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex(
      (currentIndex) => (currentIndex + 1) % GALLERY_IMAGES.length,
    );
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
      <div
        className={styles.galleryViewport}
        style={{ aspectRatio: activeImage.aspectRatio }}
      >
        {GALLERY_IMAGES.map((image, index) => (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1100px) 58vw, 43vw"
            className={styles.galleryImage}
            data-active={index === activeImageIndex}
            loading="lazy"
          />
        ))}
      </div>

      <div className={styles.galleryControls}>
        <button
          className={styles.galleryArrow}
          type="button"
          aria-label="Show previous gallery image"
          onClick={showPreviousImage}
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
        >
          <ArrowBigRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
