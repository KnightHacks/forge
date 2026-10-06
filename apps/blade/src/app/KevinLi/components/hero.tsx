import type { CSSProperties } from "react";
import { Inika, Jacques_Francois_Shadow } from "next/font/google";
import Image from "next/image";

import styles from "./hero.module.css";

const inika = Inika({ subsets: ["latin"], weight: "400" });
const jacquesShadow = Jacques_Francois_Shadow({
  subsets: ["latin"],
  weight: "400",
});

// A 1920x1080 landscape recomposition of the Figma poster. One design pixel
// scales with whichever of the hero's width or height is tighter, so the
// layout always fits. Pieces anchor to the left edge, right edge, or center
// so the edge pieces bleed to the sides on any screen shape.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const s = (px: number) =>
  `min(${(px / DESIGN_WIDTH) * 100}cqw, ${(px / DESIGN_HEIGHT) * 100}cqh)`;

type Anchor = "left" | "center" | "right";

const place = (
  anchor: Anchor,
  x: number,
  y: number,
  width?: number,
  height?: number,
): CSSProperties => {
  const horizontal: CSSProperties =
    anchor === "left"
      ? { left: s(x) }
      : anchor === "right"
        ? { right: s(DESIGN_WIDTH - x - (width ?? 0)) }
        : x >= DESIGN_WIDTH / 2
          ? { left: `calc(50% + ${s(x - DESIGN_WIDTH / 2)})` }
          : { left: `calc(50% - ${s(DESIGN_WIDTH / 2 - x)})` };
  return {
    ...horizontal,
    top: s(y),
    width: width === undefined ? undefined : s(width),
    height: height === undefined ? undefined : s(height),
  };
};

const NAVY = "#214e92";
const PINK = "#f54e96";

// The bench and the sky strip share a bottom edge and sit INSET from the
// sides; the leaf branches bleed off the sides instead.
const BOTTOM = 1043;
const INSET = 64;
const BENCH = { width: 950, height: 443 };
const SKY = { width: 587, height: 214 };

// Traced from cloud-figma.png's opaque pixels.
const CLOUD_OUTLINE =
  "polygon(53% 8%, 58% 17%, 62% 25%, 74% 33%, 82% 42%, 84% 50%, 100% 58%, 97% 67%, 93% 75%, 87% 83%, 80% 91%, 22% 91%, 3% 83%, 0% 75%, 1% 67%, 5% 58%, 7% 50%, 9% 42%, 20% 33%, 22% 25%, 26% 17%, 33% 8%)";

// Soft offset shadow that makes a piece look cut out and glued down.
const PAPER_SHADOW = `drop-shadow(${s(6)} ${s(10)} ${s(10)} rgb(40 48 70 / 0.3))`;

const LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/kevin-li7673/" },
  { label: "Resume", href: "/kevin-li/resume.pdf" },
  { label: "GitHub", href: "https://github.com/kevinli7673" },
];

