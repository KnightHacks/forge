"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { AssetCredit } from "../../assets";
import styles from "./LennyBlink.module.css";

const FRAME_COUNT = 19;
const frameSources = Array.from(
  { length: FRAME_COUNT },
  (_, index) => `/faq/lennyblink/Frame ${index + 1}.png`,
);

interface LennyBlinkProps {
  className?: string;
}

export function LennyBlink({ className }: LennyBlinkProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const advanceFrame = (currentFrame: number) => {
      const delay = currentFrame === 0 ? 2200 : currentFrame === 18 ? 240 : 65;

      timeoutId = setTimeout(() => {
        const nextFrame = (currentFrame + 1) % FRAME_COUNT;
        setFrameIndex(nextFrame);
        advanceFrame(nextFrame);
      }, delay);
    };

    advanceFrame(0);

    return () => clearTimeout(timeoutId);
  }, []);

  const rootClassName = className
    ? `${styles.lenny} ${className}`
    : styles.lenny;

  return (
    <AssetCredit
      className={rootClassName}
      label="Animation by"
      credits={[{ name: "Knight Hacks Design Team" }]}
    >
      <span className={styles.frameStack}>
        {frameSources.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={index === 0 ? "Lenny the Knight Hacks dragon blinking" : ""}
            width={2667}
            height={3318}
            className={styles.frame}
            loading={index === 0 ? undefined : "eager"}
            data-active={index === frameIndex ? "true" : undefined}
            aria-hidden={index === 0 ? undefined : true}
            priority={index === 0}
            unoptimized
          />
        ))}
      </span>
    </AssetCredit>
  );
}
