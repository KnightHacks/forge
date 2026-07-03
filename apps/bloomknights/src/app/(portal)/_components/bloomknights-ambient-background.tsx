export function BloomKnightsAmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <style>{`
        @keyframes bkAmbientLeafDriftA {
          0%, 100% {
            transform: translate3d(-0.5rem, 2vh, 0) rotate(-18deg);
          }

          45% {
            transform: translate3d(1rem, -6vh, 0) rotate(62deg);
          }

          75% {
            transform: translate3d(-0.7rem, 5vh, 0) rotate(118deg);
          }
        }

        @keyframes bkAmbientLeafDriftB {
          0%, 100% {
            transform: translate3d(0.7rem, 3vh, 0) rotate(22deg);
          }

          42% {
            transform: translate3d(-1rem, -5vh, 0) rotate(-54deg);
          }

          78% {
            transform: translate3d(0.8rem, 6vh, 0) rotate(-126deg);
          }
        }

        .bk-ambient-layer {
          backface-visibility: hidden;
          pointer-events: none;
          transform: translateZ(0);
        }

        .bk-ambient-leaves::before,
        .bk-ambient-leaves::after {
          content: "";
          position: absolute;
          pointer-events: none;
          transform: translateZ(0);
          will-change: transform, opacity;
        }

        .bk-ambient-leaves::before,
        .bk-ambient-leaves::after {
          width: clamp(0.7rem, 1vw, 1.25rem);
          aspect-ratio: 42 / 24;
          border-radius: 100% 0 100% 0;
          background:
            linear-gradient(135deg, rgba(244, 238, 140, 0.46), rgba(113, 157, 74, 0.32)),
            linear-gradient(145deg, transparent 44%, rgba(70, 105, 48, 0.38) 47%, transparent 52%);
          filter: drop-shadow(0 4px 7px rgba(38, 82, 43, 0.14));
          opacity: 0.42;
          transform-origin: center;
        }

        .bk-ambient-leaves-a::before {
          left: 10%;
          top: 72%;
          animation: bkAmbientLeafDriftA 30s ease-in-out infinite;
        }

        .bk-ambient-leaves-a::after {
          left: 27%;
          top: 82%;
          animation: bkAmbientLeafDriftB 34s ease-in-out infinite;
          animation-delay: -12s;
        }

        .bk-ambient-leaves-b::before {
          left: 58%;
          top: 76%;
          animation: bkAmbientLeafDriftB 32s ease-in-out infinite;
          animation-delay: -16s;
        }

        .bk-ambient-leaves-b::after {
          left: 84%;
          top: 68%;
          animation: bkAmbientLeafDriftA 36s ease-in-out infinite;
          animation-delay: -22s;
        }

        @media (prefers-reduced-motion: reduce) {
          .bk-ambient-leaves::before,
          .bk-ambient-leaves::after {
            animation: none;
          }
        }
      `}</style>
      <div className="bk-ambient-layer bk-ambient-leaves bk-ambient-leaves-a absolute inset-0" />
      <div className="bk-ambient-layer bk-ambient-leaves bk-ambient-leaves-b absolute inset-0" />
    </div>
  );
}
