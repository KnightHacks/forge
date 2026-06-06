"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

const WISP_COLORS = [
  {
    core: "rgba(246, 255, 255, 0.92)",
    glow: "rgba(119, 238, 255, 0.76)",
    edge: "rgba(45, 167, 255, 0.34)",
  },
  {
    core: "rgba(235, 251, 255, 0.9)",
    glow: "rgba(100, 201, 255, 0.72)",
    edge: "rgba(131, 118, 255, 0.3)",
  },
  {
    core: "rgba(244, 255, 239, 0.88)",
    glow: "rgba(142, 255, 218, 0.68)",
    edge: "rgba(55, 211, 255, 0.3)",
  },
] as const;

interface CursorWisp {
  id: number;
  x: number;
  y: number;
  size: number;
  driftX: number;
  driftY: number;
  rotate: number;
  core: string;
  glow: string;
  edge: string;
}

type WispCursorStyle = CSSProperties & {
  "--wisp-width": string;
  "--wisp-height": string;
  "--wisp-drift-x": string;
  "--wisp-drift-y": string;
  "--wisp-drift-x-mid": string;
  "--wisp-drift-y-mid": string;
  "--wisp-rotate": string;
  "--wisp-rotate-mid": string;
  "--wisp-tail-rotate": string;
  "--wisp-tail-rotate-mid": string;
  "--wisp-tail-rotate-end": string;
  "--wisp-fog-drift-x-mid": string;
  "--wisp-fog-drift-x-end": string;
  "--wisp-core": string;
  "--wisp-glow": string;
  "--wisp-edge": string;
};

export default function WispCursor() {
  const [wisps, setWisps] = useState<CursorWisp[]>([]);
  const counterRef = useRef(0);
  const lastTrailPos = useRef({ x: -200, y: -200 });
  const cleanupTimers = useRef<number[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || isCoarsePointer) {
      return;
    }

    const onMove = (event: MouseEvent) => {
      const dx = event.clientX - lastTrailPos.current.x;
      const dy = event.clientY - lastTrailPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 42) {
        return;
      }

      lastTrailPos.current = { x: event.clientX, y: event.clientY };

      const id = counterRef.current++;
      const color = WISP_COLORS[id % WISP_COLORS.length] ?? WISP_COLORS[0];
      const driftDirection = id % 2 === 0 ? 1 : -1;
      const wisp: CursorWisp = {
        id,
        x: event.clientX,
        y: event.clientY,
        size: 26 + (id % 4) * 3,
        driftX: driftDirection * (10 + (id % 5) * 3),
        driftY: -54 - (id % 4) * 10,
        rotate: driftDirection * (5 + (id % 4) * 5),
        ...color,
      };

      setWisps((currentWisps) => [...currentWisps.slice(-9), wisp]);

      const cleanupTimer = window.setTimeout(() => {
        setWisps((currentWisps) =>
          currentWisps.filter((currentWisp) => currentWisp.id !== id),
        );
      }, 1420);
      cleanupTimers.current.push(cleanupTimer);
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cleanupTimers.current.forEach((cleanupTimer) => {
        window.clearTimeout(cleanupTimer);
      });
      cleanupTimers.current = [];
    };
  }, []);

  return (
    <>
      {wisps.map((wisp) => {
        const style: WispCursorStyle = {
          left: wisp.x,
          top: wisp.y,
          "--wisp-width": `${wisp.size * 1.25}px`,
          "--wisp-height": `${wisp.size * 1.55}px`,
          "--wisp-drift-x": `${wisp.driftX}px`,
          "--wisp-drift-y": `${wisp.driftY}px`,
          "--wisp-drift-x-mid": `${wisp.driftX * 0.48}px`,
          "--wisp-drift-y-mid": `${wisp.driftY * 0.52}px`,
          "--wisp-rotate": `${wisp.rotate}deg`,
          "--wisp-rotate-mid": `${wisp.rotate * 0.55}deg`,
          "--wisp-tail-rotate": `${wisp.rotate * -1}deg`,
          "--wisp-tail-rotate-mid": `${wisp.rotate * -0.72}deg`,
          "--wisp-tail-rotate-end": `${wisp.rotate * -0.42}deg`,
          "--wisp-fog-drift-x-mid": `${wisp.driftX * -0.28}px`,
          "--wisp-fog-drift-x-end": `${wisp.driftX * -0.36}px`,
          "--wisp-core": wisp.core,
          "--wisp-glow": wisp.glow,
          "--wisp-edge": wisp.edge,
        };

        return (
          <span
            key={wisp.id}
            className="khix-cursor-wisp"
            style={style}
            aria-hidden="true"
          >
            <span className="khix-cursor-wisp-tail" aria-hidden="true" />
            <span className="khix-cursor-wisp-core" aria-hidden="true" />
          </span>
        );
      })}
    </>
  );
}
