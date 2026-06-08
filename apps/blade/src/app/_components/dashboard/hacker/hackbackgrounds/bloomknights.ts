import type { ApplicationVisualConfig, BackgroundSize } from "./types";

const BLOOMKNIGHTS_SCENE_SIZE = {
  height: 2250,
  width: 12000,
} satisfies BackgroundSize;

const BLOOMKNIGHTS_APPLICATION_WEBP =
  "https://assets.knighthacks.org/bloomknightsApplication.webp";
const BLOOMKNIGHTS_APPLICATION_TABLET_WEBP =
  "https://assets.knighthacks.org/bloomknights-application-6400.webp";

const BLOOMKNIGHTS_BIRD_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 36'%3E%3Cpath d='M4 26c17-24 31-24 44 0 13-24 27-24 44 0' fill='none' stroke='%23eff8ff' stroke-width='7' stroke-linecap='round'/%3E%3Cpath d='M4 26c17-24 31-24 44 0 13-24 27-24 44 0' fill='none' stroke='%232c5b62' stroke-width='3' stroke-linecap='round' opacity='.45'/%3E%3C/svg%3E";

export const bloomknightsApplicationStyles = `
@keyframes khBloomLeafFieldA {
  0%, 100% { transform: translate3d(-0.35rem, 2vh, 0) rotate(-24deg) scale(1); }
  42% { transform: translate3d(1.45rem, -8vh, 0) rotate(86deg) scale(1.18); }
  72% { transform: translate3d(-1.1rem, 9vh, 0) rotate(154deg) scale(0.96); }
}

@keyframes khBloomLeafFieldB {
  0%, 100% { transform: translate3d(0.4rem, 3vh, 0) rotate(22deg) scale(1.05); }
  38% { transform: translate3d(-1.6rem, -9vh, 0) rotate(-88deg) scale(0.94); }
  76% { transform: translate3d(1.2rem, 10vh, 0) rotate(-166deg) scale(1.2); }
}

@keyframes khBloomBirdGlideA {
  0% { transform: translate3d(-12vw, 0, 0) scale(0.42); }
  50% { transform: translate3d(22vw, -2vh, 0) scale(0.46); }
  100% { transform: translate3d(52vw, 1vh, 0) scale(0.42); }
}

@keyframes khBloomBirdGlideB {
  0% { transform: translate3d(18vw, 0, 0) scaleX(-1) scale(0.48); }
  52% { transform: translate3d(-12vw, 2vh, 0) scaleX(-1) scale(0.44); }
  100% { transform: translate3d(-42vw, -1vh, 0) scaleX(-1) scale(0.48); }
}

@keyframes khBloomBirdGlideC {
  0% { transform: translate3d(-22vw, 1vh, 0) scale(0.34); }
  46% { transform: translate3d(16vw, -1.5vh, 0) scale(0.38); }
  100% { transform: translate3d(46vw, 0, 0) scale(0.34); }
}

@keyframes khBloomBirdGlideD {
  0% { transform: translate3d(30vw, -1vh, 0) scaleX(-1) scale(0.32); }
  54% { transform: translate3d(-8vw, 1.5vh, 0) scaleX(-1) scale(0.36); }
  100% { transform: translate3d(-38vw, 0, 0) scaleX(-1) scale(0.32); }
}

@keyframes khBloomGodrayDrift {
  0%, 100% { transform: translate3d(-1.2%, 0.4%, 0) rotate(-2deg) scale(1); }
  46% { transform: translate3d(1.1%, -0.8%, 0) rotate(1.5deg) scale(1.035); }
}

@keyframes khBloomSunMistDrift {
  0%, 100% { transform: translate3d(0.8%, 0.6%, 0) scale(1); }
  52% { transform: translate3d(-1%, -0.9%, 0) scale(1.045); }
}

form[data-application-visual="bloomknights"],
.kh-application-shell[data-application-visual="bloomknights"] {
  background-color: #0f2f32;
  background-image:
    linear-gradient(90deg, rgba(5, 18, 22, 0.36), rgba(8, 32, 42, 0.18)),
    image-set(
      url("${BLOOMKNIGHTS_APPLICATION_TABLET_WEBP}") type("image/webp"),
      url("${BLOOMKNIGHTS_APPLICATION_WEBP}") type("image/webp")
    );
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-readable-text {
  text-shadow:
    0 1px 8px rgba(14, 54, 35, 0.34),
    0 1px 1px rgba(14, 54, 35, 0.32);
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-step-title {
  text-shadow:
    0 3px 18px rgba(10, 54, 34, 0.28),
    0 1px 1px rgba(10, 54, 34, 0.35);
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-nav-button {
  box-shadow: 0 10px 26px rgba(10, 44, 30, 0.28);
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-nav-button:hover:not(:disabled) {
  box-shadow: 0 14px 34px rgba(10, 44, 30, 0.34);
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-resume-info-trigger {
  border-color: rgba(239, 248, 255, 0.62);
  background: rgba(239, 248, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(14, 54, 35, 0.18);
}

.kh-application-shell[data-application-visual="bloomknights"] .kh-resume-info-trigger:hover,
.kh-application-shell[data-application-visual="bloomknights"] .kh-resume-info-trigger:focus-visible,
.kh-application-shell[data-application-visual="bloomknights"] .kh-resume-info-trigger[data-state="open"] {
  border-color: rgba(255, 255, 255, 0.86);
  background: rgba(255, 255, 255, 0.28);
  color: white;
  box-shadow: 0 11px 28px rgba(10, 44, 30, 0.28);
}

.kh-resume-info-popover[data-application-visual="bloomknights"] {
  border-color: rgba(220, 242, 226, 0.34);
  background: rgba(18, 59, 43, 0.95);
  color: rgba(245, 255, 249, 0.94);
  box-shadow: 0 18px 54px rgba(10, 44, 30, 0.34);
}

.kh-bloom-birds {
  pointer-events: none;
  width: clamp(2.4rem, 5vw, 4.25rem);
  filter: drop-shadow(0 4px 7px rgba(19, 74, 78, 0.14));
  will-change: transform;
}

.kh-bloom-godrays {
  backface-visibility: hidden;
  pointer-events: none;
  transform: translateZ(0);
}

.kh-bloom-godrays::before,
.kh-bloom-godrays::after {
  backface-visibility: hidden;
  content: "";
  position: absolute;
  pointer-events: none;
  will-change: transform;
}

.kh-bloom-godrays::before {
  left: 31%;
  top: -5%;
  width: 46%;
  height: 73%;
  background:
    linear-gradient(104deg, transparent 4%, rgba(255, 248, 204, 0.3) 17%, transparent 28%),
    linear-gradient(111deg, transparent 20%, rgba(255, 243, 181, 0.23) 38%, transparent 54%),
    linear-gradient(96deg, transparent 45%, rgba(255, 255, 231, 0.2) 60%, transparent 74%),
    radial-gradient(ellipse at 54% 8%, rgba(255, 252, 219, 0.34) 0, rgba(255, 244, 192, 0.18) 34%, transparent 72%);
  filter: blur(8px);
  -webkit-mask-image: radial-gradient(ellipse at 50% 18%, black 0 50%, transparent 84%);
  mask-image: radial-gradient(ellipse at 50% 18%, black 0 50%, transparent 84%);
  opacity: 0.72;
  animation: khBloomGodrayDrift 22s ease-in-out infinite;
}

.kh-bloom-godrays::after {
  left: 36%;
  top: 19%;
  width: 38%;
  height: 54%;
  background:
    radial-gradient(ellipse at 50% 8%, rgba(255, 250, 216, 0.26) 0, rgba(255, 241, 184, 0.12) 28%, transparent 68%),
    radial-gradient(ellipse at 48% 70%, rgba(178, 227, 198, 0.16) 0, rgba(178, 227, 198, 0.08) 34%, transparent 74%);
  filter: blur(13px);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0 46%, transparent 84%);
  mask-image: radial-gradient(ellipse at center, black 0 46%, transparent 84%);
  opacity: 0.6;
  animation: khBloomSunMistDrift 26s ease-in-out infinite reverse;
}

.kh-bloom-leaf-field {
  backface-visibility: hidden;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
  contain: paint;
  clip-path: inset(48% 0 -8% 0);
  transform: translateZ(0);
}

.kh-bloom-leaf-field::before,
.kh-bloom-leaf-field::after {
  backface-visibility: hidden;
  content: "";
  position: absolute;
  width: clamp(1.1rem, 1.45vw, 2.2rem);
  aspect-ratio: 42 / 24;
  border-radius: 100% 0 100% 0;
  background:
    linear-gradient(135deg, rgba(244, 238, 140, 0.78), rgba(113, 157, 74, 0.48)),
    linear-gradient(145deg, transparent 44%, rgba(70, 105, 48, 0.5) 47%, transparent 52%);
  filter: drop-shadow(0 4px 7px rgba(38, 82, 43, 0.14));
  transform-origin: center;
  transform: translateZ(0);
  will-change: transform;
}

.kh-bloom-leaves-a::before {
  left: 8%;
  top: 64%;
  animation: khBloomLeafFieldA 25s ease-in-out infinite;
}

.kh-bloom-leaves-a::after {
  left: 22%;
  top: 76%;
  width: clamp(0.95rem, 1.2vw, 1.85rem);
  animation: khBloomLeafFieldB 30s ease-in-out infinite;
  animation-delay: -7s;
}

.kh-bloom-leaves-b::before {
  left: 38%;
  top: 68%;
  width: clamp(1rem, 1.22vw, 1.9rem);
  animation: khBloomLeafFieldB 28s ease-in-out infinite;
  animation-delay: -10s;
}

.kh-bloom-leaves-b::after {
  left: 51%;
  top: 83%;
  width: clamp(0.9rem, 1.05vw, 1.7rem);
  animation: khBloomLeafFieldA 32s ease-in-out infinite;
  animation-delay: -16s;
}

.kh-bloom-leaves-c::before {
  left: 64%;
  top: 62%;
  width: clamp(1.05rem, 1.35vw, 2.05rem);
  animation: khBloomLeafFieldA 29s ease-in-out infinite;
  animation-delay: -13s;
}

.kh-bloom-leaves-c::after {
  left: 78%;
  top: 74%;
  width: clamp(0.92rem, 1.12vw, 1.75rem);
  animation: khBloomLeafFieldB 34s ease-in-out infinite;
  animation-delay: -21s;
}

.kh-bloom-leaves-d::before {
  left: 88%;
  top: 66%;
  width: clamp(0.98rem, 1.18vw, 1.85rem);
  animation: khBloomLeafFieldB 31s ease-in-out infinite;
  animation-delay: -18s;
}

.kh-bloom-leaves-d::after {
  left: 93%;
  top: 86%;
  width: clamp(0.82rem, 0.98vw, 1.55rem);
  animation: khBloomLeafFieldA 36s ease-in-out infinite;
  animation-delay: -24s;
}

.kh-bloom-leaves-e::before {
  left: 13%;
  top: 87%;
  width: clamp(0.9rem, 1.08vw, 1.7rem);
  animation: khBloomLeafFieldB 33s ease-in-out infinite;
  animation-delay: -20s;
}

.kh-bloom-leaves-e::after {
  left: 31%;
  top: 59%;
  width: clamp(1.02rem, 1.28vw, 1.95rem);
  animation: khBloomLeafFieldA 27s ease-in-out infinite;
  animation-delay: -12s;
}

.kh-bloom-leaves-f::before {
  left: 45%;
  top: 90%;
  width: clamp(0.86rem, 1vw, 1.6rem);
  animation: khBloomLeafFieldA 35s ease-in-out infinite;
  animation-delay: -26s;
}

.kh-bloom-leaves-f::after {
  left: 58%;
  top: 57%;
  width: clamp(1.08rem, 1.38vw, 2.1rem);
  animation: khBloomLeafFieldB 29s ease-in-out infinite;
  animation-delay: -15s;
}

.kh-bloom-leaves-g::before {
  left: 70%;
  top: 88%;
  width: clamp(0.88rem, 1.04vw, 1.65rem);
  animation: khBloomLeafFieldB 37s ease-in-out infinite;
  animation-delay: -29s;
}

.kh-bloom-leaves-g::after {
  left: 84%;
  top: 58%;
  width: clamp(1rem, 1.26vw, 1.95rem);
  animation: khBloomLeafFieldA 28s ease-in-out infinite;
  animation-delay: -19s;
}

.kh-bloom-leaves-h::before {
  left: 5%;
  top: 54%;
  width: clamp(0.94rem, 1.14vw, 1.78rem);
  animation: khBloomLeafFieldA 31s ease-in-out infinite;
  animation-delay: -23s;
}

.kh-bloom-leaves-h::after {
  left: 96%;
  top: 55%;
  width: clamp(0.9rem, 1.08vw, 1.68rem);
  animation: khBloomLeafFieldB 39s ease-in-out infinite;
  animation-delay: -31s;
}

.kh-bloom-birds-far {
  left: 9%;
  top: 9%;
  animation: khBloomBirdGlideA 40s ease-in-out infinite;
}

.kh-bloom-birds-near {
  right: 14%;
  top: 16%;
  animation: khBloomBirdGlideB 48s ease-in-out infinite;
  animation-delay: -18s;
}

.kh-bloom-birds-high {
  left: 28%;
  top: 6%;
  width: clamp(1.9rem, 3.8vw, 3.3rem);
  animation: khBloomBirdGlideC 54s ease-in-out infinite;
  animation-delay: -28s;
}

.kh-bloom-birds-mid {
  right: 30%;
  top: 22%;
  width: clamp(2rem, 4.2vw, 3.6rem);
  animation: khBloomBirdGlideD 58s ease-in-out infinite;
  animation-delay: -36s;
}

@media (prefers-reduced-motion: reduce) {
  .kh-bloom-godrays::before,
  .kh-bloom-godrays::after,
  .kh-bloom-leaf-field::before,
  .kh-bloom-leaf-field::after,
  .kh-bloom-birds {
    animation: none;
  }
}
`;

