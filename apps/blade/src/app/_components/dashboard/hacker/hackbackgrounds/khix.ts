import type { ApplicationVisualConfig, BackgroundSize } from "./types";

const KHIX_SCENE_SIZE = {
  height: 2250,
  width: 12000,
} satisfies BackgroundSize;

const KHIX_FLAT_WEBP = "https://assets.knighthacks.org/khix-flat.webp";
const KHIX_FOREGROUND_WEBP =
  "https://assets.knighthacks.org/khix-foreground.webp";
const KHIX_LENNY_ANIM_WEBP =
  "https://assets.knighthacks.org/khix-lenny-anim.webp";
const KHIX_LENNY_IDLE_WEBP =
  "https://assets.knighthacks.org/khix-lenny-idle.webp";

export const khixApplicationStyles = `
@keyframes khixForestMistDrift {
  0%, 100% { transform: translate3d(-3.8%, 1.4%, 0) scale(1.04); }
  34% { transform: translate3d(2.5%, -2.2%, 0) scale(1.1); }
  68% { transform: translate3d(5.4%, 0.9%, 0) scale(1.07); }
}

@keyframes khixCalmCanopyBreeze {
  0%, 100% { transform: translate3d(-0.35%, 0, 0) skewX(-0.5deg); }
  50% { transform: translate3d(0.5%, -0.35%, 0) skewX(0.8deg); }
}

@keyframes khixCalmLeafDrift {
  0% { transform: translate3d(-0.5%, 0.6%, 0) rotate(-1deg); }
  45% { transform: translate3d(0.8%, -0.9%, 0) rotate(4deg); }
  100% { transform: translate3d(1.2%, 0.3%, 0) rotate(7deg); }
}

@keyframes khixMagicVeil {
  0%, 100% { transform: translate3d(-0.2%, 0, 0) scale(0.98); }
  50% { transform: translate3d(0.35%, -0.45%, 0) scale(1.015); }
}

@keyframes khixArcaneSmokeFlow {
  0%, 100% { transform: translate3d(-0.25%, 0.35%, 0) scale(0.99); }
  50% { transform: translate3d(0.35%, -0.55%, 0) scale(1.02); }
}

@keyframes khixSpookyWispThread {
  0%, 100% { transform: translate3d(-0.35%, 0.55%, 0) scale(0.98); }
  38% { transform: translate3d(0.5%, -0.75%, 0) scale(1.025); }
  72% { transform: translate3d(0.8%, 0.1%, 0) scale(1.005); }
}

@keyframes khixSpookyShadowCrawl {
  0%, 100% { transform: translate3d(0.55%, 0.25%, 0) scaleX(0.98); }
  50% { transform: translate3d(-0.45%, -0.35%, 0) scaleX(1.02); }
}

.kh-application-shell[data-application-visual="khix"] .kh-step-content :is(input, textarea) {
  border-color: rgba(255, 255, 255, 0.42);
}

.kh-application-shell[data-application-visual="khix"] .kh-step-content :is(input, textarea):focus-visible {
  border-color: rgba(255, 255, 255, 0.78);
}

.kh-application-shell[data-application-visual="khix"] .kh-resume-info-trigger {
  border-color: rgba(226, 255, 151, 0.48);
  background: rgba(226, 255, 151, 0.12);
  color: rgba(245, 255, 196, 0.9);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.26),
    0 0 18px rgba(216, 255, 134, 0.18);
}

.kh-application-shell[data-application-visual="khix"] .kh-resume-info-trigger:hover,
.kh-application-shell[data-application-visual="khix"] .kh-resume-info-trigger:focus-visible,
.kh-application-shell[data-application-visual="khix"] .kh-resume-info-trigger[data-state="open"] {
  border-color: rgba(245, 255, 183, 0.78);
  background: rgba(229, 255, 147, 0.2);
  color: white;
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.32),
    0 0 26px rgba(218, 255, 133, 0.34);
}

.kh-resume-info-popover[data-application-visual="khix"] {
  border-color: rgba(227, 255, 151, 0.24);
  background: rgba(12, 23, 16, 0.96);
  color: rgba(247, 255, 214, 0.92);
  box-shadow:
    0 18px 62px rgba(0, 0, 0, 0.45),
    0 0 32px rgba(208, 255, 122, 0.18);
}

.khix-forest-ambient {
  backface-visibility: hidden;
  pointer-events: none;
  overflow: hidden;
  contain: paint;
  transform: translateZ(0);
}

.khix-forest-ambient::before,
.khix-forest-ambient::after {
  backface-visibility: hidden;
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform: translateZ(0);
  will-change: transform;
}

.khix-normal-forest-mist::before {
  background:
    radial-gradient(ellipse at 8% 48%, rgba(221, 242, 176, 0.18) 0, rgba(221, 242, 176, 0.09) 14%, rgba(221, 242, 176, 0.03) 28%, transparent 48%),
    radial-gradient(ellipse at 19% 58%, rgba(132, 187, 119, 0.16) 0, rgba(132, 187, 119, 0.08) 16%, rgba(132, 187, 119, 0.03) 32%, transparent 52%),
    radial-gradient(ellipse at 31% 44%, rgba(118, 182, 168, 0.12) 0, rgba(118, 182, 168, 0.06) 16%, transparent 46%),
    radial-gradient(ellipse at 52% 45%, rgba(65, 155, 135, 0.1) 0, rgba(65, 155, 135, 0.05) 18%, transparent 48%);
  filter: none;
  opacity: 0.42;
  animation: khixForestMistDrift 20s ease-in-out infinite;
}

.khix-normal-forest-mist::after {
  background:
    radial-gradient(ellipse at 7% 74%, rgba(205, 232, 147, 0.2) 0, rgba(205, 232, 147, 0.1) 12%, rgba(205, 232, 147, 0.04) 24%, transparent 42%),
    radial-gradient(ellipse at 18% 70%, rgba(135, 190, 124, 0.18) 0, rgba(135, 190, 124, 0.09) 14%, rgba(135, 190, 124, 0.03) 28%, transparent 46%),
    radial-gradient(ellipse at 38% 76%, rgba(229, 218, 152, 0.14) 0, rgba(229, 218, 152, 0.07) 14%, transparent 42%),
    radial-gradient(ellipse at 58% 74%, rgba(94, 133, 93, 0.12) 0, rgba(94, 133, 93, 0.06) 18%, transparent 48%);
  filter: none;
  opacity: 0.5;
  animation: khixForestMistDrift 17s ease-in-out infinite reverse;
}

.khix-calm-canopy-breeze::before {
  background:
    radial-gradient(ellipse at 8% 11%, rgba(255, 244, 155, 0.12) 0, rgba(255, 244, 155, 0.06) 8%, transparent 24%),
    radial-gradient(ellipse at 17% 9%, rgba(140, 215, 105, 0.12) 0, rgba(140, 215, 105, 0.06) 10%, transparent 28%),
    radial-gradient(ellipse at 26% 18%, rgba(255, 236, 145, 0.08) 0, rgba(255, 236, 145, 0.04) 12%, transparent 30%);
  opacity: 0.38;
  animation: khixCalmCanopyBreeze 13s ease-in-out infinite;
}

.khix-calm-canopy-breeze::after {
  background:
    radial-gradient(ellipse at 13% 27%, rgba(255, 237, 145, 0.12) 0, rgba(255, 237, 145, 0.05) 10%, transparent 30%),
    radial-gradient(ellipse at 25% 32%, rgba(214, 255, 162, 0.11) 0, rgba(214, 255, 162, 0.05) 10%, transparent 30%);
  opacity: 0.32;
  animation: khixCalmCanopyBreeze 17s ease-in-out infinite reverse;
}

.khix-calm-leaf-drift::before,
.khix-calm-leaf-drift::after {
  background:
    radial-gradient(ellipse at 7% 41%, rgba(231, 245, 136, 0.56) 0, rgba(231, 245, 136, 0.56) 0.1rem, transparent 0.42rem),
    radial-gradient(ellipse at 14% 52%, rgba(156, 215, 107, 0.48) 0, rgba(156, 215, 107, 0.48) 0.1rem, transparent 0.4rem),
    radial-gradient(ellipse at 23% 39%, rgba(238, 215, 116, 0.44) 0, rgba(238, 215, 116, 0.44) 0.09rem, transparent 0.36rem),
    radial-gradient(ellipse at 31% 58%, rgba(165, 223, 112, 0.42) 0, rgba(165, 223, 112, 0.42) 0.1rem, transparent 0.38rem);
  filter: drop-shadow(0 0 6px rgba(218, 242, 130, 0.24));
  opacity: 0.5;
  animation: khixCalmLeafDrift 15s ease-in-out infinite;
}

.khix-calm-leaf-drift::after {
  opacity: 0.64;
  animation-duration: 19s;
  animation-delay: -8s;
}

.khix-normal-forest-fireflies::before,
.khix-normal-forest-fireflies::after {
  background:
    radial-gradient(circle at 9% 58%, rgba(255, 255, 215, 1) 0, rgba(255, 255, 178, 1) 0.16rem, rgba(229, 255, 132, 0.68) 0.45rem, transparent 1rem),
    radial-gradient(circle at 18% 72%, rgba(255, 246, 159, 1) 0, rgba(255, 236, 123, 1) 0.14rem, rgba(255, 216, 89, 0.58) 0.4rem, transparent 0.92rem),
    radial-gradient(circle at 31% 42%, rgba(237, 255, 189, 1) 0, rgba(221, 255, 145, 1) 0.14rem, rgba(178, 255, 110, 0.56) 0.39rem, transparent 0.9rem),
    radial-gradient(circle at 48% 66%, rgba(255, 255, 210, 1) 0, rgba(255, 248, 164, 1) 0.16rem, rgba(224, 255, 132, 0.62) 0.44rem, transparent 0.98rem),
    radial-gradient(circle at 67% 51%, rgba(255, 247, 164, 1) 0, rgba(255, 237, 121, 1) 0.15rem, rgba(255, 215, 88, 0.58) 0.42rem, transparent 0.94rem);
  filter: drop-shadow(0 0 8px rgba(255, 252, 176, 0.9)) drop-shadow(0 0 22px rgba(219, 255, 128, 0.58));
  opacity: 1;
  will-change: auto;
}

.khix-normal-forest-fireflies::after {
  background:
    radial-gradient(circle at 13% 36%, rgba(240, 255, 198, 1) 0, rgba(223, 255, 151, 1) 0.13rem, rgba(181, 255, 112, 0.52) 0.36rem, transparent 0.84rem),
    radial-gradient(circle at 39% 83%, rgba(255, 242, 151, 1) 0, rgba(255, 228, 108, 1) 0.14rem, rgba(255, 207, 83, 0.54) 0.38rem, transparent 0.88rem),
    radial-gradient(circle at 56% 35%, rgba(255, 255, 207, 1) 0, rgba(255, 250, 162, 1) 0.14rem, rgba(222, 255, 130, 0.56) 0.39rem, transparent 0.9rem),
    radial-gradient(circle at 75% 76%, rgba(238, 255, 189, 1) 0, rgba(221, 255, 145, 1) 0.13rem, rgba(178, 255, 110, 0.52) 0.36rem, transparent 0.84rem),
    radial-gradient(circle at 90% 43%, rgba(255, 244, 153, 1) 0, rgba(255, 231, 111, 1) 0.14rem, rgba(255, 211, 85, 0.54) 0.38rem, transparent 0.88rem);
  filter: drop-shadow(0 0 7px rgba(255, 248, 157, 0.82)) drop-shadow(0 0 19px rgba(211, 255, 122, 0.5));
  opacity: 1;
}

.khix-magic-glowing-gems::before {
  background:
    radial-gradient(ellipse at 55% 77%, rgba(178, 255, 232, 0.86) 0, rgba(178, 255, 232, 0.86) 0.14rem, rgba(74, 255, 226, 0.42) 0.32rem, transparent 1.1rem),
    radial-gradient(ellipse at 64% 68%, rgba(222, 167, 255, 0.8) 0, rgba(222, 167, 255, 0.8) 0.16rem, rgba(142, 92, 255, 0.38) 0.4rem, transparent 1.2rem),
    radial-gradient(ellipse at 73% 84%, rgba(100, 249, 221, 0.82) 0, rgba(100, 249, 221, 0.82) 0.14rem, rgba(64, 205, 255, 0.34) 0.34rem, transparent 1.1rem),
    radial-gradient(ellipse at 83% 62%, rgba(181, 140, 255, 0.78) 0, rgba(181, 140, 255, 0.78) 0.15rem, rgba(100, 73, 255, 0.34) 0.36rem, transparent 1.14rem),
    radial-gradient(ellipse at 94% 78%, rgba(111, 246, 255, 0.78) 0, rgba(111, 246, 255, 0.78) 0.14rem, rgba(54, 210, 230, 0.34) 0.34rem, transparent 1.1rem);
  filter: drop-shadow(0 0 8px rgba(99, 255, 224, 0.3));
  opacity: 0.68;
  will-change: auto;
}

.khix-magic-glowing-gems::after {
  background:
    radial-gradient(ellipse at 58% 74%, rgba(226, 255, 251, 0.42) 0, rgba(226, 255, 251, 0.2) 7%, transparent 20%),
    radial-gradient(ellipse at 70% 61%, rgba(235, 203, 255, 0.38) 0, rgba(235, 203, 255, 0.18) 7%, transparent 22%),
    radial-gradient(ellipse at 83% 75%, rgba(175, 255, 244, 0.36) 0, rgba(175, 255, 244, 0.17) 7%, transparent 22%);
  filter: none;
  opacity: 0.5;
  will-change: auto;
}

.khix-magic-spore-glints::before {
  background:
    radial-gradient(circle at 57% 69%, rgba(142, 255, 236, 0.82) 0, rgba(142, 255, 236, 0.82) 0.08rem, rgba(92, 232, 255, 0.32) 0.3rem, transparent 0.74rem),
    radial-gradient(circle at 64% 50%, rgba(218, 164, 255, 0.72) 0, rgba(218, 164, 255, 0.72) 0.08rem, rgba(137, 83, 255, 0.28) 0.28rem, transparent 0.68rem),
    radial-gradient(circle at 72% 73%, rgba(115, 255, 231, 0.78) 0, rgba(115, 255, 231, 0.78) 0.07rem, rgba(78, 217, 255, 0.28) 0.26rem, transparent 0.62rem),
    radial-gradient(circle at 82% 41%, rgba(196, 132, 255, 0.68) 0, rgba(196, 132, 255, 0.68) 0.08rem, rgba(135, 87, 255, 0.26) 0.28rem, transparent 0.68rem),
    radial-gradient(circle at 91% 58%, rgba(235, 187, 255, 0.66) 0, rgba(235, 187, 255, 0.66) 0.07rem, rgba(160, 91, 255, 0.22) 0.26rem, transparent 0.66rem);
  filter: drop-shadow(0 0 7px rgba(126, 246, 255, 0.26));
  opacity: 0.62;
  will-change: auto;
}

.khix-magic-spore-glints::after {
  background:
    radial-gradient(ellipse at 58% 25%, rgba(112, 255, 241, 0.18) 0, rgba(112, 255, 241, 0.08) 8%, transparent 26%),
    radial-gradient(circle at 67% 64%, rgba(255, 226, 168, 0.62) 0, rgba(255, 226, 168, 0.62) 0.06rem, transparent 0.28rem),
    radial-gradient(ellipse at 78% 42%, rgba(184, 112, 255, 0.16) 0, rgba(184, 112, 255, 0.07) 8%, transparent 28%),
    radial-gradient(circle at 88% 70%, rgba(110, 245, 255, 0.6) 0, rgba(110, 245, 255, 0.6) 0.06rem, transparent 0.28rem);
  filter: none;
  opacity: 0.5;
  will-change: auto;
}

.khix-arcane-smoke-pool::before {
  background:
    radial-gradient(ellipse at 58% 64%, rgba(85, 244, 231, 0.28) 0, rgba(85, 244, 231, 0.13) 9%, rgba(85, 244, 231, 0.04) 19%, transparent 34%),
    radial-gradient(ellipse at 73% 54%, rgba(171, 101, 255, 0.24) 0, rgba(171, 101, 255, 0.11) 10%, rgba(171, 101, 255, 0.03) 20%, transparent 35%),
    radial-gradient(ellipse at 91% 62%, rgba(91, 225, 255, 0.2) 0, rgba(91, 225, 255, 0.1) 10%, rgba(91, 225, 255, 0.03) 22%, transparent 38%);
  filter: none;
  opacity: 0.7;
  animation: khixArcaneSmokeFlow 12s ease-in-out infinite;
}

.khix-arcane-smoke-pool::after {
  background:
    radial-gradient(ellipse at 56% 78%, rgba(118, 255, 235, 0.24) 0, rgba(118, 255, 235, 0.11) 10%, rgba(118, 255, 235, 0.03) 20%, transparent 36%),
    radial-gradient(ellipse at 70% 75%, rgba(216, 143, 255, 0.22) 0, rgba(216, 143, 255, 0.1) 10%, rgba(216, 143, 255, 0.03) 20%, transparent 36%),
    radial-gradient(ellipse at 88% 77%, rgba(95, 226, 255, 0.2) 0, rgba(95, 226, 255, 0.09) 10%, rgba(95, 226, 255, 0.03) 20%, transparent 36%);
  filter: none;
  opacity: 0.62;
  animation: khixArcaneSmokeFlow 15s ease-in-out infinite reverse;
}

.khix-spooky-magic-wisps::before {
  background:
    radial-gradient(ellipse at 58% 60%, rgba(112, 255, 239, 0.22) 0, rgba(112, 255, 239, 0.1) 10%, rgba(112, 255, 239, 0.03) 20%, transparent 36%),
    radial-gradient(ellipse at 70% 43%, rgba(195, 135, 255, 0.23) 0, rgba(195, 135, 255, 0.1) 10%, rgba(195, 135, 255, 0.03) 22%, transparent 38%),
    radial-gradient(ellipse at 84% 58%, rgba(93, 239, 214, 0.18) 0, rgba(93, 239, 214, 0.08) 10%, rgba(93, 239, 214, 0.03) 20%, transparent 36%);
  filter: none;
  opacity: 0.62;
  animation: khixMagicVeil 11s ease-in-out infinite;
}

.khix-spooky-magic-wisps::after {
  background:
    radial-gradient(ellipse at 75% 30%, rgba(115, 255, 244, 0.12) 0, rgba(115, 255, 244, 0.06) 10%, transparent 30%),
    radial-gradient(ellipse at 91% 62%, rgba(162, 88, 255, 0.14) 0, rgba(162, 88, 255, 0.07) 12%, transparent 32%);
  filter: none;
  opacity: 0.4;
  animation: khixSpookyWispThread 12s ease-in-out infinite reverse;
}

.khix-spooky-shadow-crawl::before {
  background:
    radial-gradient(ellipse at 68% 56%, rgba(12, 4, 34, 0.22) 0, rgba(12, 4, 34, 0.1) 10%, rgba(12, 4, 34, 0.03) 22%, transparent 40%),
    radial-gradient(ellipse at 82% 46%, rgba(29, 7, 57, 0.2) 0, rgba(29, 7, 57, 0.09) 10%, rgba(29, 7, 57, 0.03) 22%, transparent 40%),
    radial-gradient(ellipse at 95% 73%, rgba(5, 20, 37, 0.2) 0, rgba(5, 20, 37, 0.09) 10%, rgba(5, 20, 37, 0.03) 22%, transparent 40%);
  filter: none;
  opacity: 0.3;
  animation: khixSpookyShadowCrawl 14s ease-in-out infinite;
}

.khix-spooky-shadow-crawl::after {
  background:
    radial-gradient(ellipse at 71% 76%, rgba(18, 5, 42, 0.16) 0, rgba(18, 5, 42, 0.08) 10%, rgba(18, 5, 42, 0.02) 22%, transparent 40%),
    radial-gradient(ellipse at 92% 78%, rgba(9, 30, 48, 0.16) 0, rgba(9, 30, 48, 0.08) 10%, rgba(9, 30, 48, 0.02) 22%, transparent 40%);
  filter: none;
  opacity: 0.28;
  animation: khixSpookyShadowCrawl 18s ease-in-out infinite reverse;
}

@media (prefers-reduced-motion: reduce) {
  .khix-normal-forest-mist::before,
  .khix-normal-forest-mist::after,
  .khix-calm-canopy-breeze::before,
  .khix-calm-canopy-breeze::after,
  .khix-calm-leaf-drift::before,
  .khix-calm-leaf-drift::after,
  .khix-normal-forest-fireflies::before,
  .khix-normal-forest-fireflies::after,
  .khix-magic-glowing-gems::before,
  .khix-magic-glowing-gems::after,
  .khix-magic-spore-glints::before,
  .khix-magic-spore-glints::after,
  .khix-arcane-smoke-pool::before,
  .khix-arcane-smoke-pool::after,
  .khix-spooky-magic-wisps::before,
  .khix-spooky-magic-wisps::after,
  .khix-spooky-shadow-crawl::before,
  .khix-spooky-shadow-crawl::after {
    animation: none;
  }
}
`;

