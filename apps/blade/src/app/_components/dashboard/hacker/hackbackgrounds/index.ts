import { HACKATHONS } from "@forge/consts";

import type { ApplicationVisualConfig } from "./types";
import { bloomknightsApplicationBackground } from "./bloomknights";
import { khixApplicationBackground } from "./khix";

export const DEFAULT_APPLICATION_VISUAL = {
  key: "default",
  label: "Stock purple",
  mode: "dynamic",
  showStockEffects: true,
} satisfies ApplicationVisualConfig;

const HACKER_APPLICATION_BACKGROUND_REGISTRY = {
  bloomknights: bloomknightsApplicationBackground,
  khix: khixApplicationBackground,
} satisfies Record<
  HACKATHONS.ApplicationBackgroundKey,
  ApplicationVisualConfig
>;

export type HackerApplicationBackgroundKey =
  HACKATHONS.ApplicationBackgroundKey;

export const HACKER_APPLICATION_BACKGROUNDS: Record<
  HackerApplicationBackgroundKey,
  ApplicationVisualConfig
> = HACKER_APPLICATION_BACKGROUND_REGISTRY;

export const HACKER_APPLICATION_BACKGROUND_OPTIONS =
  HACKATHONS.APPLICATION_BACKGROUND_OPTIONS;

function isHackerApplicationBackgroundKey(
  backgroundKey: string,
): backgroundKey is HackerApplicationBackgroundKey {
  return HACKATHONS.APPLICATION_BACKGROUND_KEYS.includes(
    backgroundKey as HackerApplicationBackgroundKey,
  );
}

export function getHackerApplicationBackgroundKey(
  backgroundKey?: string | null,
): HackerApplicationBackgroundKey | null {
  if (!backgroundKey) return null;
  if (isHackerApplicationBackgroundKey(backgroundKey)) return backgroundKey;

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
