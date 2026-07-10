"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import styles from "./TracksSection.module.css";

const ASSET_PATH = "/assets";

const TRACKS = [
  "Hello World",
  "Artificial Intelligence / Machine Learning",
  "App Development",
  "Game Development",
  "Embedded Software",
] as const;

type RevealStage = 0 | 1 | 2 | 3;
type CharacterLayer = "rear" | "front";
type LeafLayer = "rear" | "front";

const LEAF_ASSETS = {
  "leaf-1.webp": { width: 495, height: 947 },
  "leaf-2.webp": { width: 807, height: 918 },
  "leaf-3.webp": { width: 754, height: 1161 },
} as const;

type LeafAsset = keyof typeof LEAF_ASSETS;

type CharacterStyle = CSSProperties &
  Record<`--character-${string}`, string | undefined>;
type LeafStyle = CSSProperties &
  Record<`--leaf-${string}`, string | number | undefined>;

interface CharacterConfig {
  asset: string;
  layer: CharacterLayer;
  style: CharacterStyle;
}

interface LeafConfig {
  asset: LeafAsset;
  fallDelay: string;
  fallDuration: string;
  fallRotation: string;
  fallX: string;
  fallY: string;
  id: string;
  layer: LeafLayer;
  mobileWidth: string;
  origin: string;
  rotation: string;
  rustleDelay: string;
  rustleDuration: string;
  scale: number;
  shiftRotation: string;
  shiftX: string;
  shiftY: string;
  stageTwoOpacity: number;
  width: string;
  x: string;
  y: string;
}

const NEXT_STAGE: Record<RevealStage, RevealStage> = {
  0: 1,
  1: 2,
  2: 3,
  3: 3,
};

const STAGE_SETTLE_MS = {
  1: 670,
  2: 830,
} as const;

const REVEAL_COPY = [
  {
    hint: "Rustle the leaves three times",
    label:
      "Rustle the foliage to begin revealing the forest visitors. Three activations remaining.",
    status: "The foliage is still. Three activations remain.",
  },
  {
    hint: "The canopy stirred — two rustles left",
    label: "Rustle the foliage again. Two activations remaining.",
    status: "The leaves rustled softly. Two activations remain.",
  },
  {
    hint: "They are almost visible — one rustle left",
    label: "Clear the remaining foliage. One activation remaining.",
    status: "The foliage has started to fall. One activation remains.",
  },
  {
    hint: "The forest visitors are revealed",
    label: "The forest visitors are revealed.",
    status: "The leaves have fallen and the forest visitors are revealed.",
  },
] as const;

