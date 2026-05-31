import { HACKATHONS } from "@forge/consts";

import type { ApplicationVisualConfig } from "./types";
import { khixApplicationBackground } from "./khix";

export const DEFAULT_APPLICATION_VISUAL = {
  key: "default",
  label: "Stock purple",
  mode: "dynamic",
  showStockEffects: true,
} satisfies ApplicationVisualConfig;

const HACKER_APPLICATION_BACKGROUND_REGISTRY = {
  [khixApplicationBackground.key]: khixApplicationBackground,
} satisfies Record<string, ApplicationVisualConfig>;

export type HackerApplicationBackgroundKey =
  keyof typeof HACKER_APPLICATION_BACKGROUND_REGISTRY;

export const HACKER_APPLICATION_BACKGROUNDS: Record<
  string,
  ApplicationVisualConfig
> = HACKER_APPLICATION_BACKGROUND_REGISTRY;

export const HACKER_APPLICATION_BACKGROUND_OPTIONS =
  HACKATHONS.APPLICATION_BACKGROUND_OPTIONS;

export function getHackerApplicationBackground(backgroundKey?: string | null) {
  if (!backgroundKey) return DEFAULT_APPLICATION_VISUAL;

  return (
    HACKER_APPLICATION_BACKGROUNDS[backgroundKey] ?? DEFAULT_APPLICATION_VISUAL
  );
}

export type { ApplicationVisualConfig, ApplicationVisualLayer } from "./types";
