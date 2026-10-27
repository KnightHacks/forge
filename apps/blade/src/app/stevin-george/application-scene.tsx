"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

import type { LandingSection } from "./lenny-game";
import { useLennyGame } from "./lenny-game";
import styles from "./stevin-george.module.css";

const assetRoot = "/dev-team/stevin-george";
const lennyFrames = Array.from(
  { length: 16 },
  (_, index) =>
    `${assetRoot}/lenny-frames/frame-${String(index + 1).padStart(2, "0")}.webp`,
);

type Section = LandingSection;

const links = [
  { label: "Full portfolio", href: "https://stevin.dev" },
  { label: "GitHub", href: "https://github.com/StevScripts" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/georgestevin/" },
];

function PortfolioContent() {
  return (
    <>
      <p className={styles.eyebrow}>SELECTED WORK</p>
      <div className={styles.project}>
        <a
          className={styles.projectImageLink}
          href="https://devpost.com/software/greghouse"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View greghouse on Devpost"
        >
          <Image
            src={`${assetRoot}/greghouse.webp`}
            alt="A plant sensor beside the greghouse multiplayer garden"
            width={960}
            height={737}
            sizes="(max-width: 700px) calc(100vw - 48px), 176px"
          />
        </a>
        <div className={styles.projectCopy}>
          <h3>greghouse</h3>
          <p>
            I built the multiplayer app&apos;s foundation and helped connect a
            real plant sensor to a shared virtual garden.
          </p>
          <a
            className={styles.projectLink}
            href="https://devpost.com/software/greghouse"
            target="_blank"
            rel="noopener noreferrer"
          >
            View project <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <nav className={styles.profileLinks} aria-label="Portfolio links">
        {links.map(({ label, href }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer">
            {label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>
    </>
  );
}

export function ApplicationScene() {
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const [playing, setPlaying] = useState(false);
  const [landedSection, setLandedSection] = useState<Section | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lennyRef = useRef<HTMLButtonElement>(null);
  const framesRef = useRef<HTMLSpanElement>(null);
  const jumpRequestRef = useRef(false);

  const onLand = useCallback((section: Section | null) => {
    setLandedSection(section);
    if (section) setOpenSection(section);
  }, []);

  const onExit = useCallback(() => {
    setPlaying(false);
    setLandedSection(null);
  }, []);

  useLennyGame({
    active: playing,
    sceneRef,
    lennyRef,
    framesRef,
    jumpRequestRef,
    onLand,
    onExit,
  });

  function toggleSection(section: Section) {
    setOpenSection((current) => (current === section ? null : section));
  }

  return (
    <div className={styles.scene} ref={sceneRef}>
      <div className={styles.sections}>
        <section
          className={styles.section}
          aria-labelledby="resume-heading"
          data-open={openSection === "resume"}
          data-landed={landedSection === "resume"}
        >
          <h2 id="resume-heading" className={styles.sectionHeading}>
            <button
              className={styles.sectionRow}
              type="button"
              aria-expanded={openSection === "resume"}
              aria-controls="resume-panel"
              onClick={() => toggleSection("resume")}
            >
              <span className={styles.sectionNumber}>01</span>
              <span className={styles.sectionTitle}>Resume</span>
              <span className={styles.chevronCircle} aria-hidden="true">
                <Image
                  src={`${assetRoot}/chevron.svg`}
                  alt=""
                  width={24}
                  height={24}
                />
              </span>
            </button>
          </h2>
          <div
            id="resume-panel"
            className={styles.resumePanel}
            role="region"
            aria-labelledby="resume-heading"
            aria-hidden={openSection !== "resume"}
            inert={openSection !== "resume"}
          >
            <div className={styles.panelViewport}>
              <div className={styles.panelContent}>
                <a
                  className={styles.resumeLink}
                  href="https://stevin.dev/Stevins_s_Resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View resume PDF</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
          <span className={styles.landingEdge} aria-hidden="true" />
        </section>

        <section
          className={styles.section}
          aria-labelledby="portfolio-heading"
          data-open={openSection === "portfolio"}
          data-landed={landedSection === "portfolio"}
        >
          <h2 id="portfolio-heading" className={styles.sectionHeading}>
            <button
              className={styles.sectionRow}
              type="button"
              aria-expanded={openSection === "portfolio"}
              aria-controls="portfolio-panel"
              onClick={() => toggleSection("portfolio")}
            >
              <span className={styles.sectionNumber}>02</span>
              <span className={styles.sectionTitle}>Portfolio</span>
              <span className={styles.chevronCircle} aria-hidden="true">
                <Image
                  src={`${assetRoot}/chevron.svg`}
                  alt=""
                  width={24}
                  height={24}
                />
              </span>
            </button>
          </h2>
          <div
            id="portfolio-panel"
            className={styles.portfolioPanel}
            role="region"
            aria-labelledby="portfolio-heading"
            aria-hidden={openSection !== "portfolio"}
            inert={openSection !== "portfolio"}
          >
            <div className={styles.panelViewport}>
              <div className={styles.panelContent}>
                <PortfolioContent />
              </div>
            </div>
          </div>
          <span className={styles.landingEdge} aria-hidden="true" />
        </section>
      </div>

      <Image
        src={`${assetRoot}/tree.png`}
        alt=""
        width={336}
        height={420}
        className={styles.tree}
      />

      <button
        ref={lennyRef}
        className={styles.lenny}
        type="button"
        aria-label={playing ? "Jump with Lenny" : "Play with Lenny"}
        aria-pressed={playing}
        data-active={playing}
        onClick={() => {
          if (playing) jumpRequestRef.current = true;
          else {
            jumpRequestRef.current = true;
            setPlaying(true);
          }
        }}
      >
        {playing ? (
          <span className={styles.lennyFrames} ref={framesRef}>
            {lennyFrames.map((src, index) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={230}
                height={298}
                loading="eager"
                unoptimized
                draggable={false}
                style={{ opacity: index === 9 ? 1 : 0 }}
              />
            ))}
          </span>
        ) : (
          <Image
            className={styles.lennyRest}
            src={`${assetRoot}/lenny.png`}
            alt=""
            width={102}
            height={155}
          />
        )}
      </button>

      {playing && (
        <p className={styles.gameHint} role="status">
          <span>← → or A D to move · Space or ↑ to jump</span>
          <span>Land on a heading to open it · Esc to exit</span>
        </p>
      )}

      <div
        className={styles.clickNote}
        aria-hidden="true"
        data-hidden={playing || openSection === "portfolio"}
      >
        <Image
          src={`${assetRoot}/pointer.svg`}
          alt=""
          width={62}
          height={48}
          className={styles.pointer}
        />
        <span>Click me!</span>
      </div>
    </div>
  );
}