const CHARACTERS: readonly CharacterConfig[] = [
  {
    asset: "IMG_7680.webp",
    layer: "rear",
    style: {
      "--character-left": "8%",
      "--character-bottom": "46%",
      "--character-width": "clamp(8.5rem, 15%, 13.5rem)",
      "--character-rotation": "-3deg",
      "--character-mobile-left": "12%",
      "--character-mobile-bottom": "45%",
      "--character-mobile-width": "27%",
    },
  },
  {
    asset: "IMG_7681.webp",
    layer: "rear",
    style: {
      "--character-left": "18%",
      "--character-bottom": "48%",
      "--character-width": "clamp(7.5rem, 13%, 11.5rem)",
      "--character-rotation": "2deg",
      "--character-mobile-left": "22%",
      "--character-mobile-bottom": "49%",
      "--character-mobile-width": "25%",
    },
  },
  {
    asset: "IMG_7682.webp",
    layer: "rear",
    style: {
      "--character-left": "30%",
      "--character-bottom": "44%",
      "--character-width": "clamp(9rem, 16%, 14rem)",
      "--character-rotation": "-1deg",
      "--character-mobile-left": "33%",
      "--character-mobile-bottom": "44%",
      "--character-mobile-width": "29%",
    },
  },
  {
    asset: "IMG_7683.webp",
    layer: "front",
    style: {
      "--character-left": "41%",
      "--character-bottom": "40%",
      "--character-width": "clamp(9rem, 16%, 14rem)",
      "--character-rotation": "2deg",
      "--character-mobile-left": "43%",
      "--character-mobile-bottom": "39%",
      "--character-mobile-width": "31%",
    },
  },
  {
    asset: "IMG_7684.webp",
    layer: "rear",
    style: {
      "--character-left": "52%",
      "--character-bottom": "45%",
      "--character-width": "clamp(8.5rem, 15%, 13rem)",
      "--character-rotation": "-2deg",
      "--character-mobile-left": "54%",
      "--character-mobile-bottom": "46%",
      "--character-mobile-width": "27%",
    },
  },
  {
    asset: "IMG_7685.webp",
    layer: "front",
    style: {
      "--character-left": "64%",
      "--character-bottom": "47%",
      "--character-width": "clamp(8rem, 14%, 12.5rem)",
      "--character-rotation": "3deg",
      "--character-mobile-left": "65%",
      "--character-mobile-bottom": "49%",
      "--character-mobile-width": "26%",
    },
  },
  {
    asset: "IMG_7687.webp",
    layer: "rear",
    style: {
      "--character-left": "76%",
      "--character-bottom": "45%",
      "--character-width": "clamp(8.5rem, 15%, 13rem)",
      "--character-rotation": "-2deg",
      "--character-mobile-left": "76%",
      "--character-mobile-bottom": "45%",
      "--character-mobile-width": "26%",
    },
  },
  {
    asset: "IMG_7688.webp",
    layer: "front",
    style: {
      "--character-left": "89%",
      "--character-bottom": "44%",
      "--character-width": "clamp(8.5rem, 15%, 13rem)",
      "--character-rotation": "3deg",
      "--character-mobile-left": "88%",
      "--character-mobile-bottom": "45%",
      "--character-mobile-width": "28%",
    },
  },
] as const;

