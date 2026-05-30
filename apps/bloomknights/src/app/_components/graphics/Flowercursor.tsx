"use client";

import { useEffect, useRef, useState } from "react";

const PALETTE = [
  "#fcbc4e",
  "#a8d471",
  "#fe73fe",
  "#b8d4e8",
  "#c9b8d8",
  "#f5d97a",
] as const;

interface TrailFlower {
  id: number;
  x: number;
  y: number;
  color: string;
}

function TrailFlowerSVG({ color, size }: { color: string; size: number }) {
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

export default function FlowerCursor() {
  const [trail, setTrail] = useState<TrailFlower[]>([]);
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

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastTrailPos.current.x;
      const dy = e.clientY - lastTrailPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 36) {
        lastTrailPos.current = { x: e.clientX, y: e.clientY };
        const id = counterRef.current++;
        const color = PALETTE[id % PALETTE.length] ?? PALETTE[0];
        setTrail((prev) => [
          ...prev.slice(-14),
          { id, x: e.clientX, y: e.clientY, color },
        ]);
        const cleanupTimer = window.setTimeout(() => {
          setTrail((prev) => prev.filter((f) => f.id !== id));
        }, 900);
        cleanupTimers.current.push(cleanupTimer);
      }
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
      {trail.map((f) => (
        <span
          key={f.id}
          className="cursor-trail-flower"
          style={{
            left: f.x,
            top: f.y,
            transform: "translate(-50%, -50%)",
            width: "1.1rem",
            height: "1.1rem",
            display: "inline-block",
          }}
          aria-hidden="true"
        >
          <TrailFlowerSVG color={f.color} size={18} />
        </span>
      ))}
    </>
  );
}
