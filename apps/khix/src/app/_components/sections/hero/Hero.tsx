"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";

import { FallingLeaves } from "./FallingLeaves";
import styles from "./Hero.module.css";
import { HeroLayerImage } from "./HeroLayerImage";
import { HeroApplyButton, HeroTitle } from "./HeroTitle";
import { HERO_LAYERS } from "./layers";
import { useHeroMotion } from "./useHeroMotion";

export default function Hero() {
  const { sectionRef, stageRef, handlePointerMove, handlePointerLeave } =
    useHeroMotion();
  const [viewport, setViewport] = useState<"desktop" | "mobile" | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateViewport = () => {
      setViewport(mediaQuery.matches ? "mobile" : "desktop");
    };

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);

    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

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
          {viewport === "desktop" ? (
            <div className={styles.desktopHeroLayers}>
              {HERO_LAYERS.map((layer, index) => (
                <HeroLayerImage
                  key={layer.filename}
                  layer={layer}
                  index={index}
                />
              ))}
            </div>
          ) : null}
          {viewport === "mobile" ? <MobileHeroLayers /> : null}
          <div className={styles.shade} aria-hidden="true" />
          <HeroTitle />
          <FallingLeaves />
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

const MOBILE_HERO_LAYERS = [
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-7bg.webp",
    className: styles.mobileHeroLayerSeven,
    depthX: -6,
    depthY: -2,
    scrollY: -10,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-6.webp",
    className: styles.mobileHeroLayerSix,
    depthX: -5,
    depthY: -1.6,
    scrollY: -8,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-5.webp",
    className: styles.mobileHeroLayerFive,
    depthX: -3,
    depthY: -1,
    scrollY: -5,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-4.webp",
    className: styles.mobileHeroLayerFour,
    depthX: 3,
    depthY: 1,
    scrollY: 5,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-pond-animated.webp",
    className: styles.mobileHeroPondAnimationLayer,
    depthX: 3,
    depthY: 1,
    scrollY: 5,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-3.webp",
    className: styles.mobileHeroLayerThree,
    depthX: 5,
    depthY: 1.8,
    scrollY: 8,
  },
  {
    src: "https://assets.knighthacks.org/khix/hero-mobile-2.webp",
    className: styles.mobileHeroLayerTwo,
    depthX: 5,
    depthY: 1.8,
    scrollY: 8,
  },
];

function MobileHeroLayers() {
  return (
    <div className={styles.mobileHeroLayers} data-mobile-hero-layers>
      {MOBILE_HERO_LAYERS.map((layer, index) => (
        <Image
          key={layer.src}
          src={layer.src}
          alt=""
          fill
          priority={index === 0}
          unoptimized
          sizes="100vw"
          draggable={false}
          style={
            {
              "--khix-mobile-layer-depth-x": layer.depthX,
              "--khix-mobile-layer-depth-y": layer.depthY,
              "--khix-mobile-layer-scroll-y": `${layer.scrollY}px`,
            } as CSSProperties
          }
          className={[styles.mobileHeroLayer, layer.className].join(" ")}
        />
      ))}
    </div>
  );
}
