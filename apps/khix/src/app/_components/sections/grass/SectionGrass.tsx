import type { CSSProperties } from "react";
import Image from "next/image";

import styles from "./SectionGrass.module.css";

const GRASS_ASSET_PATH = "/assets/about";

const GRASS_ASSETS = {
  left: {
    src: "grass-left.png",
    width: 1250,
    height: 3489,
  },
  right: {
    src: "grass-right.png",
    width: 965,
    height: 3380,
  },
  mushroom: {
    src: "grass-mushroom.png",
    width: 1709,
    height: 4982,
  },
} as const;

type GrassAssetKey = keyof typeof GRASS_ASSETS;

interface GrassDecoration {
  asset: GrassAssetKey;
  id: string;
  style: GrassStyle;
}

type GrassStyle = CSSProperties &
  Record<`--grass-${string}`, string | undefined>;

function frontOffset(offset: string) {
  return `calc(var(--khix-front-top) + ${offset})`;
}

const GRASS_DECORATIONS: GrassDecoration[] = [
  {
    id: "about-left-wall",
    asset: "left",
    style: {
      "--grass-top": frontOffset("108vw"),
      "--grass-left": "clamp(0.35rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(12rem, 22vw, 24rem)",
      "--grass-opacity": "0.74",
      "--grass-transform": "rotate(-1.5deg)",
      "--grass-tablet-width": "clamp(11rem, 24vw, 16rem)",
      "--grass-mobile-top": frontOffset("106vw"),
      "--grass-mobile-left": "0.1rem",
      "--grass-mobile-width": "clamp(4rem, 19vw, 5.4rem)",
      "--grass-mobile-opacity": "0.64",
    },
  },
  {
    id: "about-right-wall",
    asset: "right",
    style: {
      "--grass-top": frontOffset("112vw"),
      "--grass-right": "clamp(0.35rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(10rem, 19vw, 22rem)",
      "--grass-opacity": "0.74",
      "--grass-transform": "rotate(1.5deg)",
      "--grass-tablet-width": "clamp(9rem, 20vw, 14rem)",
      "--grass-mobile-top": frontOffset("110vw"),
      "--grass-mobile-right": "0.1rem",
      "--grass-mobile-width": "clamp(3.9rem, 18vw, 5.2rem)",
      "--grass-mobile-opacity": "0.62",
    },
  },
  {
    id: "about-mid-left-wall",
    asset: "right",
    style: {
      "--grass-top": frontOffset("130vw"),
      "--grass-left": "clamp(0.25rem, 0.8vw, 0.9rem)",
      "--grass-width": "clamp(7rem, 11vw, 13rem)",
      "--grass-opacity": "0.48",
      "--grass-transform": "rotate(5deg) scaleX(-1)",
      "--grass-tablet-width": "clamp(5.8rem, 12vw, 8.8rem)",
      "--grass-mobile-top": frontOffset("130vw"),
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(3.8rem, 18vw, 5.1rem)",
      "--grass-mobile-opacity": "0.45",
    },
  },
  {
    id: "about-mid-right-wall",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("136vw"),
      "--grass-right": "clamp(0.25rem, 0.8vw, 0.9rem)",
      "--grass-width": "clamp(6.7rem, 10vw, 12rem)",
      "--grass-opacity": "0.52",
      "--grass-transform": "rotate(-4deg)",
      "--grass-tablet-width": "clamp(5.5rem, 11vw, 8.2rem)",
      "--grass-mobile-top": frontOffset("136vw"),
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(3.7rem, 17vw, 5rem)",
      "--grass-mobile-opacity": "0.46",
    },
  },
  {
    id: "about-left-lower",
    asset: "left",
    style: {
      "--grass-top": frontOffset("168vw"),
      "--grass-left": "clamp(0.3rem, 1vw, 1rem)",
      "--grass-width": "clamp(12rem, 19vw, 22rem)",
      "--grass-opacity": "0.72",
      "--grass-transform": "rotate(-7deg)",
      "--grass-tablet-width": "clamp(10rem, 18vw, 14rem)",
      "--grass-mobile-top": frontOffset("166vw"),
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(5.9rem, 28vw, 8rem)",
      "--grass-mobile-opacity": "0.58",
    },
  },
  {
    id: "about-right-mushroom",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("158vw"),
      "--grass-right": "clamp(0.25rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(8rem, 14vw, 16rem)",
      "--grass-opacity": "0.82",
      "--grass-transform": "rotate(2deg)",
      "--grass-tablet-width": "clamp(7rem, 14vw, 11rem)",
      "--grass-mobile-top": frontOffset("158vw"),
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(4.7rem, 22vw, 6.4rem)",
      "--grass-mobile-opacity": "0.62",
    },
  },
  {
    id: "tracks-left-wall",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("122vw"),
      "--grass-left": "clamp(0.15rem, 0.8vw, 0.9rem)",
      "--grass-width": "clamp(8rem, 13vw, 15rem)",
      "--grass-opacity": "0.62",
      "--grass-transform": "rotate(4deg) scaleX(-1)",
      "--grass-tablet-width": "clamp(6rem, 12vw, 9rem)",
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(4.1rem, 19vw, 5.7rem)",
      "--grass-mobile-opacity": "0.56",
    },
  },
  {
    id: "tracks-right-wall",
    asset: "right",
    style: {
      "--grass-top": frontOffset("147vw"),
      "--grass-right": "clamp(0.15rem, 0.8vw, 0.9rem)",
      "--grass-width": "clamp(9rem, 15vw, 17rem)",
      "--grass-opacity": "0.62",
      "--grass-transform": "rotate(-5deg) scaleX(-1)",
      "--grass-tablet-width": "clamp(8rem, 17vw, 12rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(4.2rem, 20vw, 5.8rem)",
      "--grass-mobile-opacity": "0.54",
    },
  },
  {
    id: "tracks-center-left",
    asset: "left",
    style: {
      "--grass-top": frontOffset("180vw"),
      "--grass-left": "clamp(0.55rem, 1.5vw, 1.9rem)",
      "--grass-width": "clamp(6rem, 10vw, 12rem)",
      "--grass-opacity": "0.44",
      "--grass-transform": "rotate(-8deg)",
      "--grass-tablet-width": "clamp(5.4rem, 11vw, 8.2rem)",
      "--grass-mobile-left": "0.05rem",
      "--grass-mobile-width": "clamp(3.6rem, 17vw, 4.9rem)",
      "--grass-mobile-opacity": "0.42",
    },
  },
  {
    id: "tracks-bottom-left",
    asset: "left",
    style: {
      "--grass-top": frontOffset("205vw"),
      "--grass-left": "clamp(0.25rem, 1.2vw, 1.2rem)",
      "--grass-width": "clamp(10rem, 16vw, 19rem)",
      "--grass-opacity": "0.68",
      "--grass-transform": "rotate(6deg)",
      "--grass-tablet-width": "clamp(9rem, 16vw, 12rem)",
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(5.4rem, 26vw, 7.4rem)",
      "--grass-mobile-opacity": "0.58",
    },
  },
  {
    id: "tracks-bottom-right",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("212vw"),
      "--grass-right": "clamp(0.2rem, 1.1vw, 1rem)",
      "--grass-width": "clamp(7rem, 11vw, 13rem)",
      "--grass-opacity": "0.58",
      "--grass-transform": "rotate(-5deg)",
      "--grass-tablet-width": "clamp(5.8rem, 12vw, 8.6rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(3.9rem, 18vw, 5.2rem)",
      "--grass-mobile-opacity": "0.47",
    },
  },
  {
    id: "speakers-left-wall",
    asset: "left",
    style: {
      "--grass-top": frontOffset("126vw"),
      "--grass-left": "clamp(0.15rem, 0.8vw, 0.9rem)",
      "--grass-width": "clamp(11rem, 18vw, 20rem)",
      "--grass-opacity": "0.66",
      "--grass-transform": "rotate(-4deg)",
      "--grass-tablet-width": "clamp(8rem, 16vw, 12rem)",
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(4.1rem, 19vw, 5.6rem)",
      "--grass-mobile-opacity": "0.55",
    },
  },
  {
    id: "speakers-right-mushroom",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("154vw"),
      "--grass-right": "clamp(0.15rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(7rem, 12vw, 14rem)",
      "--grass-opacity": "0.68",
      "--grass-transform": "rotate(-6deg)",
      "--grass-tablet-width": "clamp(6rem, 12vw, 9rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(3.8rem, 18vw, 5.1rem)",
      "--grass-mobile-opacity": "0.54",
    },
  },
  {
    id: "speakers-upper-right-wall",
    asset: "right",
    style: {
      "--grass-top": frontOffset("138vw"),
      "--grass-right": "0",
      "--grass-width": "clamp(7.5rem, 12vw, 14rem)",
      "--grass-opacity": "0.46",
      "--grass-transform": "rotate(3deg)",
      "--grass-tablet-width": "clamp(5.8rem, 12vw, 8.8rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(3.6rem, 17vw, 4.8rem)",
      "--grass-mobile-opacity": "0.4",
    },
  },
  {
    id: "speakers-bottom-right",
    asset: "right",
    style: {
      "--grass-top": frontOffset("196vw"),
      "--grass-right": "clamp(0.25rem, 1.2vw, 1.2rem)",
      "--grass-width": "clamp(10rem, 16vw, 19rem)",
      "--grass-opacity": "0.68",
      "--grass-transform": "rotate(6deg)",
      "--grass-tablet-width": "clamp(9rem, 16vw, 12rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(5.4rem, 26vw, 7.3rem)",
      "--grass-mobile-opacity": "0.56",
    },
  },
  {
    id: "speakers-bottom-left",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("220vw"),
      "--grass-left": "clamp(0.15rem, 1vw, 1rem)",
      "--grass-width": "clamp(7rem, 11vw, 13rem)",
      "--grass-opacity": "0.55",
      "--grass-transform": "rotate(5deg) scaleX(-1)",
      "--grass-tablet-width": "clamp(5.8rem, 12vw, 8.6rem)",
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(3.8rem, 18vw, 5.1rem)",
      "--grass-mobile-opacity": "0.45",
    },
  },
  {
    id: "sponsors-left-wall",
    asset: "mushroom",
    style: {
      "--grass-top": frontOffset("132vw"),
      "--grass-left": "clamp(0.15rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(7rem, 12vw, 14rem)",
      "--grass-opacity": "0.62",
      "--grass-transform": "rotate(5deg) scaleX(-1)",
      "--grass-tablet-width": "clamp(6rem, 12vw, 9rem)",
      "--grass-mobile-left": "0",
      "--grass-mobile-width": "clamp(3.8rem, 18vw, 5.1rem)",
      "--grass-mobile-opacity": "0.5",
    },
  },
  {
    id: "sponsors-right-wall",
    asset: "right",
    style: {
      "--grass-top": frontOffset("184vw"),
      "--grass-right": "clamp(0.15rem, 0.9vw, 0.9rem)",
      "--grass-width": "clamp(9rem, 15vw, 17rem)",
      "--grass-opacity": "0.58",
      "--grass-transform": "rotate(-3deg)",
      "--grass-tablet-width": "clamp(7rem, 14vw, 10rem)",
      "--grass-mobile-right": "0",
      "--grass-mobile-width": "clamp(3.9rem, 18vw, 5.2rem)",
      "--grass-mobile-opacity": "0.48",
    },
  },
  {
    id: "sponsors-mid-left-wall",
    asset: "left",
    style: {
      "--grass-top": frontOffset("202vw"),
      "--grass-left": "0",
      "--grass-width": "clamp(8.5rem, 13vw, 15rem)",
      "--grass-opacity": "0.46",
      "--grass-transform": "rotate(-6deg)",
      "--grass-tablet-width": "clamp(6rem, 12vw, 9rem)",
      "--grass-mobile-width": "clamp(3.8rem, 18vw, 5.1rem)",
      "--grass-mobile-opacity": "0.4",
    },
  },
];

export function SectionGrass() {
  return (
    <div className={styles.grassLayer} aria-hidden="true">
      {GRASS_DECORATIONS.map(({ asset, id, style }) => {
        const grass = GRASS_ASSETS[asset];

        return (
          <Image
            key={id}
            src={`${GRASS_ASSET_PATH}/${grass.src}`}
            alt=""
            width={grass.width}
            height={grass.height}
            sizes="(max-width: 760px) 24vw, (max-width: 1100px) 18vw, 16vw"
            unoptimized
            draggable={false}
            data-section-grass={id}
            className={styles.grass}
            style={style}
          />
        );
      })}
    </div>
  );
}
