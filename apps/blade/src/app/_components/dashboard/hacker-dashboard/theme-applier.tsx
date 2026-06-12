"use client";

import { useEffect } from "react";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";

function hexToHsl(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;
  // Parse hex
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

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
