import type { ApplicationVisualConfig, BackgroundSize } from "./types";

const KHIX_SCENE_SIZE = {
  height: 2250,
  width: 12000,
} satisfies BackgroundSize;

const KHIX_FLAT_WEBP = "https://assets.knighthacks.org/khix-flat.webp";
const KHIX_FOREGROUND_WEBP =
  "https://assets.knighthacks.org/khix-foreground.webp";
const KHIX_LENNY_FRAME_WEBPS = [
  "/assets/khix-lenny-walk-frame-01.webp",
  "/assets/khix-lenny-walk-frame-02.webp",
  "/assets/khix-lenny-walk-frame-03.webp",
  "/assets/khix-lenny-walk-frame-04.webp",
  "/assets/khix-lenny-walk-frame-05.webp",
  "/assets/khix-lenny-walk-frame-06.webp",
  "/assets/khix-lenny-walk-frame-07.webp",
  "/assets/khix-lenny-walk-frame-08.webp",
  "/assets/khix-lenny-walk-frame-09.webp",
  "/assets/khix-lenny-walk-frame-10.webp",
  "/assets/khix-lenny-walk-frame-11.webp",
  "/assets/khix-lenny-walk-frame-12.webp",
  "/assets/khix-lenny-walk-frame-13.webp",
  "/assets/khix-lenny-walk-frame-14.webp",
  "/assets/khix-lenny-walk-frame-15.webp",
  "/assets/khix-lenny-walk-frame-16.webp",
] as const;
const KHIX_LENNY_REST_FRAME_INDEX = 9;
const KHIX_LENNY_IDLE_WEBP =
  KHIX_LENNY_FRAME_WEBPS[KHIX_LENNY_REST_FRAME_INDEX];