export const bloomknightsApplicationBackground = {
  key: "bloomknights",
  label: "BloomKnights mountain meadow",
  ambientLayers: [
    {
      id: "bloomknights-godrays",
      className: "kh-bloom-godrays",
      space: "viewport",
      style: {
        contain: "layout style",
        overflow: "visible",
      },
      zIndex: 2,
    },
    {
      id: "bloomknights-leaves-a",
      className: "kh-bloom-leaf-field kh-bloom-leaves-a",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-b",
      className: "kh-bloom-leaf-field kh-bloom-leaves-b",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-c",
      className: "kh-bloom-leaf-field kh-bloom-leaves-c",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-d",
      className: "kh-bloom-leaf-field kh-bloom-leaves-d",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-e",
      className: "kh-bloom-leaf-field kh-bloom-leaves-e",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-f",
      className: "kh-bloom-leaf-field kh-bloom-leaves-f",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-g",
      className: "kh-bloom-leaf-field kh-bloom-leaves-g",
      space: "scene",
      zIndex: 3,
    },
    {
      id: "bloomknights-leaves-h",
      className: "kh-bloom-leaf-field kh-bloom-leaves-h",
      space: "scene",
      zIndex: 3,
    },
  ],
  baseLayerId: "bloomknights-meadow",
  layers: [
    {
      id: "bloomknights-meadow",
      alt: "Watercolor mountain meadow for BloomKnights",
      kind: "image",
      nativeSize: BLOOMKNIGHTS_SCENE_SIZE,
      sources: [
        {
          media: "(max-height: 1440px)",
          mimeType: "image/webp",
          src: BLOOMKNIGHTS_APPLICATION_TABLET_WEBP,
        },
        {
          mimeType: "image/webp",
          src: BLOOMKNIGHTS_APPLICATION_WEBP,
        },
      ],
      src: BLOOMKNIGHTS_APPLICATION_WEBP,
      space: "scene",
      zIndex: 0,
    },
    {
      id: "bloomknights-birds-far",
      kind: "image",
      mediaClassName: "h-auto w-full",
      nativeSize: {
        height: 36,
        width: 96,
      },
      opacity: 0.72,
      src: BLOOMKNIGHTS_BIRD_SVG,
      space: "viewport",
      className: "kh-bloom-birds kh-bloom-birds-far",
      zIndex: 2,
    },
    {
      id: "bloomknights-birds-near",
      kind: "image",
      mediaClassName: "h-auto w-full",
      nativeSize: {
        height: 36,
        width: 96,
      },
      opacity: 0.62,
      src: BLOOMKNIGHTS_BIRD_SVG,
      space: "viewport",
      className: "kh-bloom-birds kh-bloom-birds-near",
      zIndex: 2,
    },
    {
      id: "bloomknights-birds-high",
      kind: "image",
      mediaClassName: "h-auto w-full",
      nativeSize: {
        height: 36,
        width: 96,
      },
      opacity: 0.58,
      src: BLOOMKNIGHTS_BIRD_SVG,
      space: "viewport",
      className: "kh-bloom-birds kh-bloom-birds-high",
      zIndex: 2,
    },
    {
      id: "bloomknights-birds-mid",
      kind: "image",
      mediaClassName: "h-auto w-full",
      nativeSize: {
        height: 36,
        width: 96,
      },
      opacity: 0.54,
      src: BLOOMKNIGHTS_BIRD_SVG,
      space: "viewport",
      className: "kh-bloom-birds kh-bloom-birds-mid",
      zIndex: 2,
    },
  ],
  mode: "dynamic",
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(5,18,22,0.6)_0%,rgba(8,32,42,0.38)_48%,rgba(8,23,31,0.2)_100%)]",
  questionTransitionMs: 0,
  showStockEffects: false,
  stepTransitionMs: 220,
  styles: bloomknightsApplicationStyles,
  transitionMs: 220,
} satisfies ApplicationVisualConfig;
