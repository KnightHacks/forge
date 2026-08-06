import type { CSSProperties } from "react";

import styles from "./CaveBugs.module.css";

type BugColor = "cyan" | "purple" | "yellow" | "green";

interface BugConfig {
  /** Cave-bug tint. */
  color: BugColor;
  /** Vertical placement, 0 (top of the band) to 1 (bottom). The band's actual
   * top/bottom bounds are set in CSS and widen on mobile. */
  band: number;
  /** Relative body size (1 = base). */
  scale: number;
  /** Seconds for one full crawl across the footer. */
  duration: number;
  /** Negative delay so bugs are already mid-crawl on first paint. */
  delay: number;
  /** Crawl direction. */
  direction: "ltr" | "rtl";
}

// A loose scattering of critters at different depths, speeds, and tints so the
// swarm never looks like it marches in lockstep.
const BUGS: BugConfig[] = [
  {
    color: "cyan",
    band: 0.75,
    scale: 1.05,
    duration: 26,
    delay: -4,
    direction: "ltr",
  },
  {
    color: "purple",
    band: 0.31,
    scale: 0.8,
    duration: 34,
    delay: -18,
    direction: "rtl",
  },
  {
    color: "yellow",
    band: 1,
    scale: 0.9,
    duration: 22,
    delay: -11,
    direction: "ltr",
  },
  {
    color: "green",
    band: 0.5,
    scale: 1.15,
    duration: 38,
    delay: -30,
    direction: "rtl",
  },
  {
    color: "cyan",
    band: 0,
    scale: 0.7,
    duration: 30,
    delay: -8,
    direction: "rtl",
  },
  {
    color: "yellow",
    band: 0.16,
    scale: 1,
    duration: 28,
    delay: -21,
    direction: "ltr",
  },
  {
    color: "purple",
    band: 0.94,
    scale: 0.85,
    duration: 24,
    delay: -14,
    direction: "ltr",
  },
];

function Bug({ config }: { config: BugConfig }) {
  const style = {
    "--bug-band": config.band,
    "--bug-scale": config.scale,
    "--bug-duration": `${config.duration}s`,
    "--bug-delay": `${config.delay}s`,
  } as CSSProperties;

  return (
    <span
      className={styles.bug}
      data-color={config.color}
      data-direction={config.direction}
      style={style}
    >
      <span className={styles.bugBob}>
        <svg
          className={styles.bugSvg}
          viewBox="0 0 120 70"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Antennae */}
          <path
            className={styles.antenna}
            d="M84 26 C96 16 104 12 110 8"
            fill="none"
          />
          <path
            className={styles.antenna}
            d="M84 34 C96 40 104 42 111 44"
            fill="none"
          />

          {/* Legs — two phase groups scuttle out of step */}
          <g className={`${styles.legs} ${styles.legsA}`}>
            <path d="M52 44 L40 62" />
            <path d="M64 46 L60 64" />
            <path d="M52 26 L40 8" />
          </g>
          <g className={`${styles.legs} ${styles.legsB}`}>
            <path d="M64 24 L60 6" />
            <path d="M40 44 L24 60" />
            <path d="M40 26 L24 10" />
          </g>

          {/* Body */}
          <ellipse className={styles.body} cx="48" cy="35" rx="30" ry="19" />
          {/* Back segmentation seams */}
          <path className={styles.seam} d="M40 18 Q40 35 40 52" fill="none" />
          <path className={styles.seam} d="M28 20 Q26 35 28 50" fill="none" />
          {/* Head */}
          <circle className={styles.head} cx="82" cy="30" r="14" />
        </svg>
      </span>
    </span>
  );
}

export function CaveBugs() {
  return (
    <div className={styles.swarm} aria-hidden="true">
      {BUGS.map((config, index) => (
        <Bug key={index} config={config} />
      ))}
    </div>
  );
}
