import type { ApplicationVisualConfig, BackgroundSize } from "./types";

const KHIX_SCENE_SIZE = {
  height: 2250,
  width: 12000,
} satisfies BackgroundSize;

export const khixApplicationBackground = {
  key: "khix",
  label: "KHIX forest walk",
  baseLayerId: "khix-flat",
  layers: [
    {
      id: "khix-flat",
      kind: "image",
      nativeSize: KHIX_SCENE_SIZE,
      src: "/hackbackgrounds/khix/FLAT_khix-reg-bg.png",
      space: "scene",
      zIndex: 0,
    },
    {
      id: "khix-lenny",
      animatedSrc: "/hackbackgrounds/khix/lennyAnim_connected.png?v=8fps",
      className:
        "khix-lenny bottom-[4svh] left-1/2 w-[clamp(17rem,58vw,24rem)] -translate-x-1/2 sm:bottom-[3svh] sm:w-[clamp(20rem,46vw,29rem)] sm:translate-y-[1%] md:bottom-[-3svh] md:w-[clamp(22rem,34vw,31rem)] md:translate-y-[8%] lg:bottom-[8svh] lg:w-[min(28vw,21rem)] lg:translate-y-0 [@media_(orientation:landscape)_and_(max-height:560px)]:bottom-[-10svh] [@media_(orientation:landscape)_and_(max-height:560px)]:left-[58%] [@media_(orientation:landscape)_and_(max-height:560px)]:w-[clamp(15rem,27vw,20rem)] [@media_(orientation:landscape)_and_(max-height:560px)]:translate-y-[10%]",
      idleSrc: "/hackbackgrounds/khix/lennyIdle.png?v=8fps",
      kind: "image",
      mediaClassName: "h-auto w-full select-none",
      mediaStyle: {
        filter: "saturate(1.08) drop-shadow(0 18px 28px rgba(0,0,0,0.38))",
      },
      motion: {
        facesStepDirection: true,
        turnDurationMs: 260,
      },
      nativeSize: {
        height: 960,
        width: 740,
      },
      src: "/hackbackgrounds/khix/lennyIdle.png?v=8fps",
      space: "viewport",
      zIndex: 1,
    },
    {
      id: "khix-foreground",
      kind: "image",
      nativeSize: KHIX_SCENE_SIZE,
      src: "/hackbackgrounds/khix/FOREGROUND_khix-reg-bg.png",
      space: "scene",
      zIndex: 2,
    },
  ],
  mode: "dynamic",
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(8,4,14,0.76)_0%,rgba(8,4,14,0.54)_45%,rgba(8,4,14,0.3)_100%)]",
  questionTransitionMs: 900,
  showStockEffects: false,
  stepTransitionMs: 1500,
  transitionMs: 1500,
} satisfies ApplicationVisualConfig;
