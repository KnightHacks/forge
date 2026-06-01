import type { ApplicationVisualConfig, BackgroundSize } from "./types";

const BLOOMKNIGHTS_SCENE_SIZE = {
  height: 2250,
  width: 12000,
} satisfies BackgroundSize;

const BLOOMKNIGHTS_APPLICATION_WEBP =
  "https://assets.knighthacks.org/bloomknightsApplication.webp";

export const bloomknightsApplicationBackground = {
  key: "bloomknights",
  label: "BloomKnights mountain meadow",
  baseLayerId: "bloomknights-meadow",
  layers: [
    {
      id: "bloomknights-meadow",
      alt: "Watercolor mountain meadow for BloomKnights",
      kind: "image",
      nativeSize: BLOOMKNIGHTS_SCENE_SIZE,
      sources: [
        {
          mimeType: "image/webp",
          src: BLOOMKNIGHTS_APPLICATION_WEBP,
        },
      ],
      src: BLOOMKNIGHTS_APPLICATION_WEBP,
      space: "scene",
      zIndex: 0,
    },
  ],
  mode: "dynamic",
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(5,18,22,0.74)_0%,rgba(8,32,42,0.5)_48%,rgba(8,23,31,0.28)_100%)]",
  questionTransitionMs: 420,
  showStockEffects: false,
  stepTransitionMs: 560,
  transitionMs: 560,
} satisfies ApplicationVisualConfig;
