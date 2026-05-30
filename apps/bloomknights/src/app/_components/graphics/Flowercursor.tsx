"use client";

import { useEffect, useRef, useState } from "react";

const TRAIL_FLOWERS = ["🌸", "🌺", "🌼", "🌷", "🌻", "✿"];

interface TrailFlower {
  id: number;
  x: number;
  y: number;
  emoji: string;
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
        const emoji = TRAIL_FLOWERS[id % TRAIL_FLOWERS.length]!;
        setTrail((prev) => [
          ...prev.slice(-14),
          { id, x: e.clientX, y: e.clientY, emoji },
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
          fontSize: "2rem",
          lineHeight: 1,
          willChange: "left, top",
        }}
        aria-hidden="true"
      >
        🌸
      </div>

      {trail.map((f) => (
        <span
          key={f.id}
          className="cursor-trail-flower"
          style={{
            left: f.x,
            top: f.y,
            transform: "translate(-50%, -50%)",
            fontSize: "1.4rem",
          }}
          aria-hidden="true"
        >
          {f.emoji}
        </span>
      ))}
    </>
  );
}
