"use client";

import { useEffect, useState } from "react";

const FLOWERS = ["🌸", "🌺", "🌼", "🌻", "🌷", "🍀", "🌿", "✿"];

interface Petal {
  id: number;
  emoji: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
}

export default function FloatingFlowers() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    const generated: Petal[] = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      emoji: FLOWERS[i % FLOWERS.length]!,
      left: `${Math.random() * 98}%`,
      size: `${1.2 + Math.random() * 1.4}rem`,
      duration: `${10 + Math.random() * 14}s`,
      delay: `${Math.random() * 12}s`,
    }));
    setPetals(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal select-none"
          style={{
            left: p.left,
            top: "-60px",
            fontSize: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: 0,
          }}
          aria-hidden="true"
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
