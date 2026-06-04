export * as KNIGHT_HACKS_8 from "./kh8";

export const APPLICATION_BACKGROUND_OPTIONS = [
  {
    key: "bloomknights",
    label: "BloomKnights mountain meadow",
  },
  {
    key: "khix",
    label: "KHIX forest walk",
  },
] as const;

export type ApplicationBackgroundKey =
  (typeof APPLICATION_BACKGROUND_OPTIONS)[number]["key"];

export const APPLICATION_BACKGROUND_KEYS = APPLICATION_BACKGROUND_OPTIONS.map(
  (background) => background.key,
) as [ApplicationBackgroundKey, ...ApplicationBackgroundKey[]];

export const SPONSOR_VIDEO_LINK =
  "https://www.youtube.com/embed/OU1q02v1Vrw?si=dyHSQCmxzcau7-mF";
export const SPONSOR_VIDEO_LINK_2 =
  "https://www.youtube.com/embed/OzW_4QeCfM0?si=G8SUf8UbEo2W5MnL";
