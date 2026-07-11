"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import styles from "./SponsorTeamSection.module.css";

type DropletStyle = CSSProperties & {
  "--droplet-delay": string;
  "--droplet-drift": string;
  "--droplet-duration": string;
  "--droplet-height": string;
  "--droplet-mid-drift": string;
  "--droplet-mid-travel": string;
  "--droplet-opacity": string;
  "--droplet-travel": string;
  "--droplet-width": string;
  "--droplet-x": string;
  "--droplet-y": string;
};

const BASE_DROPLET_COUNT = 384;
const BASE_BUBBLE_INTERVAL = 5;
const EXTRA_BUBBLE_COUNT = Math.ceil(BASE_DROPLET_COUNT / BASE_BUBBLE_INTERVAL);
const BUBBLE_CURVE_STEP = 0.438447187;
const BUBBLE_DIRECTION_STEP = 0.414213562;
const BUBBLE_DISTANCE_STEP = 0.732050808;
const BUBBLE_LIFESPAN_STEP = 0.569840291;
const HORIZONTAL_DISTRIBUTION_STEP = 0.754877666;
const VERTICAL_DISTRIBUTION_STEP = 0.618033989;

function fractionalPart(value: number) {
  return value - Math.floor(value);
}

function createDroplet({
  bubble,
  id,
  mobileIndex,
}: {
  bubble: boolean;
  id: number;
  mobileIndex: number;
}) {
  const sequenceIndex = id + 1;
  const distributionCycle = Math.floor(id / 12);
  const x =
    18 + fractionalPart(sequenceIndex * HORIZONTAL_DISTRIBUTION_STEP) * 64;
  const y = 3 + fractionalPart(sequenceIndex * VERTICAL_DISTRIBUTION_STEP) * 94;
  const duration = bubble
    ? 3.4 + fractionalPart(sequenceIndex * BUBBLE_LIFESPAN_STEP) * 5.6
    : 2 + ((id * 7) % 13) / 10;
  const delay = -((id * 0.73 + distributionCycle * 0.41) % duration);
  const direction =
    fractionalPart(sequenceIndex * BUBBLE_DIRECTION_STEP) * Math.PI * 2;
  const bubbleDistance =
    80 + fractionalPart(sequenceIndex * BUBBLE_DISTANCE_STEP) * 120;
  const drift = bubble
    ? Math.cos(direction) * bubbleDistance
    : ((id * 23) % 81) - 40;
  const travel = bubble
    ? Math.sin(direction) * bubbleDistance
    : 190 + ((id * 29) % 151);
  const curveDirection = id % 2 === 0 ? 1 : -1;
  const curveDistance =
    20 + fractionalPart(sequenceIndex * BUBBLE_CURVE_STEP) * 38;
  const midDrift = bubble
    ? drift * 0.44 +
      Math.cos(direction + Math.PI / 2) * curveDistance * curveDirection
    : drift * 0.28;
  const midTravel = bubble
    ? travel * 0.44 +
      Math.sin(direction + Math.PI / 2) * curveDistance * curveDirection
    : travel * 0.24;
  const width = bubble ? 3.6 + (id % 3) * 0.65 : 2.1 + (id % 4) * 0.48;
  const height = bubble ? width : 17 + ((id * 7) % 18);
  const opacity = 0.62 + ((id * 7) % 6) * 0.055;

  return {
    bead: bubble,
    delay,
    drift,
    duration,
    foreground: (id + distributionCycle) % 4 === 0,
    height,
    id,
    midDrift,
    midTravel,
    mobileHidden: mobileIndex % 6 !== 0,
    opacity,
    travel,
    width,
    x,
    y,
  };
}

const BASE_DROPLETS = Array.from({ length: BASE_DROPLET_COUNT }, (_, index) =>
  createDroplet({
    bubble: index % BASE_BUBBLE_INTERVAL === 0,
    id: index,
    mobileIndex: index,
  }),
);

const EXTRA_BUBBLES = Array.from(
  { length: EXTRA_BUBBLE_COUNT },
  (_, bubbleIndex) =>
    createDroplet({
      bubble: true,
      id: BASE_DROPLET_COUNT + bubbleIndex,
      mobileIndex: bubbleIndex,
    }),
);

const DROPLETS = [...BASE_DROPLETS, ...EXTRA_BUBBLES];

type WaterfallDroplet = (typeof DROPLETS)[number];

const BACKGROUND_DROPLETS = DROPLETS.filter((droplet) => !droplet.foreground);
const FOREGROUND_DROPLETS = DROPLETS.filter((droplet) => droplet.foreground);

function DropletField({ droplets }: { droplets: readonly WaterfallDroplet[] }) {
  return (
    <div className={styles.dropletLayer}>
      {droplets.map((droplet) => (
        <span
          key={droplet.id}
          className={styles.droplet}
          data-mobile-hidden={droplet.mobileHidden ? "true" : undefined}
          data-shape={droplet.bead ? "bead" : "streak"}
          style={
            {
              "--droplet-delay": `${droplet.delay.toFixed(2)}s`,
              "--droplet-drift": `${droplet.drift.toFixed(2)}px`,
              "--droplet-duration": `${droplet.duration.toFixed(2)}s`,
              "--droplet-height": `${droplet.height.toFixed(2)}px`,
              "--droplet-mid-drift": `${droplet.midDrift.toFixed(2)}px`,
              "--droplet-mid-travel": `${droplet.midTravel.toFixed(2)}px`,
              "--droplet-opacity": droplet.opacity.toFixed(2),
              "--droplet-travel": `${droplet.travel.toFixed(2)}px`,
              "--droplet-width": `${droplet.width.toFixed(2)}px`,
              "--droplet-x": `${droplet.x.toFixed(2)}%`,
              "--droplet-y": `${droplet.y.toFixed(2)}%`,
            } as DropletStyle
          }
        />
      ))}
    </div>
  );
}

export function WaterfallAtmosphere() {
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const foregroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atmosphere = atmosphereRef.current;
    const foreground = foregroundRef.current;

    if (!atmosphere || !foreground) {
      return;
    }

    const setActive = (isActive: boolean) => {
      const activeValue = isActive ? "true" : "false";

      atmosphere.dataset.active = activeValue;
      foreground.dataset.active = activeValue;
    };

    if (!("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry?.isIntersecting ?? false);
      },
      { rootMargin: "20% 0px", threshold: 0.01 },
    );

    observer.observe(atmosphere);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={atmosphereRef}
        className={styles.waterfallAtmosphere}
        data-active="true"
        aria-hidden="true"
      >
        <DropletField droplets={BACKGROUND_DROPLETS} />
      </div>

      <div
        ref={foregroundRef}
        className={styles.waterfallForegroundAtmosphere}
        data-active="true"
        aria-hidden="true"
      >
        <DropletField droplets={FOREGROUND_DROPLETS} />
      </div>
    </>
  );
}
