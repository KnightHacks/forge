"use client";

import { useEffect, useState } from "react";

interface Petal {
  id: number;
  left: string;
  size: string;
  duration: string;
  delay: string;
  color: string;
  type: "cherry" | "daisy" | "tulip" | "clover" | "star";
}

const PALETTE = [
  "#fcbc4e",
  "#a8d471",
  "#fe73fe",
  "#fdc0fd",
  "#dae494",
  "#b8d4e8",
  "#c9b8d8",
  "#a8c490",
  "#c4a882",
  "#f5d97a",
];

function FlowerSVG({
  type,
  color,
  size,
}: {
  type: Petal["type"];
  color: string;
  size: number;
}) {
  switch (type) {
    case "cherry":
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
    case "daisy":
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
            transform="rotate(45 20 20)"
          />
          <ellipse
            cx="20"
            cy="7"
            rx="4.5"
            ry="7"
            fill={color}
            transform="rotate(90 20 20)"
          />
          <ellipse
            cx="20"
            cy="7"
            rx="4.5"
            ry="7"
            fill={color}
            transform="rotate(135 20 20)"
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
            transform="rotate(225 20 20)"
          />
          <ellipse
            cx="20"
            cy="7"
            rx="4.5"
            ry="7"
            fill={color}
            transform="rotate(270 20 20)"
          />
          <ellipse
            cx="20"
            cy="7"
            rx="4.5"
            ry="7"
            fill={color}
            transform="rotate(315 20 20)"
          />
          <circle cx="20" cy="20" r="6" fill="white" opacity="0.95" />
        </svg>
      );
    case "tulip":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 4 C13 4 9 10 9 16 C9 22 13 26 20 28 C27 26 31 22 31 16 C31 10 27 4 20 4Z"
            fill={color}
          />
          <path
            d="M14 14 C10 8 6 6 8 14 C10 19 14 22 20 24"
            fill={color}
            opacity="0.7"
          />
          <path
            d="M26 14 C30 8 34 6 32 14 C30 19 26 22 20 24"
            fill={color}
            opacity="0.7"
          />
          <line
            x1="20"
            y1="28"
            x2="20"
            y2="38"
            stroke="#a8c490"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M20 33 C17 30 13 31 14 34"
            stroke="#a8c490"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "clover":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="20" cy="12" r="8" fill={color} />
          <circle cx="28" cy="24" r="8" fill={color} />
          <circle cx="12" cy="24" r="8" fill={color} />
          <line
            x1="20"
            y1="28"
            x2="20"
            y2="38"
            stroke="#a8c490"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "star":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 3 L23.5 14.5 L36 14.5 L25.5 22 L29 33.5 L20 26.5 L11 33.5 L14.5 22 L4 14.5 L16.5 14.5 Z"
            fill={color}
          />
        </svg>
      );
  }
}

const TYPES: Petal["type"][] = ["cherry", "daisy", "tulip", "clover", "star"];

export default function FloatingFlowers() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    const generated: Petal[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 97}%`,
      size: `${(1.6 + Math.random() * 1.6) * 16}px`,
      duration: `${11 + Math.random() * 13}s`,
      delay: `${Math.random() * 14}s`,
      color: PALETTE[i % PALETTE.length]!,
      type: TYPES[i % TYPES.length]!,
    }));
    setPetals(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {petals.map((p) => (
        <div
          key={p.id}
          className="petal select-none"
          style={{
            left: p.left,
            top: "-70px",
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: 0,
          }}
          aria-hidden="true"
        >
          <FlowerSVG type={p.type} color={p.color} size={parseInt(p.size)} />
        </div>
      ))}
    </div>
  );
}
