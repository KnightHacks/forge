import type { CSSProperties } from "react";
import Image from "next/image";

import type { HeroLayer } from "./layers";
import styles from "./Hero.module.css";
import { HERO_ASSET_BASE_PATH } from "./layers";

interface HeroLayerImageProps {
  layer: HeroLayer;
  index: number;
  zIndex?: number;
}

export function HeroLayerImage({ layer, index, zIndex }: HeroLayerImageProps) {
  const isGlow = layer.motionRole === "glow";
  const isPond = layer.motionRole === "pond";
  const isTk = layer.motionRole === "tk";
  const isWaterfall = layer.motionRole === "waterfall";
  const isTreeWaterfall = layer.filename.includes("3_tree_and_waterfall");
  const isDistant = index < 4;
  const hasAmbientImageMotion = !(isGlow || isPond || isTk || isWaterfall);
  const imageClassName = [
    styles.layerImage,
    isWaterfall ? styles.waterfallSourceImage : "",
  ]
    .filter(Boolean)
    .join(" ");
  const layerClassName = [
    styles.layer,
    isDistant ? styles.distantLayer : "",
    isGlow ? styles.glowLayer : "",
    isPond || isWaterfall ? styles.waterLayer : "",
    isPond ? styles.pondLayer : "",
    isTreeWaterfall ? styles.treeWaterfallLayer : "",
    isTk ? styles.tkLayer : "",
    isWaterfall ? styles.waterfallLayer : "",
  ]
    .filter(Boolean)
    .join(" ");

  const layerStyle = {
    "--khix-layer-scale": layer.scale,
    zIndex: zIndex ?? index + 1,
  } as CSSProperties;

  return (
    <div
      className={layerClassName}
      data-hero-layer
      data-hero-depth-x={layer.depthX}
      data-hero-depth-y={layer.depthY}
      data-hero-scroll-y={layer.scrollY}
      data-hero-glow-layer={isGlow ? true : undefined}
      data-hero-pond-layer={isPond ? true : undefined}
      data-hero-tk-layer={isTk ? true : undefined}
      data-hero-water-layer={isPond || isWaterfall ? true : undefined}
      data-hero-waterfall-layer={isWaterfall ? true : undefined}
      data-hero-distant-layer={isDistant ? true : undefined}
      data-hero-motion-role={layer.motionRole}
      style={layerStyle}
    >
      <Image
        src={`${HERO_ASSET_BASE_PATH}/${layer.filename}`}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        draggable={false}
        className={imageClassName}
        data-hero-layer-image={!isWaterfall ? true : undefined}
        data-hero-ambient-image={hasAmbientImageMotion ? true : undefined}
      />
      {isWaterfall ? (
        <span className={styles.waterfallFrameSequence} data-hero-layer-image />
      ) : null}
    </div>
  );
}
