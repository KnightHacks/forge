"use client";

import { useEffect, useRef, useState } from "react";

const FLOWER_COLORS = [
  "#fcbc4e",
  "#a8d471",
  "#fe73fe",
  "#b8d4e8",
  "#c9b8d8",
  "#f5d97a",
] as const;

const FLOWER_LIFETIME_MS = 650;
const MAX_FLOWERS = 15;
const MIN_DISTANCE_BETWEEN_FLOWERS = 36;

interface TrailFlower {
  color: (typeof FLOWER_COLORS)[number];
  id: number;
  x: number;
  y: number;
}

function TrailFlowerSvg({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="20" cy="7" rx="4.5" ry="7" fill={color} />
      <ellipse
        cx="20"
        cy="7"
        rx="4.5"
        ry="7"
        fill={color}
        transform="rotate(60 20 20)"
      />
      <ellipse
        cx="20"
        cy="7"
        rx="4.5"
        ry="7"
        fill={color}
        transform="rotate(120 20 20)"
      />
      <ellipse
        cx="20"
        cy="7"
        rx="4.5"
        ry="7"
        fill={color}
        transform="rotate(180 20 20)"
      />
      <ellipse
        cx="20"
        cy="7"
        rx="4.5"
        ry="7"
        fill={color}
        transform="rotate(240 20 20)"
      />
      <ellipse
        cx="20"
        cy="7"
        rx="4.5"
        ry="7"
        fill={color}
        transform="rotate(300 20 20)"
      />
      <circle cx="20" cy="20" r="5.5" fill="white" opacity="0.9" />
    </svg>
  );
}

export function BloomKnightsFlowerCursor() {
  const [trail, setTrail] = useState<TrailFlower[]>([]);
  const counterRef = useRef(0);
  const lastTrailPositionRef = useRef({ x: -200, y: -200 });
  const cleanupTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || isCoarsePointer) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - lastTrailPositionRef.current.x;
      const dy = event.clientY - lastTrailPositionRef.current.y;

      if (Math.hypot(dx, dy) <= MIN_DISTANCE_BETWEEN_FLOWERS) {
        return;
      }

      lastTrailPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      const id = counterRef.current++;
      const color =
        FLOWER_COLORS[id % FLOWER_COLORS.length] ?? FLOWER_COLORS[0];

      setTrail((currentTrail) => [
        ...currentTrail.slice(-(MAX_FLOWERS - 1)),
        {
          color,
          id,
          x: event.clientX,
          y: event.clientY,
        },
      ]);

      const cleanupTimer = window.setTimeout(() => {
        setTrail((currentTrail) =>
          currentTrail.filter((flower) => flower.id !== id),
        );
      }, FLOWER_LIFETIME_MS);

      cleanupTimersRef.current.push(cleanupTimer);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cleanupTimersRef.current.forEach((cleanupTimer) => {
        window.clearTimeout(cleanupTimer);
      });
      cleanupTimersRef.current = [];
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes bkFlowerCursorPop {
          0% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }

          32% {
            opacity: 0.38;
            transform: translate(-50%, -70%) scale(1.2) rotate(90deg);
          }

          100% {
            opacity: 0;
            transform: translate(-50%, -110%) scale(0.5) rotate(200deg);
          }
        }

        .bk-cursor-flower {
          position: fixed;
          pointer-events: none;
          z-index: 99998;
          display: inline-block;
          width: 1.1rem;
          height: 1.1rem;
          transform-origin: center center;
          user-select: none;
          animation: bkFlowerCursorPop ${FLOWER_LIFETIME_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce), (pointer: coarse) {
          .bk-cursor-flower {
            display: none;
          }
        }
      `}</style>
      {trail.map((flower) => (
        <span
          key={flower.id}
          aria-hidden="true"
          className="bk-cursor-flower"
          style={{
            left: flower.x,
            top: flower.y,
          }}
        >
          <TrailFlowerSvg color={flower.color} size={18} />
        </span>
      ))}
    </>
  );
}