export const khixApplicationStyles = `
@keyframes khixApplicationMistDrift {
  0%, 100% { transform: translate3d(-2%, 1%, 0) scale(1.02); opacity: 0.22; }
  50% { transform: translate3d(2%, -1%, 0) scale(1.08); opacity: 0.34; }
}

@keyframes khixApplicationGlowPulse {
  0%, 100% { opacity: 0.24; transform: scale(0.98); }
  50% { opacity: 0.42; transform: scale(1.03); }
}

@keyframes khixApplicationLennyWalkPace {
  0% {
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }

  14% {
    transform: translate3d(var(--khix-application-lenny-pace-a), 0.14rem, 0)
      rotate(var(--khix-application-lenny-tilt-a)) scale(0.997);
  }

  34% {
    transform: translate3d(var(--khix-application-lenny-pace-b), -0.22rem, 0)
      rotate(var(--khix-application-lenny-tilt-b)) scale(1.004);
  }

  58% {
    transform: translate3d(var(--khix-application-lenny-pace-c), -0.14rem, 0)
      rotate(var(--khix-application-lenny-tilt-c)) scale(1.002);
  }

  82% {
    transform: translate3d(var(--khix-application-lenny-pace-d), 0.1rem, 0)
      rotate(var(--khix-application-lenny-tilt-d)) scale(0.998);
  }

  100% {
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@keyframes khixApplicationLennyStride {
  0%, 100% {
    transform: translate3d(0, 0, 0) rotate(0deg) scaleY(1);
  }

  24% {
    transform: translate3d(var(--khix-application-lenny-stride-a), -0.2rem, 0)
      rotate(var(--khix-application-lenny-stride-tilt-a)) scaleY(1.006);
  }

  48% {
    transform: translate3d(var(--khix-application-lenny-stride-b), 0.1rem, 0)
      rotate(var(--khix-application-lenny-stride-tilt-b)) scaleY(0.996);
  }

  74% {
    transform: translate3d(var(--khix-application-lenny-stride-c), -0.16rem, 0)
      rotate(var(--khix-application-lenny-stride-tilt-c)) scaleY(1.004);
  }
}

@keyframes khixApplicationFireflyFloat {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(0.86);
    opacity: 0.18;
  }
  38% {
    transform: translate3d(1.25rem, -0.55rem, 0) scale(1);
    opacity: 0.74;
  }
  68% {
    transform: translate3d(-0.65rem, 0.75rem, 0) scale(1.14);
    opacity: 0.34;
  }
}

@keyframes khixApplicationLeafFall {
  0% {
    opacity: 0;
    transform: translate3d(0, -8svh, 0) rotate(-18deg) scale(0.86);
  }

  12% {
    opacity: var(--khix-application-leaf-opacity);
  }

  58% {
    opacity: var(--khix-application-leaf-opacity);
    transform: translate3d(var(--khix-application-leaf-drift), 54svh, 0)
      rotate(var(--khix-application-leaf-rotate)) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate3d(var(--khix-application-leaf-drift), 106svh, 0)
      rotate(var(--khix-application-leaf-rotate)) scale(0.9);
  }
}

.khix-application-lenny-walk {
  --khix-application-lenny-pace-a: -0.16rem;
  --khix-application-lenny-pace-b: 0.52rem;
  --khix-application-lenny-pace-c: 0.36rem;
  --khix-application-lenny-pace-d: -0.08rem;
  --khix-application-lenny-tilt-a: -0.35deg;
  --khix-application-lenny-tilt-b: 0.65deg;
  --khix-application-lenny-tilt-c: 0.35deg;
  --khix-application-lenny-tilt-d: -0.18deg;
  --khix-application-lenny-stride-a: 0.18rem;
  --khix-application-lenny-stride-b: 0.04rem;
  --khix-application-lenny-stride-c: -0.16rem;
  --khix-application-lenny-stride-tilt-a: 0.35deg;
  --khix-application-lenny-stride-tilt-b: -0.18deg;
  --khix-application-lenny-stride-tilt-c: -0.3deg;
  transform-origin: 50% 86%;
  animation: khixApplicationLennyWalkPace
    var(--kh-application-transition-duration, 1250ms)
    cubic-bezier(0.36, 0, 0.16, 1) both;
  will-change: transform;
}

.khix-application-lenny-stage {
  backface-visibility: hidden;
  isolation: isolate;
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.khix-application-lenny-walk.kh-application-transition-back {
  --khix-application-lenny-pace-a: 0.16rem;
  --khix-application-lenny-pace-b: -0.52rem;
  --khix-application-lenny-pace-c: -0.36rem;
  --khix-application-lenny-pace-d: 0.08rem;
  --khix-application-lenny-tilt-a: 0.35deg;
  --khix-application-lenny-tilt-b: -0.65deg;
  --khix-application-lenny-tilt-c: -0.35deg;
  --khix-application-lenny-tilt-d: 0.18deg;
  --khix-application-lenny-stride-a: -0.18rem;
  --khix-application-lenny-stride-b: -0.04rem;
  --khix-application-lenny-stride-c: 0.16rem;
  --khix-application-lenny-stride-tilt-a: -0.35deg;
  --khix-application-lenny-stride-tilt-b: 0.18deg;
  --khix-application-lenny-stride-tilt-c: 0.3deg;
}

.khix-application-lenny-stride {
  height: 100%;
  transform-origin: 50% 86%;
  animation: khixApplicationLennyStride
    var(--kh-application-transition-stride-duration, 640ms)
    cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
}

.khix-application-fireflies {
  contain: paint;
  overflow: hidden;
  opacity: 0.96;
  mix-blend-mode: screen;
}

.khix-application-fireflies::before,
.khix-application-fireflies::after {
  content: "";
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  background-size:
    78rem 42rem,
    52rem 36rem,
    68rem 48rem,
    44rem 30rem,
    92rem 54rem;
  filter: blur(0.15px) drop-shadow(0 0 0.55rem rgba(226, 255, 151, 0.42));
  transform: translate3d(0, 0, 0);
  animation: khixApplicationFireflyFloat 9s ease-in-out infinite;
}

.khix-application-fireflies::before {
  background-image:
    radial-gradient(circle, rgba(249, 255, 188, 0.96) 0 2px, rgba(249, 255, 188, 0.42) 3.2px, transparent 7px),
    radial-gradient(circle, rgba(137, 255, 211, 0.84) 0 1.8px, rgba(137, 255, 211, 0.34) 3px, transparent 6.2px),
    radial-gradient(circle, rgba(255, 237, 139, 0.78) 0 1.65px, rgba(255, 237, 139, 0.3) 2.8px, transparent 5.8px),
    radial-gradient(circle, rgba(184, 255, 179, 0.76) 0 1.7px, rgba(184, 255, 179, 0.32) 3px, transparent 6px),
    radial-gradient(circle, rgba(226, 255, 151, 0.66) 0 1.45px, rgba(226, 255, 151, 0.26) 2.6px, transparent 5.4px);
  background-position:
    7% 16%,
    22% 74%,
    46% 34%,
    71% 64%,
    88% 20%;
  box-shadow: inset 0 0 5rem rgba(151, 255, 211, 0.05);
}

.khix-application-fireflies::after {
  background-image:
    radial-gradient(circle, rgba(246, 255, 188, 0.82) 0 1.45px, rgba(246, 255, 188, 0.28) 2.5px, transparent 5.2px),
    radial-gradient(circle, rgba(104, 248, 203, 0.68) 0 1.55px, rgba(104, 248, 203, 0.24) 2.7px, transparent 5.4px),
    radial-gradient(circle, rgba(255, 219, 119, 0.66) 0 1.35px, rgba(255, 219, 119, 0.22) 2.4px, transparent 4.8px),
    radial-gradient(circle, rgba(216, 255, 134, 0.68) 0 1.5px, rgba(216, 255, 134, 0.26) 2.7px, transparent 5.2px),
    radial-gradient(circle, rgba(181, 255, 224, 0.58) 0 1.25px, rgba(181, 255, 224, 0.2) 2.2px, transparent 4.6px);
  background-position:
    14% 46%,
    34% 18%,
    54% 82%,
    76% 28%,
    93% 72%;
  animation-duration: 12s;
  animation-delay: -5s;
}

.khix-application-fireflies-soft {
  opacity: 0.64;
}

.khix-application-fireflies-soft::before,
.khix-application-fireflies-soft::after {
  background-size:
    106rem 62rem,
    84rem 58rem,
    118rem 74rem,
    72rem 46rem,
    140rem 80rem;
  filter: blur(1.7px) drop-shadow(0 0 0.8rem rgba(137, 255, 211, 0.24));
  animation-duration: 16s;
}

.khix-application-fireflies-soft::after {
  animation-delay: -9s;
}

.khix-application-leaf-field {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
  opacity: var(--khix-application-leaf-field-opacity, 0);
  transition: opacity 520ms ease;
}

.khix-application-leaf {
  position: absolute;
  top: -9svh;
  left: var(--khix-application-leaf-x);
  width: var(--khix-application-leaf-size);
  aspect-ratio: 0.62;
  border-radius: 100% 0 100% 0;
  background:
    linear-gradient(135deg, rgba(239, 217, 255, 0.44), transparent 38%),
    var(--khix-application-leaf-fill);
  box-shadow: inset -1px -2px 3px rgba(58, 31, 93, 0.22);
  opacity: 0;
  transform: translate3d(0, -8svh, 0) rotate(-18deg);
  animation: khixApplicationLeafFall var(--khix-application-leaf-duration)
    linear var(--khix-application-leaf-delay) infinite;
}

.khix-application-leaf::after {
  position: absolute;
  inset: 13% 46% 8% auto;
  width: 1px;
  content: "";
  background: rgba(64, 38, 102, 0.3);
  transform: rotate(10deg);
  transform-origin: bottom;
}

.khix-application-asset-credit {
  position: absolute;
  pointer-events: auto;
}

.khix-application-asset-credit-target {
  position: absolute;
  inset: 0;
  display: block;
  border-radius: 9999px;
}

.khix-application-background-credit {
  top: clamp(1.25rem, 4vh, 3.25rem);
  right: clamp(1rem, 3vw, 2.5rem);
  width: min(20rem, calc(100vw - 2rem));
  height: 2.75rem;
}

.khix-application-animation-credit {
  top: calc(clamp(1.25rem, 4vh, 3.25rem) + 1.1rem);
  right: clamp(1rem, 3vw, 2.5rem);
  width: min(20rem, calc(100vw - 2rem));
  height: 2.75rem;
}

.khix-application-background-credit > span:last-child,
.khix-application-animation-credit > span:last-child {
  right: 0;
  bottom: 0;
  opacity: 0.58 !important;
  transform: translate3d(0, 0, 0) !important;
  pointer-events: auto !important;
}

.khix-application-background-credit:hover > span:last-child,
.khix-application-background-credit:focus-within > span:last-child,
.khix-application-animation-credit:hover > span:last-child,
.khix-application-animation-credit:focus-within > span:last-child {
  opacity: 1 !important;
}

@media (prefers-reduced-motion: reduce) {
  .khix-application-fireflies::before,
  .khix-application-fireflies::after {
    animation: none;
  }

  .khix-application-leaf {
    display: none;
  }

  .khix-application-lenny-walk,
  .khix-application-lenny-stride {
    animation: none;
    transform: none;
  }
}

form[data-application-visual="khix"],
.kh-application-shell[data-application-visual="khix"] {
  background-color: #07150f;
  background-image:
    linear-gradient(
      to bottom,
      rgba(4, 16, 13, 0.18) 0%,
      rgba(5, 17, 14, 0.08) 42%,
      rgba(5, 14, 12, 0.55) 78%,
      rgba(3, 10, 9, 0.82) 100%
    ),
    url("${KHIX_FLAT_WEBP}");
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}

.kh-application-shell[data-application-visual="khix"] .kh-step-content :is(input, textarea) {
  border-color: rgba(255, 255, 255, 0.42);
}

.kh-application-shell[data-application-visual="khix"] .kh-step-content :is(input, textarea):focus-visible {
  border-color: rgba(226, 255, 151, 0.78);
  box-shadow: 0 10px 34px rgba(216, 255, 134, 0.16);
}

.kh-application-shell[data-application-visual="khix"] .kh-resume-info-trigger {
  border-color: rgba(226, 255, 151, 0.48);
  background: rgba(226, 255, 151, 0.12);
  color: rgba(245, 255, 196, 0.9);
}
`;