export const khixApplicationBackground = {
  key: "khix",
  label: "KHIX forest walk",
  ambientLayers: [
    {
      id: "khix-normal-forest-mist",
      className: "khix-forest-ambient khix-normal-forest-mist",
      space: "scene",
      style: {
        contain: "layout style",
        overflow: "visible",
      },
      zIndex: 1,
    },
    {
      id: "khix-calm-canopy-breeze",
      className: "khix-forest-ambient khix-calm-canopy-breeze",
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-calm-leaf-drift",
      className: "khix-forest-ambient khix-calm-leaf-drift",
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-normal-forest-fireflies",
      className: "khix-forest-ambient khix-normal-forest-fireflies",
      space: "scene",
      zIndex: 4,
    },
    {
      id: "khix-magic-glowing-gems",
      className: "khix-forest-ambient khix-magic-glowing-gems",
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-magic-spore-glints",
      className: "khix-forest-ambient khix-magic-spore-glints",
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-arcane-smoke-pool",
      className: "khix-forest-ambient khix-arcane-smoke-pool",
      space: "scene",
      style: {
        contain: "layout style",
        overflow: "visible",
      },
      zIndex: 1,
    },
    {
      id: "khix-spooky-magic-wisps",
      className: "khix-forest-ambient khix-spooky-magic-wisps",
      space: "scene",
      style: {
        contain: "layout style",
        overflow: "visible",
      },
      zIndex: 1,
    },
    {
      id: "khix-spooky-shadow-crawl",
      className: "khix-forest-ambient khix-spooky-shadow-crawl",
      space: "scene",
      style: {
        contain: "layout style",
        overflow: "visible",
      },
      zIndex: 1,
    },
  ],
  baseLayerId: "khix-flat",
  layers: [
    {
      id: "khix-flat",
      kind: "image",
      nativeSize: KHIX_SCENE_SIZE,
      sources: [
        {
          mimeType: "image/webp",
          src: KHIX_FLAT_WEBP,
        },
      ],
      src: KHIX_FLAT_WEBP,
      space: "scene",
      zIndex: 0,
    },
    {
      id: "khix-lenny",
      animatedSrc: KHIX_LENNY_ANIM_WEBP,
      className:
        "khix-lenny bottom-[4svh] left-1/2 w-[clamp(17rem,58vw,24rem)] -translate-x-1/2 sm:bottom-[3svh] sm:w-[clamp(20rem,46vw,29rem)] sm:translate-y-[1%] md:bottom-[-3svh] md:w-[clamp(22rem,34vw,31rem)] md:translate-y-[8%] lg:bottom-[8svh] lg:w-[min(28vw,21rem)] lg:translate-y-0 [@media_(orientation:landscape)_and_(max-height:560px)]:bottom-[-10svh] [@media_(orientation:landscape)_and_(max-height:560px)]:left-[58%] [@media_(orientation:landscape)_and_(max-height:560px)]:w-[clamp(15rem,27vw,20rem)] [@media_(orientation:landscape)_and_(max-height:560px)]:translate-y-[10%]",
      idleSrc: KHIX_LENNY_IDLE_WEBP,
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
      src: KHIX_LENNY_IDLE_WEBP,
      space: "viewport",
      zIndex: 2,
    },
    {
      id: "khix-foreground",
      kind: "image",
      nativeSize: KHIX_SCENE_SIZE,
      sources: [
        {
          mimeType: "image/webp",
          src: KHIX_FOREGROUND_WEBP,
        },
      ],
      src: KHIX_FOREGROUND_WEBP,
      space: "scene",
      zIndex: 3,
    },
  ],
  mode: "dynamic",
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(8,4,14,0.76)_0%,rgba(8,4,14,0.54)_45%,rgba(8,4,14,0.3)_100%)]",
  questionTransitionMs: 900,
  showStockEffects: false,
  stepTransitionMs: 1500,
  styles: khixApplicationStyles,
  transitionMs: 1500,
} satisfies ApplicationVisualConfig;
