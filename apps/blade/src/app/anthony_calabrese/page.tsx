import type { Metadata } from "next";
import localFont from "next/font/local";

import { cn } from "@forge/ui";

import styles from "./page.module.css";

const khFont = localFont({ src: "./fonts/animeace2_reg.ttf" });

export const metadata: Metadata = {
  title: "Anthony Calabrese",
};

export default function AnthonyCalabresePage() {
  return (
    <div className={styles.page}>
      <div
        className={cn(
          styles.curtain1,
          "pointer-events-none fixed z-30 h-[100dvh] w-[100dvw] bg-black",
        )}
      />

      <div
        className={cn(
          styles.curtain3,
          "pointer-events-none fixed flex h-[100dvh] w-[100dvw] flex-col items-center justify-center",
        )}
      >
        <p className={cn(khFont.className, "text-4xl md:text-6xl")}>
          Dev Application for...
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/khix-logo-white.svg"
          alt="khbanner"
          className="max-h-[60dvh] max-w-[80dvw] object-contain"
        />
      </div>

      <div className={styles.curtain2}>
        <div
          className={cn(
            styles.tkFactory,
            styles.tkFactoryMove,
            "pointer-events-none fixed bottom-0 z-10 h-[50dvh] w-[100vw]",
          )}
        />
        <div
          className={cn(
            styles.piping,
            styles.pipingMove,
            "pointer-events-none fixed z-0 h-[100dvh] w-[100dvw]",
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gear.png"
          alt="gear"
          className={cn(
            styles.gearMoveRight,
            "fixed right-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gear.png"
          alt="gear"
          className={cn(
            styles.gearMoveRightBottom,
            "fixed right-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />
        <img
          src="/vines2.png"
          alt="vines2"
          className={cn(
            styles.gearMoveRight,
            "fixed right-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        <img
          src="/vines2invert.png"
          alt="vines2"
          className={cn(
            styles.gearMoveRight,
            "fixed right-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        <img
          src="/vines2.png"
          alt="vines2"
          className={cn(
            styles.gearMoveRightBottom,
            "fixed right-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />
        <img
          src="/vines2invert.png"
          alt="vines2"
          className={cn(
            styles.gearMoveRightBottom,
            "fixed right-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gear.png"
          alt="gear"
          className={cn(
            styles.gearMoveLeft,
            "fixed left-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gear.png"
          alt="gear"
          className={cn(
            styles.gearMoveLeftBottom,
            "fixed left-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />
        <img
          src="/vines2.png"
          alt="vines2"
          className={cn(
            styles.gearMoveLeft,
            "fixed left-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        <img
          src="/vines2invert.png"
          alt="vines2"
          className={cn(
            styles.gearMoveLeft,
            "fixed left-6 top-6 z-10 h-64 md:h-80",
          )}
        />
        <img
          src="/vines2.png"
          alt="vines2"
          className={cn(
            styles.gearMoveLeftBottom,
            "fixed left-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />
        <img
          src="/vines2invert.png"
          alt="vines2"
          className={cn(
            styles.gearMoveLeftBottom,
            "fixed left-6 top-28 z-10 h-48 md:top-32 md:h-64",
          )}
        />

        <img
          src="/vines.png"
          alt="vines"
          className="fixed left-28 top-0 z-10 h-72 w-auto md:top-0 md:h-96"
        />
        <img
          src="/vines.png"
          alt="vines"
          className="fixed right-28 top-0 z-10 h-72 w-auto md:top-0 md:h-96"
        />
        <img
          src="/vines.png"
          alt="vines"
          className="fixed left-0 top-0 z-10 h-72 w-auto md:top-0 md:h-96"
        />
        <img
          src="/vines.png"
          alt="vines"
          className="fixed right-0 top-0 z-10 h-72 w-auto md:top-0 md:h-96"
        />

        <div className="flex h-[10dvh] w-[100dvw] flex-col items-center justify-center md:h-[20dvh]">
          <p
            className={cn(
              styles.titleAnimate,
              khFont.className,
              "z-20 rounded-full bg-gray-400 bg-opacity-80 p-3 text-2xl text-blue-800 md:text-4xl",
            )}
          >
            Anthony Calabrese
          </p>
        </div>
        <div
          className={cn(
            styles.boxPulse,
            "z-10 flex h-[60dvh] w-[100dvw] flex-col items-center justify-center md:h-[40dvh]",
          )}
        >
          <a
            href="https://anthonycalabrese.dev/rsm.pdf"
            target="_blank"
            rel="noreferrer"
            className={cn(
              khFont.className,
              "mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-lg text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-xl",
            )}
          >
            Resume
          </a>

          <a
            href="https://www.linkedin.com/in/anthony-calabrese-b4453930b/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              khFont.className,
              "mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-lg text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-xl",
            )}
          >
            Linkedin
          </a>
          <a
            href="https://github.com/cala28124-sketch"
            target="_blank"
            rel="noreferrer"
            className={cn(
              khFont.className,
              "mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-lg text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-xl",
            )}
          >
            Github
          </a>
          <a
            href="https://anthonycalabrese.dev/"
            target="_blank"
            rel="noreferrer"
            className={cn(
              khFont.className,
              "mb-10 scale-100 transform rounded-full bg-gray-400 bg-opacity-80 p-3 text-lg text-blue-600 transition duration-150 hover:scale-[1.2] hover:text-yellow-500 md:text-xl",
            )}
          >
            Portfolio
          </a>
        </div>
      </div>
    </div>
  );
}
