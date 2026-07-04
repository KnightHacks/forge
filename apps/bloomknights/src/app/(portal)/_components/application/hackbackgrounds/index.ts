import type { ApplicationVisualConfig } from "./types";
import { bloomknightsApplicationBackground } from "./bloomknights";

export const DEFAULT_APPLICATION_VISUAL = {
  key: "default",
  label: "Stock purple",
  mode: "dynamic",
  showStockEffects: true,
} satisfies ApplicationVisualConfig;

export type HackerApplicationBackgroundKey = "bloomknights";

export const HACKER_APPLICATION_BACKGROUNDS = {
  bloomknights: bloomknightsApplicationBackground,
} satisfies Record<HackerApplicationBackgroundKey, ApplicationVisualConfig>;

function isHackerApplicationBackgroundKey(
  backgroundKey: string,
): backgroundKey is HackerApplicationBackgroundKey {
  return backgroundKey === "bloomknights";
}

export function getHackerApplicationBackgroundKey(
  backgroundKey?: string | null,
): HackerApplicationBackgroundKey | null {
  if (!backgroundKey) return null;
  if (isHackerApplicationBackgroundKey(backgroundKey)) return backgroundKey;

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
