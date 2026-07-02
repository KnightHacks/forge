import type { ReactNode } from "react";

import { BloomKnightsActionBlooms } from "./bloomknights-action-blooms";
import { BloomKnightsAmbientBackground } from "./bloomknights-ambient-background";
import { BloomKnightsDashboardLogo } from "./bloomknights-dashboard-logo";
import { BloomKnightsFlowerCursor } from "./bloomknights-flower-cursor";

const BLOOMKNIGHTS_DASHBOARD_BACKGROUND =
  "https://assets.knighthacks.org/bloom-background-desktop.webp";
const BLOOMKNIGHTS_DASHBOARD_BACKGROUND_AVIF =
  "https://assets.knighthacks.org/bloom-background-desktop.avif";

export function BloomKnightsDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-emerald-950 bg-[length:100%_auto] bg-[center_72%] bg-no-repeat px-4 py-16"
      style={{
        backgroundImage: `image-set(url("${BLOOMKNIGHTS_DASHBOARD_BACKGROUND_AVIF}") type("image/avif"), url("${BLOOMKNIGHTS_DASHBOARD_BACKGROUND}") type("image/webp"))`,
      }}
    >
      <BloomKnightsAmbientBackground />
      <BloomKnightsActionBlooms />
      <BloomKnightsFlowerCursor />
      <div className="max-w-8xl relative z-10 mx-auto w-full">
        <BloomKnightsDashboardLogo />
        {children}
      </div>
      <style>{`
        .bk-dashboard-logo-shell {
          overflow: visible;
        }

        .bk-dashboard-logo {
          transform-origin: center;
          filter: drop-shadow(0 0.45rem 0.55rem rgba(45, 84, 34, 0.12));
          transition:
            transform 520ms cubic-bezier(0.18, 0.89, 0.32, 1.28),
            filter 520ms ease;
          will-change: transform, filter;
        }

        .bk-dashboard-logo-shell:hover .bk-dashboard-logo {
          filter: drop-shadow(0 0.85rem 0.75rem rgba(45, 84, 34, 0.18));
          transform: translateY(-0.35rem) scale(1.065);
        }

        .bk-flower-cycle-text {
          position: relative;
          isolation: isolate;
          display: flex;
          width: fit-content;
          margin-right: auto;
          margin-left: auto;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 9999px;
          padding: 0.45rem 1.15rem;
          color: #ffffff;
          text-shadow: 0 1px 3px rgba(36, 95, 53, 0.45);
        }

        .bk-flower-cycle-text::before {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 280%;
          aspect-ratio: 1;
          z-index: -1;
          content: "";
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            #fcbc4e,
            #a8d471,
            #fe73fe,
            #b8d4e8,
            #c9b8d8,
            #f5d97a,
            #fcbc4e
          );
          animation: bkFlowerCycleTextFlow 8s linear infinite;
        }

        .bk-flower-cycle-text::after {
          position: absolute;
          inset: 0.18rem;
          z-index: -1;
          content: "";
          border-radius: inherit;
          background: rgba(36, 95, 53, 0.12);
          box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.2);
        }

        @keyframes bkFlowerCycleTextFlow {
          from {
            transform: translate(-50%, -50%) rotate(0turn);
          }

          to {
            transform: translate(-50%, -50%) rotate(1turn);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bk-dashboard-logo {
            transition: none;
          }

          .bk-dashboard-logo-shell:hover .bk-dashboard-logo {
            transform: none;
          }

          .bk-flower-cycle-text::before {
            animation: none;
          }
        }

      `}</style>
    </main>
  );
}
