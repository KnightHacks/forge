"use client";

import { FallingLeaves } from "./FallingLeaves";
import styles from "./Hero.module.css";
import { HeroLayerImage } from "./HeroLayerImage";
import { HeroTitle } from "./HeroTitle";
import { HERO_LAYERS } from "./layers";
import { useHeroMotion } from "./useHeroMotion";

export default function Hero() {
  const foregroundLayerIndex = HERO_LAYERS.length - 1;
  const foregroundLayer = HERO_LAYERS[foregroundLayerIndex];
  const backgroundLayers = HERO_LAYERS.slice(0, foregroundLayerIndex);
  const { sectionRef, stageRef, handlePointerMove, handlePointerLeave } =
    useHeroMotion();

  if (!foregroundLayer) {
    return null;
  }

  return (
    <main className={styles.page}>
      <section
        ref={sectionRef}
        className={styles.scrollZone}
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
            {backgroundLayers.map((layer, index) => (
              <HeroLayerImage
                key={layer.filename}
                layer={layer}
                index={index}
              />
            ))}
            <div className={styles.shade} aria-hidden="true" />
            <HeroTitle />
            <HeroLayerImage
              layer={foregroundLayer}
              index={foregroundLayerIndex}
              zIndex={12}
            />
            <FallingLeaves />
          </div>
          <div
            className={styles.introVeil}
            data-hero-intro-veil
            aria-hidden="true"
          />
        </div>
      </section>
    </main>
  );
}