const LEAVES: readonly LeafConfig[] = [
  {
    id: "rear-left",
    asset: "leaf-2.webp",
    layer: "rear",
    x: "4%",
    y: "44%",
    width: "18%",
    mobileWidth: "38%",
    rotation: "-18deg",
    scale: 1.04,
    origin: "36% 78%",
    rustleDelay: "25ms",
    rustleDuration: "390ms",
    shiftX: "-0.8rem",
    shiftY: "1.4rem",
    shiftRotation: "-9deg",
    stageTwoOpacity: 0.94,
    fallX: "-5rem",
    fallY: "clamp(18rem, 40svh, 29rem)",
    fallRotation: "-310deg",
    fallDelay: "40ms",
    fallDuration: "1180ms",
  },
  {
    id: "rear-quarter",
    asset: "leaf-1.webp",
    layer: "rear",
    x: "30%",
    y: "35%",
    width: "13%",
    mobileWidth: "29%",
    rotation: "14deg",
    scale: 0.94,
    origin: "58% 82%",
    rustleDelay: "90ms",
    rustleDuration: "440ms",
    shiftX: "0.7rem",
    shiftY: "1.8rem",
    shiftRotation: "12deg",
    stageTwoOpacity: 0.9,
    fallX: "4rem",
    fallY: "clamp(20rem, 44svh, 31rem)",
    fallRotation: "340deg",
    fallDelay: "190ms",
    fallDuration: "1380ms",
  },
  {
    id: "rear-center",
    asset: "leaf-3.webp",
    layer: "rear",
    x: "55%",
    y: "39%",
    width: "14%",
    mobileWidth: "31%",
    rotation: "-8deg",
    scale: 1.08,
    origin: "44% 84%",
    rustleDelay: "45ms",
    rustleDuration: "410ms",
    shiftX: "-0.4rem",
    shiftY: "2.2rem",
    shiftRotation: "-13deg",
    stageTwoOpacity: 0.88,
    fallX: "-3rem",
    fallY: "clamp(19rem, 42svh, 30rem)",
    fallRotation: "-390deg",
    fallDelay: "110ms",
    fallDuration: "1260ms",
  },
  {
    id: "rear-right",
    asset: "leaf-2.webp",
    layer: "rear",
    x: "86%",
    y: "43%",
    width: "17%",
    mobileWidth: "37%",
    rotation: "20deg",
    scale: 1,
    origin: "62% 76%",
    rustleDelay: "115ms",
    rustleDuration: "470ms",
    shiftX: "1.1rem",
    shiftY: "1.3rem",
    shiftRotation: "10deg",
    stageTwoOpacity: 0.92,
    fallX: "6rem",
    fallY: "clamp(18rem, 39svh, 28rem)",
    fallRotation: "370deg",
    fallDelay: "270ms",
    fallDuration: "1460ms",
  },
  {
    id: "front-edge-left",
    asset: "leaf-3.webp",
    layer: "front",
    x: "-2%",
    y: "39%",
    width: "15%",
    mobileWidth: "34%",
    rotation: "23deg",
    scale: 1.04,
    origin: "50% 88%",
    rustleDelay: "70ms",
    rustleDuration: "430ms",
    shiftX: "-1.2rem",
    shiftY: "2.8rem",
    shiftRotation: "-18deg",
    stageTwoOpacity: 0.84,
    fallX: "-7rem",
    fallY: "clamp(21rem, 46svh, 32rem)",
    fallRotation: "-460deg",
    fallDelay: "10ms",
    fallDuration: "1290ms",
  },
  {
    id: "front-left-a",
    asset: "leaf-1.webp",
    layer: "front",
    x: "8%",
    y: "31%",
    width: "12%",
    mobileWidth: "28%",
    rotation: "-11deg",
    scale: 1,
    origin: "48% 90%",
    rustleDelay: "10ms",
    rustleDuration: "380ms",
    shiftX: "0.8rem",
    shiftY: "0.9rem",
    shiftRotation: "9deg",
    stageTwoOpacity: 0.96,
    fallX: "3rem",
    fallY: "clamp(18rem, 41svh, 28rem)",
    fallRotation: "410deg",
    fallDelay: "330ms",
    fallDuration: "1120ms",
  },
  {
    id: "front-left-b",
    asset: "leaf-2.webp",
    layer: "front",
    x: "16%",
    y: "44%",
    width: "17%",
    mobileWidth: "39%",
    rotation: "8deg",
    scale: 1.08,
    origin: "42% 74%",
    rustleDelay: "85ms",
    rustleDuration: "460ms",
    shiftX: "-0.5rem",
    shiftY: "3.7rem",
    shiftRotation: "-15deg",
    stageTwoOpacity: 0.76,
    fallX: "-4rem",
    fallY: "clamp(20rem, 45svh, 31rem)",
    fallRotation: "-520deg",
    fallDelay: "100ms",
    fallDuration: "1510ms",
  },
  {
    id: "front-left-c",
    asset: "leaf-3.webp",
    layer: "front",
    x: "24%",
    y: "34%",
    width: "13%",
    mobileWidth: "30%",
    rotation: "-27deg",
    scale: 0.96,
    origin: "57% 86%",
    rustleDelay: "130ms",
    rustleDuration: "420ms",
    shiftX: "1.2rem",
    shiftY: "1.5rem",
    shiftRotation: "17deg",
    stageTwoOpacity: 0.91,
    fallX: "5rem",
    fallY: "clamp(19rem, 43svh, 30rem)",
    fallRotation: "430deg",
    fallDelay: "230ms",
    fallDuration: "1220ms",
  },
  {
    id: "front-center-left-a",
    asset: "leaf-1.webp",
    layer: "front",
    x: "34%",
    y: "39%",
    width: "14%",
    mobileWidth: "32%",
    rotation: "18deg",
    scale: 1.06,
    origin: "40% 83%",
    rustleDelay: "55ms",
    rustleDuration: "450ms",
    shiftX: "-1rem",
    shiftY: "2.6rem",
    shiftRotation: "-11deg",
    stageTwoOpacity: 0.82,
    fallX: "-6rem",
    fallY: "clamp(22rem, 48svh, 33rem)",
    fallRotation: "-360deg",
    fallDelay: "150ms",
    fallDuration: "1430ms",
  },
  {
    id: "front-center-left-b",
    asset: "leaf-2.webp",
    layer: "front",
    x: "42%",
    y: "29%",
    width: "15%",
    mobileWidth: "35%",
    rotation: "-5deg",
    scale: 0.92,
    origin: "54% 79%",
    rustleDelay: "5ms",
    rustleDuration: "400ms",
    shiftX: "0.6rem",
    shiftY: "1rem",
    shiftRotation: "8deg",
    stageTwoOpacity: 0.95,
    fallX: "3rem",
    fallY: "clamp(18rem, 40svh, 29rem)",
    fallRotation: "480deg",
    fallDelay: "380ms",
    fallDuration: "1350ms",
  },
  {
    id: "front-center",
    asset: "leaf-3.webp",
    layer: "front",
    x: "50%",
    y: "45%",
    width: "16%",
    mobileWidth: "37%",
    rotation: "12deg",
    scale: 1.09,
    origin: "47% 87%",
    rustleDelay: "105ms",
    rustleDuration: "470ms",
    shiftX: "-0.3rem",
    shiftY: "4.4rem",
    shiftRotation: "-19deg",
    stageTwoOpacity: 0.7,
    fallX: "-2rem",
    fallY: "clamp(21rem, 47svh, 32rem)",
    fallRotation: "-550deg",
    fallDelay: "60ms",
    fallDuration: "1540ms",
  },
  {
    id: "front-center-right-a",
    asset: "leaf-1.webp",
    layer: "front",
    x: "59%",
    y: "33%",
    width: "13%",
    mobileWidth: "30%",
    rotation: "-21deg",
    scale: 1.02,
    origin: "60% 85%",
    rustleDelay: "35ms",
    rustleDuration: "410ms",
    shiftX: "1.1rem",
    shiftY: "1.9rem",
    shiftRotation: "14deg",
    stageTwoOpacity: 0.88,
    fallX: "6rem",
    fallY: "clamp(19rem, 43svh, 30rem)",
    fallRotation: "390deg",
    fallDelay: "210ms",
    fallDuration: "1170ms",
  },
  {
    id: "front-center-right-b",
    asset: "leaf-2.webp",
    layer: "front",
    x: "67%",
    y: "43%",
    width: "18%",
    mobileWidth: "40%",
    rotation: "16deg",
    scale: 1.04,
    origin: "39% 78%",
    rustleDelay: "125ms",
    rustleDuration: "480ms",
    shiftX: "-0.9rem",
    shiftY: "3.3rem",
    shiftRotation: "-16deg",
    stageTwoOpacity: 0.78,
    fallX: "-5rem",
    fallY: "clamp(22rem, 49svh, 34rem)",
    fallRotation: "-470deg",
    fallDelay: "20ms",
    fallDuration: "1490ms",
  },
  {
    id: "front-right-a",
    asset: "leaf-3.webp",
    layer: "front",
    x: "76%",
    y: "30%",
    width: "13%",
    mobileWidth: "31%",
    rotation: "27deg",
    scale: 0.98,
    origin: "53% 89%",
    rustleDelay: "65ms",
    rustleDuration: "390ms",
    shiftX: "0.7rem",
    shiftY: "1.2rem",
    shiftRotation: "10deg",
    stageTwoOpacity: 0.94,
    fallX: "4rem",
    fallY: "clamp(18rem, 39svh, 28rem)",
    fallRotation: "450deg",
    fallDelay: "310ms",
    fallDuration: "1280ms",
  },
  {
    id: "front-right-b",
    asset: "leaf-1.webp",
    layer: "front",
    x: "84%",
    y: "40%",
    width: "14%",
    mobileWidth: "33%",
    rotation: "-13deg",
    scale: 1.07,
    origin: "45% 82%",
    rustleDelay: "20ms",
    rustleDuration: "440ms",
    shiftX: "-1.1rem",
    shiftY: "2.9rem",
    shiftRotation: "-17deg",
    stageTwoOpacity: 0.8,
    fallX: "-6rem",
    fallY: "clamp(20rem, 45svh, 31rem)",
    fallRotation: "-420deg",
    fallDelay: "130ms",
    fallDuration: "1370ms",
  },
  {
    id: "front-right-c",
    asset: "leaf-2.webp",
    layer: "front",
    x: "92%",
    y: "33%",
    width: "16%",
    mobileWidth: "37%",
    rotation: "9deg",
    scale: 0.96,
    origin: "61% 80%",
    rustleDelay: "95ms",
    rustleDuration: "460ms",
    shiftX: "0.9rem",
    shiftY: "2rem",
    shiftRotation: "12deg",
    stageTwoOpacity: 0.86,
    fallX: "5rem",
    fallY: "clamp(19rem, 42svh, 30rem)",
    fallRotation: "500deg",
    fallDelay: "250ms",
    fallDuration: "1450ms",
  },
  {
    id: "front-edge-right",
    asset: "leaf-3.webp",
    layer: "front",
    x: "101%",
    y: "43%",
    width: "15%",
    mobileWidth: "34%",
    rotation: "-24deg",
    scale: 1.05,
    origin: "38% 86%",
    rustleDelay: "40ms",
    rustleDuration: "420ms",
    shiftX: "1.3rem",
    shiftY: "3.5rem",
    shiftRotation: "18deg",
    stageTwoOpacity: 0.74,
    fallX: "7rem",
    fallY: "clamp(21rem, 47svh, 33rem)",
    fallRotation: "540deg",
    fallDelay: "80ms",
    fallDuration: "1520ms",
  },
  {
    id: "front-low-left",
    asset: "leaf-2.webp",
    layer: "front",
    x: "20%",
    y: "55%",
    width: "14%",
    mobileWidth: "34%",
    rotation: "31deg",
    scale: 0.88,
    origin: "42% 73%",
    rustleDelay: "145ms",
    rustleDuration: "490ms",
    shiftX: "-0.6rem",
    shiftY: "4.8rem",
    shiftRotation: "-22deg",
    stageTwoOpacity: 0.68,
    fallX: "-3rem",
    fallY: "clamp(18rem, 38svh, 27rem)",
    fallRotation: "-330deg",
    fallDelay: "170ms",
    fallDuration: "1190ms",
  },
  {
    id: "front-low-right",
    asset: "leaf-1.webp",
    layer: "front",
    x: "73%",
    y: "56%",
    width: "12%",
    mobileWidth: "30%",
    rotation: "-29deg",
    scale: 0.9,
    origin: "58% 76%",
    rustleDelay: "155ms",
    rustleDuration: "500ms",
    shiftX: "0.8rem",
    shiftY: "5.2rem",
    shiftRotation: "24deg",
    stageTwoOpacity: 0.65,
    fallX: "4rem",
    fallY: "clamp(18rem, 37svh, 27rem)",
    fallRotation: "360deg",
    fallDelay: "290ms",
    fallDuration: "1250ms",
  },
] as const;

