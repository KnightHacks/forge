"use client";

import { useEffect } from "react";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function HackathonThemeApplier({
  hackathon,
}: {
  hackathon: SelectHackathon | null;
}) {
  useEffect(() => {
    if (!hackathon) return;

    const theme: Record<string, string> = {};

    if (hackathon.backgroundColor) {
      theme["--background"] = hexToHsl(hackathon.backgroundColor);
    }
    if (hackathon.foregroundColor) {
      theme["--foreground"] = hexToHsl(hackathon.foregroundColor);
    }
    if (hackathon.accentColor) {
      theme["--primary"] = hexToHsl(hackathon.accentColor);
      theme["--ring"] = hexToHsl(hackathon.accentColor);
    }
    if (hackathon.backgroundImageName) {
      theme["--background-image"] = `url(${hackathon.backgroundImageName})`;
    }

    Object.entries(theme).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });

    return () => {
      Object.keys(theme).forEach((k) => {
        document.documentElement.style.removeProperty(k);
      });
    };
  }, [hackathon]);

  return null;
}
