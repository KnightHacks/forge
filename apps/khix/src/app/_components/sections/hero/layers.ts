export const HERO_ASSET_BASE_PATH = "/KHIXHero";

export interface HeroLayer {
  filename: string;
  depthX: number;
  depthY: number;
  scrollY: number;
  scale: number;
  motionRole?: "glow" | "pond" | "tk" | "waterfall";
}

export const HERO_LAYERS: HeroLayer[] = [
  {
    filename: "optimized/7_bg.webp",
    depthX: -10,
    depthY: -4,
    scrollY: -16,
    scale: 1.002,
  },
  {
    filename: "optimized/6_bg.webp",
    depthX: -8,
    depthY: -3.2,
    scrollY: -14,
    scale: 1.002,
  },
  {
    filename: "optimized/5_bg.webp",
    depthX: -5.5,
    depthY: -2.4,
    scrollY: -10,
    scale: 1.002,
  },
  {
    filename: "optimized/4_bg.webp",
    depthX: 5,
    depthY: 2.4,
    scrollY: -6,
    scale: 1.001,
  },
  {
    filename: "optimized/pond.webp",
    depthX: 14,
    depthY: 7,
    scrollY: 12,
    scale: 1.001,
    motionRole: "pond",
  },
  {
    filename: "optimized/3_tree_and_waterfall.webp",
    depthX: 18,
    depthY: 9,
    scrollY: 16,
    scale: 1.001,
  },
  {
    filename: "optimized/waterfall.webp",
    depthX: 18,
    depthY: 9,
    scrollY: 16,
    scale: 1.001,
    motionRole: "waterfall",
  },
  {
    filename: "optimized/2_tk.webp",
    depthX: 24,
    depthY: 12,
    scrollY: 20,
    scale: 1.001,
    motionRole: "tk",
  },
  {
    filename: "optimized/tk_glow_alone.webp",
    depthX: 24,
    depthY: 12,
    scrollY: 20,
    scale: 1.001,
    motionRole: "glow",
  },
  {
    filename: "optimized/1_front.webp",
    depthX: 30,
    depthY: 15,
    scrollY: 24,
    scale: 1,
  },
];
