export const HERO_ASSET_BASE_PATH = "/assets";

export interface HeroLayer {
  filename: string;
  width?: number;
  height?: number;
  depthX: number;
  depthY: number;
  scrollY: number;
  scale: number;
  motionRole?: "foreground" | "glow" | "pond" | "tk" | "waterfall";
}

export const HERO_LAYERS: HeroLayer[] = [
  {
    filename: "hero-7_bg.webp",
    depthX: -10,
    depthY: -4,
    scrollY: -16,
    scale: 1.002,
  },
  {
    filename: "hero-6_bg.webp",
    depthX: -8,
    depthY: -3.2,
    scrollY: -14,
    scale: 1.002,
  },
  {
    filename: "hero-5_bg.webp",
    depthX: -5.5,
    depthY: -2.4,
    scrollY: -10,
    scale: 1.002,
  },
  {
    filename: "hero-4_bg.webp",
    depthX: 5,
    depthY: 2.4,
    scrollY: -6,
    scale: 1.001,
  },
  {
    filename: "hero-pond.webp",
    depthX: 14,
    depthY: 7,
    scrollY: 12,
    scale: 1.001,
    motionRole: "pond",
  },
  {
    filename: "hero-3_tree_and_waterfall.webp",
    depthX: 18,
    depthY: 9,
    scrollY: 16,
    scale: 1.001,
  },
  {
    filename: "hero-waterfall.webp",
    depthX: 18,
    depthY: 9,
    scrollY: 16,
    scale: 1.001,
    motionRole: "waterfall",
  },
  {
    filename: "hero-2_tk.webp",
    depthX: 24,
    depthY: 12,
    scrollY: 20,
    scale: 1.001,
    motionRole: "tk",
  },
  {
    filename: "hero-tk_glow_alone.webp",
    depthX: 24,
    depthY: 12,
    scrollY: 20,
    scale: 1.001,
    motionRole: "glow",
  },
];