export const khixApplicationBackground = {
  key: "khix",
  label: "KHIX forest walk",
  mode: "dynamic",
  baseLayerId: "khix-flat",
  showStockEffects: false,
  styles: khixApplicationStyles,
  transitionMs: 1500,
  transitionEasing: "cubic-bezier(0.37, 0, 0.63, 1)",
  stepTransitionMs: 1500,
  questionTransitionMs: 620,
  fallingLeavesStartProgress: 0.3,
  mobileTimingMaxWidth: 768,
  mobileTransitionMs: 2300,
  mobileStepTransitionMs: 2300,
  mobileQuestionTransitionMs: 860,
  overlayClassName:
    "bg-[linear-gradient(90deg,rgba(2,8,7,0.46),rgba(4,16,13,0.08)_42%,rgba(3,10,8,0.58)),linear-gradient(to_bottom,rgba(5,18,14,0.08),rgba(3,9,8,0.72))]",
  assetCredits: [
    {
      id: "khix-application-background-credit",
      className:
        "khix-application-asset-credit khix-application-background-credit",
      label: "Background by",
      credits: [
        {
          name: "Dalia Z",
          href: "https://www.linkedin.com/in/dalia-l-zamora/",
        },
      ],
    },
    {
      id: "khix-application-animation-credit",
      className:
        "khix-application-asset-credit khix-application-animation-credit",
      label: "Animation by",
      credits: [
        {
          name: "Gabriela Z",
          href: "https://www.linkedin.com/in/gabriela-zambrano-7074363b4/",
        },
      ],
    },
  ],
  layers: [
    {
      id: "khix-flat",
      kind: "image",
      src: KHIX_FLAT_WEBP,
      alt: "",
      nativeSize: KHIX_SCENE_SIZE,
      parallax: 1,
      zIndex: 0,
    },
    {
      id: "khix-lenny",
      kind: "image",
      src: KHIX_LENNY_IDLE_WEBP,
      animatedRestFrameIndex: KHIX_LENNY_REST_FRAME_INDEX,
      animatedFrameSrcs: KHIX_LENNY_FRAME_WEBPS,
      alt: "",
      className:
        "khix-application-lenny-stage bottom-[18%] left-[-8%] aspect-[37/48] h-[clamp(10rem,min(58vh,76vw),42rem)] md:left-[8%] lg:left-[30%] lg:h-[clamp(9rem,min(52.2vh,68.4vw),37.8rem)]",
      motion: {
        facesStepDirection: true,
        transitionPaceClassName: "khix-application-lenny-walk",
        transitionStrideClassName: "khix-application-lenny-stride",
        transitionStrideMs: 640,
        turnDurationMs: 280,
      },
      nativeSize: {
        height: 960,
        width: 740,
      },
      opacity: 1,
      space: "viewport",
      zIndex: 2,
    },
    {
      id: "khix-foreground",
      kind: "image",
      src: KHIX_FOREGROUND_WEBP,
      alt: "",
      nativeSize: KHIX_SCENE_SIZE,
      parallax: 1,
      zIndex: 4,
    },
  ],
  ambientLayers: [
    {
      id: "khix-fireflies-a",
      className: "khix-application-fireflies",
      parallax: 1,
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-fireflies-b",
      className: "khix-application-fireflies khix-application-fireflies-soft",
      parallax: 1,
      space: "scene",
      zIndex: 1,
    },
    {
      id: "khix-mist",
      className:
        "bg-[radial-gradient(circle_at_24%_38%,rgba(212,255,158,0.20),transparent_26%),radial-gradient(circle_at_72%_34%,rgba(99,225,199,0.13),transparent_24%)] blur-2xl [animation:khixApplicationMistDrift_10s_ease-in-out_infinite]",
      zIndex: 1,
    },
    {
      id: "khix-glow",
      className:
        "bg-[radial-gradient(circle_at_50%_58%,rgba(216,255,134,0.16),transparent_32%)] [animation:khixApplicationGlowPulse_7s_ease-in-out_infinite]",
      zIndex: 3,
    },
  ],
} satisfies ApplicationVisualConfig;