function getLeafStyle(leaf: LeafConfig): LeafStyle {
  return {
    "--leaf-x": leaf.x,
    "--leaf-y": leaf.y,
    "--leaf-width": leaf.width,
    "--leaf-mobile-width": leaf.mobileWidth,
    "--leaf-rotation": leaf.rotation,
    "--leaf-scale": leaf.scale,
    "--leaf-origin": leaf.origin,
    "--leaf-rustle-delay": leaf.rustleDelay,
    "--leaf-rustle-duration": leaf.rustleDuration,
    "--leaf-shift-x": leaf.shiftX,
    "--leaf-shift-y": leaf.shiftY,
    "--leaf-shift-rotation": leaf.shiftRotation,
    "--leaf-stage-two-opacity": leaf.stageTwoOpacity,
    "--leaf-fall-x": leaf.fallX,
    "--leaf-fall-y": leaf.fallY,
    "--leaf-fall-rotation": leaf.fallRotation,
    "--leaf-fall-delay": leaf.fallDelay,
    "--leaf-fall-duration": leaf.fallDuration,
  };
}

function CanopyLeaf({ leaf }: { leaf: LeafConfig }) {
  const asset = LEAF_ASSETS[leaf.asset];

  return (
    <Image
      src={`${ASSET_PATH}/${leaf.asset}`}
      alt=""
      width={asset.width}
      height={asset.height}
      sizes="(max-width: 760px) 40vw, 18vw"
      unoptimized
      draggable={false}
      className={`${styles.leaf} ${
        leaf.layer === "rear" ? styles.rearLeaf : styles.frontLeaf
      }`}
      style={getLeafStyle(leaf)}
    />
  );
}

