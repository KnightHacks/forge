import type { ReactNode } from "react";
import Image from "next/image";

import { BloomKnightsActionBlooms } from "./bloomknights-action-blooms";
import { BloomKnightsAmbientBackground } from "./bloomknights-ambient-background";
import { BloomKnightsDashboardLogo } from "./bloomknights-dashboard-logo";
import { BloomKnightsFlowerCursor } from "./bloomknights-flower-cursor";

const BLOOMKNIGHTS_DASHBOARD_BACKGROUND =
  "https://assets.knighthacks.org/bloom-background-desktop.webp";
const BLOOMKNIGHTS_DASHBOARD_BACKGROUND_AVIF =
  "https://assets.knighthacks.org/bloom-background-desktop.avif";

const BLOOMKNIGHTS_DASHBOARD_FOOTER_LINKS = [
  { href: "https://blade.knighthacks.org", label: "Blade" },
  { href: "https://discord.gg/2W2HCvkKAy", label: "Discord" },
  { href: "https://club.knighthacks.org", label: "Club" },
  { href: "https://www.instagram.com/knighthacks/", label: "Instagram" },
] as const;

export function BloomKnightsDashboardShell({
  children,
  fixedBackground = false,
}: {
  children: ReactNode;
  fixedBackground?: boolean;
}) {
  return (
    <main
      className="font-dm-sans relative isolate min-h-screen overflow-hidden bg-[#f5ebd5] bg-cover bg-center bg-no-repeat px-3 py-5 text-[#3d2e1e] sm:px-5 sm:py-8 lg:py-10"
      style={{
        backgroundAttachment: fixedBackground ? "fixed" : undefined,
        backgroundImage: `image-set(url("${BLOOMKNIGHTS_DASHBOARD_BACKGROUND_AVIF}") type("image/avif"), url("${BLOOMKNIGHTS_DASHBOARD_BACKGROUND}") type("image/webp"))`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(218,234,245,0.38),rgba(255,248,222,0.24)_48%,rgba(36,95,53,0.2))]"
      />
      <BloomKnightsAmbientBackground />
      <BloomKnightsActionBlooms />
      <BloomKnightsFlowerCursor />
      <a
        href="#participant-content"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-md bg-[#fff8de] px-4 py-2 font-bold text-[#245f35] shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to participant content
      </a>
      <div
        id="participant-content"
        tabIndex={-1}
        className="relative z-10 mx-auto w-full max-w-6xl"
      >
        <BloomKnightsDashboardLogo />
        {children}
        <footer className="mx-auto mt-6 flex w-full max-w-6xl flex-col items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#245f35]/80 px-4 py-3 text-xs font-semibold text-[#fff8de] shadow-sm backdrop-blur sm:flex-row">
          <Image
            src="/knighthacks.svg"
            alt="Knight Hacks"
            width={118}
            height={32}
            className="h-8 w-[118px] object-contain opacity-95"
            unoptimized
          />
          <nav
            aria-label="BloomKnights dashboard footer links"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
          >
            {BLOOMKNIGHTS_DASHBOARD_FOOTER_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                {label}
              </a>
            ))}
          </nav>
        </footer>
      </div>
      <style>{`
        .bk-dashboard-logo-shell {
          overflow: visible;
        }

        .bk-dashboard-logo {
          transform-origin: center;
          filter: drop-shadow(0 0.45rem 0.55rem rgba(45, 84, 34, 0.12));
          transition: filter 300ms ease;
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
          border-radius: 0.5rem;
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
          border-radius: 0.75rem;
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

          .bk-flower-cycle-text::before {
            animation: none;
          }
        }

      `}</style>
    </main>
  );
}