export function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#edebdc] [container-type:size]"
      style={{
        height: `min(100svh, ${(DESIGN_HEIGHT / DESIGN_WIDTH) * 100}vw)`,
      }}
    >
      <span
        className="absolute rounded-full"
        style={{ ...place("left", 64, 72, 60, 60), backgroundColor: NAVY }}
      />
      <svg
        className="absolute"
        style={place("left", 160, 83, 240, 37)}
        viewBox="0 0 300 46.188"
        preserveAspectRatio="none"
        fill={NAVY}
        aria-hidden
      >
        <path d="M300 23.094L260 0V46.188L300 23.094ZM0 23.094V27.094H264V23.094V19.094H0V23.094Z" />
      </svg>
      <p
        className={`${jacquesShadow.className} absolute leading-none`}
        style={{ ...place("left", 440, 72), fontSize: s(54), color: NAVY }}
      >
        Computer Science
      </p>
      <span
        className="absolute rounded-full"
        style={{ ...place("right", 1796, 72, 60, 60), backgroundColor: NAVY }}
      />

      <div
        className="absolute"
        style={{
          ...place(
            "left",
            INSET,
            BOTTOM - BENCH.height,
            BENCH.width,
            BENCH.height,
          ),
          filter: PAPER_SHADOW,
        }}
      >
        <Image
          src="/kevin-li/bench.png"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
        />
      </div>

      {/* The links hide behind the drifting cloud. Hovering the cloud, or
          tabbing to a link, lifts the cloud away to reveal them. Only the
          cloud's traced outline triggers the hover, not its empty corners.
          Both cloud images are exported from Figma with their crop and skew
          baked in, so they are placed at their rendered bounds. */}
      <div
        className="group peer pointer-events-none absolute"
        style={place("center", 290, 120, 1430, 640)}
      >
        <div
          className="pointer-events-auto absolute inset-0"
          style={{ clipPath: CLOUD_OUTLINE }}
        />
        <nav
          aria-label="Kevin Li links"
          className="absolute inset-0 z-10 flex translate-y-[6%] flex-col items-center justify-center opacity-0 transition duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-opacity"
          style={{ gap: s(24), paddingBottom: s(40) }}
        >
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(!link.href.startsWith("#") && {
                target: "_blank",
                rel: "noreferrer",
              })}
              className={`${jacquesShadow.className} ${styles.link} pointer-events-none rounded-sm leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#214e92] group-hover:pointer-events-auto group-has-[:focus-visible]:pointer-events-auto`}
              style={{ fontSize: s(84) }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="pointer-events-none absolute inset-0 transition duration-700 ease-out group-hover:-translate-y-[20%] group-hover:scale-105 group-hover:opacity-25 group-has-[:focus-visible]:-translate-y-[20%] group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:opacity-25 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-opacity">
          <div className={`absolute inset-0 ${styles.cloudDrift}`}>
            <Image
              src="/kevin-li/cloud-figma.png"
              alt=""
              fill
              priority
              sizes="72vw"
            />
          </div>
        </div>
      </div>

      {/* Hint pointing at the cloud; it fades once the links are revealed. */}
      <div
        aria-hidden
        className={`${styles.hint} pointer-events-none absolute flex items-end transition-opacity duration-300 peer-hover:opacity-0 peer-has-[:focus-visible]:opacity-0`}
        style={{ ...place("center", 1200, 620, 460, 150), gap: s(12) }}
      >
        <svg
          viewBox="0 0 120 100"
          fill="none"
          stroke={NAVY}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: s(120), height: s(100) }}
        >
          <path d="M112 88 C 70 92, 30 70, 14 14" />
          <path d="M4 30 L14 12 L30 26" />
        </svg>
        <span
          className={`${jacquesShadow.className} -rotate-6 whitespace-nowrap leading-none`}
          style={{ fontSize: s(48), color: NAVY, marginBottom: s(-8) }}
        >
          hover over me!
        </span>
      </div>

      <div
        className={`${styles.swayLeft} absolute`}
        style={{ ...place("left", -70, 290, 330, 287), filter: PAPER_SHADOW }}
      >
        <Image src="/kevin-li/leaves-left.png" alt="" fill sizes="18vw" />
      </div>
      <div
        className={`${styles.swayRight} absolute`}
        style={{ ...place("right", 1670, 220, 320, 318), filter: PAPER_SHADOW }}
      >
        <Image src="/kevin-li/leaves-right.png" alt="" fill sizes="17vw" />
      </div>

      <h1
        className={`${inika.className} absolute whitespace-pre leading-none`}
        style={{
          ...place("left", INSET + 36, 721),
          fontSize: s(200),
          color: PINK,
          // A slightly misregistered navy layer, like a two-color print.
          textShadow: `${s(7)} ${s(6)} 0 rgb(33 78 146 / 0.85)`,
        }}
      >
        {"KEVIN LI"}
      </h1>

      <div
        className="absolute"
        style={{
          ...place(
            "right",
            DESIGN_WIDTH - INSET - SKY.width,
            BOTTOM - SKY.height,
            SKY.width,
            SKY.height,
          ),
          filter: PAPER_SHADOW,
        }}
      >
        <Image
          src="/kevin-li/sky-clouds-straight.png"
          alt=""
          fill
          sizes="31vw"
        />
      </div>
      <p
        className={`${jacquesShadow.className} absolute -rotate-[13.25deg] whitespace-nowrap leading-normal`}
        style={{
          ...place(
            "right",
            DESIGN_WIDTH - INSET - 575,
            BOTTOM - SKY.height - 24,
            569,
            98,
          ),
          fontSize: s(58),
          color: NAVY,
        }}
      >
        Sophomore @ UCF
      </p>

      <div
        aria-hidden
        className={`${styles.grain} pointer-events-none absolute inset-0 z-20`}
      />
    </section>
  );
}
