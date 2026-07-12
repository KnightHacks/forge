import type { ApplicationVisualConfig } from "./types";
import { khixApplicationBackground } from "./khix";

export const DEFAULT_APPLICATION_VISUAL = {
  key: "default",
  label: "Stock purple",
  mode: "dynamic",
  showStockEffects: true,
} satisfies ApplicationVisualConfig;

export type HackerApplicationBackgroundKey = "khix";

export const HACKER_APPLICATION_BACKGROUNDS = {
  khix: khixApplicationBackground,
} satisfies Record<HackerApplicationBackgroundKey, ApplicationVisualConfig>;

function isHackerApplicationBackgroundKey(
  backgroundKey: string,
): backgroundKey is HackerApplicationBackgroundKey {
  return backgroundKey === "khix";
}

export function getHackerApplicationBackgroundKey(
  backgroundKey?: string | null,
): HackerApplicationBackgroundKey | null {
  if (!backgroundKey) return null;
  if (isHackerApplicationBackgroundKey(backgroundKey)) return backgroundKey;

  if (backgroundKey === "knighthacksix") return "khix";
  if (backgroundKey === "knight-hacks-ix") return "khix";

  return null;
}

export function getHackerApplicationBackground(
  backgroundKey?: string | null,
): ApplicationVisualConfig {
  const applicationBackgroundKey =
    getHackerApplicationBackgroundKey(backgroundKey);

  if (!applicationBackgroundKey) {
    return DEFAULT_APPLICATION_VISUAL;
  }

  return HACKER_APPLICATION_BACKGROUNDS[applicationBackgroundKey];
}

export type { ApplicationVisualConfig, ApplicationVisualLayer } from "./types";
