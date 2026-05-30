"use client";

import { useEffect, useRef, useState } from "react";

const PALETTE = [
  "#fcbc4e",
  "#a8d471",
  "#fe73fe",
  "#b8d4e8",
  "#c9b8d8",
  "#f5d97a",
];

interface TrailFlower {
  id: number;
  x: number;
  y: number;
  color: string;
}

function CherryBlossomSVG({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="8" r="7" fill={color} />
      <circle cx="32" cy="14" r="7" fill={color} />
      <circle cx="32" cy="28" r="7" fill={color} />
      <circle cx="20" cy="34" r="7" fill={color} />
      <circle cx="8" cy="28" r="7" fill={color} />
      <circle cx="8" cy="14" r="7" fill={color} />
      <circle cx="20" cy="20" r="5" fill="white" opacity="0.9" />
    </svg>
  );
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
  const posRef = useRef({ x: -200, y: -200 });
  const [renderPos, setRenderPos] = useState({ x: -200, y: -200 });
  const [trail, setTrail] = useState<TrailFlower[]>([]);
  const counterRef = useRef(0);
  const lastTrailPos = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };

      const dx = e.clientX - lastTrailPos.current.x;
      const dy = e.clientY - lastTrailPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 36) {
        lastTrailPos.current = { x: e.clientX, y: e.clientY };
        const id = counterRef.current++;
        const color = PALETTE[id % PALETTE.length]!;
        setTrail((prev) => [
          ...prev.slice(-14),
          { id, x: e.clientX, y: e.clientY, color },
        ]);
        setTimeout(() => {
          setTrail((prev) => prev.filter((f) => f.id !== id));
        }, 900);
      }
    };

    const tick = () => {
      setRenderPos({ ...posRef.current });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div
        className="pointer-events-none fixed z-[99999] select-none"
        style={{
          left: renderPos.x,
          top: renderPos.y,
          transform: "translate(-50%, -50%)",
          width: "2.2rem",
          height: "2.2rem",
          willChange: "left, top",
        }}
        aria-hidden="true"
      >
        <CherryBlossomSVG color="#fe73fe" size={35} />
      </div>

      {trail.map((f) => (
        <span
          key={f.id}
          className="cursor-trail-flower"
          style={{
            left: f.x,
            top: f.y,
            transform: "translate(-50%, -50%)",
            width: "1.6rem",
            height: "1.6rem",
            display: "inline-block",
          }}
          aria-hidden="true"
        >
          <TrailFlowerSVG color={f.color} size={26} />
        </span>
      ))}
    </>
  );
}
