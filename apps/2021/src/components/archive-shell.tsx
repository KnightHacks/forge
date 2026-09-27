"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const pages = [
  ["Home", "/"],
  ["About", "/about"],
  ["Sponsors", "/sponsors"],
  ["Schedule", "/schedule"],
  ["FAQ", "/faq"],
  ["Attributions", "/attributions"],
] as const;

function KoiBackground({ theme }: { theme: "light" | "dark" }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = container.current;
    if (!node) return;

    const abortController = new AbortController();
    let destroy: (() => void) | undefined;

    void Promise.all([
      import("lottie-web"),
      fetch(`/assets/lotties/${theme}-mode.json`, {
        signal: abortController.signal,
      }).then((response) => response.json()),
    ])
      .then(([module, animationData]) => {
        if (abortController.signal.aborted) return;

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const animation = module.default.loadAnimation({
          container: node,
          renderer: "svg",
          loop: !reducedMotion,
          autoplay: !reducedMotion,
          animationData,
          rendererSettings: { preserveAspectRatio: "xMinYMin slice" },
        });

        if (reducedMotion) animation.goToAndStop(0, true);
        destroy = () => animation.destroy();
      })
      .catch(() => undefined);

    return () => {
      abortController.abort();
      destroy?.();
      node.replaceChildren();
    };
  }, [theme]);

  return <div ref={container} className="koi-background" aria-hidden="true" />;
}

function Icon({
  name,
}: {
  name: "menu" | "volume" | "muted" | "sun" | "moon";
}) {
  const paths = {
    menu: <path d="M4 7h24M4 16h24M4 25h24" />,
    volume: (
      <>
        <path d="M5 13h5l7-6v18l-7-6H5z" />
        <path d="M22 11c2.5 2.5 2.5 7.5 0 10M26 7c4.8 4.8 4.8 13.2 0 18" />
      </>
    ),
    muted: (
      <>
        <path d="M5 13h5l7-6v18l-7-6H5z" />
        <path d="m23 12 7 8m0-8-7 8" />
      </>
    ),
    sun: (
      <>
        <circle cx="16" cy="16" r="5" />
        <path d="M16 2v5m0 18v5M2 16h5m18 0h5M6 6l4 4m12 12 4 4M26 6l-4 4M10 22l-4 4" />
      </>
    ),
    moon: <path d="M25 21A11 11 0 0 1 11 7a11.5 11.5 0 1 0 14 14Z" />,
  };

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function SocialIcon({ name }: { name: "twitter" | "instagram" | "facebook" }) {
  if (name === "instagram") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <rect x="6" y="6" width="20" height="20" rx="5" />
        <circle cx="16" cy="16" r="5" />
        <circle cx="23" cy="9" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "facebook") {
    return (
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M18 28V17h4l1-5h-5V9.5c0-1.5.7-2.5 2.7-2.5H23V2.5c-1-.2-2.4-.5-4-.5-4.2 0-7 2.5-7 7v3H8v5h4v11z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M28 8.5c-.9.4-1.9.7-3 .8a5.3 5.3 0 0 0 2.3-2.9c-1 .6-2.1 1-3.3 1.3a5.2 5.2 0 0 0-9 3.6c0 .4 0 .8.1 1.2A14.8 14.8 0 0 1 4.4 7c-.5.8-.7 1.7-.7 2.6 0 1.8.9 3.4 2.3 4.3a5.2 5.2 0 0 1-2.4-.6v.1c0 2.5 1.8 4.6 4.2 5.1-.4.1-.9.2-1.4.2-.3 0-.7 0-1-.1.7 2.1 2.6 3.6 4.9 3.6A10.5 10.5 0 0 1 3.8 24H2.5A14.8 14.8 0 0 0 10.5 26c9.6 0 14.8-7.9 14.8-14.8v-.7c1-.7 1.9-1.6 2.7-2.7z" />
    </svg>
  );
}

export function ArchiveShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const menuDialog = useRef<HTMLDivElement>(null);
  const openMenuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const dialog = menuDialog.current;
    if (!dialog) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      openMenuButton.current?.focus();
    };
  }, [menuOpen]);

  const toggleMusic = async () => {
    const player = audio.current;
    if (!player) return;
    if (musicPlaying) {
      player.pause();
      setMusicPlaying(false);
      return;
    }
    try {
      await player.play();
      setMusicPlaying(true);
    } catch {
      setMusicPlaying(false);
    }
  };

  return (
    <>
      <KoiBackground theme={theme} />
      <audio
        ref={audio}
        src="/assets/background-music.mp3"
        loop
        preload="none"
      />

      <div className={`archive-layout ${menuOpen ? "blur-md filter" : ""}`}>
        <header className="archive-header h-3/20 w-full sm:col-span-1 sm:h-full">
          <div className="archive-controls text-darkblue dark:text-purewhite">
            <button
              ref={openMenuButton}
              type="button"
              className="archive-icon-button"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <button
              type="button"
              className="archive-icon-button"
              aria-label={
                musicPlaying ? "Mute background music" : "Play background music"
              }
              onClick={() => void toggleMusic()}
            >
              <Icon name={musicPlaying ? "volume" : "muted"} />
            </button>
          </div>
          <a
            id="mlh-trust-badge"
            href="https://mlh.io/seasons/2022/events?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2022-season&utm_content=gray"
            target="_blank"
            rel="noreferrer"
          >
            <Image
              src="/assets/mlh-trust-badge-2022-gray.svg"
              alt="Major League Hacking 2022 Hackathon Season"
              fill
              sizes="(max-width: 639px) 48px, 94px"
            />
          </a>
        </header>

        <div className="archive-panel-wrap text-darkblue dark:text-purewhite w-19/20 h-17/20 sm:h-19/20 sm:col-span-3">
          <main className="archive-panel h-19/20 bg-landing-transparent flex w-full flex-col items-center overflow-y-auto rounded-2xl p-2 backdrop-blur-sm backdrop-filter sm:h-full">
            {children}
            <footer className="mb-8 mt-auto flex w-full flex-row justify-center space-x-8 text-4xl sm:text-5xl md:text-6xl">
              <a
                aria-label="Knight Hacks on Twitter"
                href="https://twitter.com/KnightHacks"
                className="archive-social-link"
              >
                <SocialIcon name="twitter" />
              </a>
              <a
                aria-label="Knight Hacks on Instagram"
                href="https://www.instagram.com/knighthacks/"
                className="archive-social-link"
              >
                <SocialIcon name="instagram" />
              </a>
              <a
                aria-label="Knight Hacks on Facebook"
                href="https://www.facebook.com/KnightHacks/"
                className="archive-social-link"
              >
                <SocialIcon name="facebook" />
              </a>
              <button
                type="button"
                className="archive-theme-button"
                aria-label={
                  theme === "dark" ? "Use light theme" : "Use dark theme"
                }
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Icon name={theme === "dark" ? "sun" : "moon"} />
              </button>
            </footer>
          </main>
        </div>
      </div>

      {menuOpen ? (
        <div
          ref={menuDialog}
          className="archive-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            type="button"
            className="archive-menu-overlay"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
          <div className="archive-menu-content text-darkblue dark:text-purewhite">
            <button
              type="button"
              className="archive-icon-button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="menu" />
            </button>
            <nav aria-label="Archive pages">
              <ul className="archive-menu-list font-sansita">
                {pages.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} onClick={() => setMenuOpen(false)}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