function ForestCharacter({ character }: { character: CharacterConfig }) {
  return (
    <Image
      src={`${ASSET_PATH}/${character.asset}`}
      alt=""
      width={2048}
      height={2048}
      sizes="(max-width: 760px) 31vw, (max-width: 1100px) 18vw, 15vw"
      unoptimized
      draggable={false}
      data-character={character.asset}
      className={`${styles.character} ${
        character.layer === "rear"
          ? styles.rearCharacter
          : styles.frontCharacter
      }`}
      style={character.style}
    />
  );
}

export function TracksSection() {
  const [revealStage, setRevealStage] = useState<RevealStage>(0);
  const revealStageRef = useRef<RevealStage>(0);
  const pendingActivationsRef = useRef(0);
  const isSettlingRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);
  const revealCopy = REVEAL_COPY[revealStage];

  function processNextStage() {
    if (
      isSettlingRef.current ||
      pendingActivationsRef.current === 0 ||
      revealStageRef.current === 3
    ) {
      return;
    }

    pendingActivationsRef.current -= 1;
    const nextStage = NEXT_STAGE[revealStageRef.current];
    revealStageRef.current = nextStage;
    setRevealStage(nextStage);

    if (nextStage !== 1 && nextStage !== 2) return;

    isSettlingRef.current = true;
    const settleDelay = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 140
      : STAGE_SETTLE_MS[nextStage];
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      isSettlingRef.current = false;
      processNextStage();
    }, settleDelay);
  }

  function handleReveal() {
    const queuedStage = revealStageRef.current + pendingActivationsRef.current;

    if (queuedStage >= 3) return;

    pendingActivationsRef.current += 1;
    processNextStage();
  }

  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    [],
  );

  return (
    <section
      id="tracks"
      className={styles.tracksSection}
      aria-labelledby="tracks-title"
    >
      <h2 id="tracks-title" className={styles.title}>
        Tracks
      </h2>

      <p id="tracks-reveal-hint" className={styles.revealHint}>
        {revealCopy.hint}
      </p>

      <div className={styles.canopyComposition}>
        <button
          type="button"
          className={styles.canopyButton}
          data-stage={revealStage}
          aria-label={revealCopy.label}
          aria-describedby="tracks-reveal-hint tracks-reveal-status"
          aria-disabled={revealStage === 3}
          onClick={handleReveal}
        >
          <span className={styles.scene} aria-hidden="true">
            {LEAVES.filter((leaf) => leaf.layer === "rear").map((leaf) => (
              <CanopyLeaf key={leaf.id} leaf={leaf} />
            ))}

            {CHARACTERS.filter((character) => character.layer === "rear").map(
              (character) => (
                <ForestCharacter key={character.asset} character={character} />
              ),
            )}

            <Image
              src={`${ASSET_PATH}/branch-3.webp`}
              alt=""
              width={2202}
              height={722}
              sizes="(max-width: 760px) 180vw, 110vw"
              unoptimized
              draggable={false}
              className={styles.branch}
            />

            {CHARACTERS.filter((character) => character.layer === "front").map(
              (character) => (
                <ForestCharacter key={character.asset} character={character} />
              ),
            )}

            {LEAVES.filter((leaf) => leaf.layer === "front").map((leaf) => (
              <CanopyLeaf key={leaf.id} leaf={leaf} />
            ))}
          </span>
        </button>

        <ul className={styles.hangingTracks} aria-label="Hackathon tracks">
          {TRACKS.map((track) => (
            <li key={track} className={styles.hangingTrack}>
              <span className={styles.trackPaper}>{track}</span>
            </li>
          ))}
        </ul>
      </div>
      <span
        id="tracks-reveal-status"
        className={styles.srOnly}
        role="status"
        aria-live="polite"
      >
        {revealCopy.status}
      </span>
    </section>
  );
}
