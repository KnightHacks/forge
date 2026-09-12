"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";

import { AmbientVideo } from "../../AmbientVideo";
import { getTransparentVideoSources } from "../../ambientVideoSources";
import { FallingLeaves } from "./FallingLeaves";
import styles from "./Hero.module.css";
import { HeroApplyButton, HeroTitle } from "./HeroTitle";
import { useHeroMotion } from "./useHeroMotion";

/** Renders the responsive hero and mounts ambient effects only near the viewport. */
export default function Hero() {
  const { sectionRef, stageRef, handlePointerMove, handlePointerLeave } =
    useHeroMotion();
  const [viewport, setViewport] = useState<"desktop" | "mobile" | null>(null);
  const [shouldMountHeroEffects, setShouldMountHeroEffects] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    /** Selects the hero composition matching the active breakpoint. */
    const updateViewport = () => {
      setViewport(mediaQuery.matches ? "mobile" : "desktop");
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShouldMountHeroEffects(entry?.isIntersecting ?? false),
      { rootMargin: "100% 0px", threshold: 0.01 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [sectionRef]);

  return (
    <section
      id="home"
      ref={sectionRef}
      className={styles.hero}
      aria-labelledby="khix-hero-title"
    >
      <div
        ref={stageRef}
        className={styles.stage}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <h1 id="khix-hero-title" className="sr-only">
          Knight Hacks IX
        </h1>
        <div className={styles.art} data-hero-art aria-hidden="true">
          <HeroBaseLayer />
          {shouldMountHeroEffects && viewport === "desktop" ? (
            <DesktopHeroAmbient />
          ) : null}
          {shouldMountHeroEffects && viewport === "mobile" ? (
            <MobileHeroLayers />
          ) : null}
          <div className={styles.shade} aria-hidden="true" />
          <HeroTitle />
          {shouldMountHeroEffects ? <FallingLeaves /> : null}
        </div>
        <div
          className={styles.introVeil}
          data-hero-intro-veil
          aria-hidden="true"
        />
      </div>
      <HeroApplyButton className={styles.mobileHeroApplyButton} />
    </section>
  );
}

/** Renders the precomposed mobile foreground as a single lightweight layer. */
function MobileHeroLayers() {
  return (
    <div className={styles.mobileHeroLayers} data-mobile-hero-layers>
      <Image
        src="/media/homepage/hero-static/hero-mobile-composite.webp"
        alt=""
        fill
        sizes="100vw"
        unoptimized
        loading="eager"
        fetchPriority="high"
        draggable={false}
        className={`${styles.mobileHeroLayer} ${styles.mobileHeroCompositeLayer}`}
        style={
          {
            "--khix-mobile-layer-depth-x": 2,
            "--khix-mobile-layer-depth-y": 0.8,
            "--khix-mobile-layer-scroll-y": "5px",
          } as CSSProperties
        }
      />
    </div>
  );
}

/** Renders the eager static scene that anchors the hero's first paint. */
function HeroBaseLayer() {
  return (
    <div
      className={`${styles.layer} ${styles.baseLayer}`}
      data-hero-layer
      style={
        {
          "--khix-layer-depth-x": -4,
          "--khix-layer-depth-y": -2,
          "--khix-layer-scale": 1.012,
          "--khix-layer-scroll-y": "-10px",
          zIndex: 1,
        } as CSSProperties
      }
    >
      <picture>
        <source
          media="(max-width: 700px)"
          srcSet="/media/homepage/hero-static/hero-mobile-7bg.webp"
        />
        <img
          src="/media/homepage/hero-static/hero-desktop-composite.avif"
          alt=""
          className={styles.baseLayerImage}
          loading="eager"
          fetchPriority="high"
          draggable={false}
          data-hero-layer-image
        />
      </picture>
    </div>
  );
}

/** Renders the merged pond and waterfall animation for desktop viewports. */
function DesktopHeroAmbient() {
  return (
    <div
      className={`${styles.layer} ${styles.heroAmbientLayer}`}
      data-hero-layer
      style={
        {
          "--khix-layer-depth-x": 5,
          "--khix-layer-depth-y": 2.5,
          "--khix-layer-scale": 1.012,
          "--khix-layer-scroll-y": "8px",
          zIndex: 2,
        } as CSSProperties
      }
    >
      <AmbientVideo
        className={styles.heroAmbientFrameSequence}
        preload="auto"
        rootMargin="0px"
        sources={getTransparentVideoSources(
          "/media/homepage/hero-ambient-combined",
        ).map((source) => ({ ...source, media: "(min-width: 701px)" }))}
      />
    </div>
  );
}
