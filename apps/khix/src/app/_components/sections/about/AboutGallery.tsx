"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowBigLeft, ArrowBigRight } from "lucide-react";

import styles from "./AboutSection.module.css";

const AUTO_ADVANCE_DELAY_MS = 4600;

const TEMPORARY_GALLERY_IMAGES = [
  "/assets/IMG_7680.webp",
  "/assets/IMG_7685.webp",
  "/assets/IMG_7689.webp",
] as const;

export function AboutGallery() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const showPreviousImage = () => {
    setActiveImageIndex(
      (currentIndex) =>
        (currentIndex - 1 + TEMPORARY_GALLERY_IMAGES.length) %
        TEMPORARY_GALLERY_IMAGES.length,
    );
  };

  const showNextImage = () => {
    setActiveImageIndex(
      (currentIndex) => (currentIndex + 1) % TEMPORARY_GALLERY_IMAGES.length,
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
      <div className={styles.galleryViewport}>
        {TEMPORARY_GALLERY_IMAGES.map((imageSrc, index) => (
          <Image
            key={imageSrc}
            src={imageSrc}
            alt="Temporary Knight Hacks event gallery image"
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1100px) 58vw, 43vw"
            className={styles.galleryImage}
            data-active={index === activeImageIndex}
            priority={index === 0}
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
          {String(TEMPORARY_GALLERY_IMAGES.length).padStart(2, "0")}
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
