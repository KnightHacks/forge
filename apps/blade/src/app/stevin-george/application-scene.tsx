"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

import type { ExternalDestination, LandingDestination } from "./lenny-game";
import { useLennyGame } from "./lenny-game";
import styles from "./stevin-george.module.css";

const assetRoot = "/dev-team/stevin-george";
const resumeUrl = `${assetRoot}/stevin-george-resume.pdf`;
const portfolioUrl = "https://stevin.dev";
const externalLinks = {
  github: "https://github.com/StevScripts",
  linkedin: "https://www.linkedin.com/in/georgestevin/",
} as const;

type Section = "resume" | "portfolio";

function ResumeContent() {
  return (
    <a
      className={styles.resumePreview}
      href={resumeUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.resumeThumb}>
        <Image
          src={`${assetRoot}/stevin-george-resume-preview.jpg`}
          alt="Preview of Stevin George's current resume"
          width={850}
          height={1100}
          sizes="(max-width: 700px) 300px, 205px"
        />
      </span>
      <span className={styles.resumePreviewCopy}>
        <span className={styles.previewEyebrow}>CURRENT RESUME</span>
        <span className={styles.previewTitle}>Experience &amp; projects</span>
        <span className={styles.previewAction}>Open PDF ↗</span>
      </span>
    </a>
  );
}

function PortfolioContent() {
  return (
    <a
      className={styles.portfolioPreview}
      href={portfolioUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit Stevin George's portfolio website"
    >
      <span className={styles.browserBar} aria-hidden="true">
        <span className={styles.browserDots}>● ● ●</span>
        <span>stevin.dev</span>
        <span>↗</span>
      </span>
      <Image
        src={`${assetRoot}/portfolio-preview.jpg`}
        alt="Current screenshot of Stevin George's portfolio website"
        width={1280}
        height={800}
        sizes="(max-width: 700px) calc(100vw - 48px), 440px"
      />
      <span className={styles.browserFooter}>
        <span>Explore the full portfolio</span>
        <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

function PreviewSection({
  section,
  number,
  label,
  open,
  landed,
  onToggle,
}: {
  section: Section;
  number: string;
  label: string;
  open: boolean;
  landed: boolean;
  onToggle: (section: Section) => void;
}) {
  const headingId = `${section}-heading`;
  const panelId = `${section}-panel`;

  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      data-open={open}
      data-landed={landed}
    >
      <h2
        id={headingId}
        className={styles.sectionHeading}
        data-platform={section}
      >
        <button
          className={styles.sectionRow}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(section)}
        >
          <span className={styles.sectionNumber}>{number}</span>
          <span className={styles.sectionTitle}>{label}</span>
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
        id={panelId}
        className={
          section === "resume" ? styles.resumePanel : styles.portfolioPanel
        }
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.panelViewport}>
          <div className={styles.panelContent}>
            {section === "resume" ? <ResumeContent /> : <PortfolioContent />}
          </div>
        </div>
      </div>
      <span className={styles.landingEdge} aria-hidden="true" />
    </section>
  );
}

function SocialLink({
  destination,
  number,
  label,
  landed,
}: {
  destination: ExternalDestination;
  number: string;
  label: string;
  landed: boolean;
}) {
  return (
    <section
      className={`${styles.section} ${styles.linkSection}`}
      data-landed={landed}
    >
      <h2 className={styles.sectionHeading} data-platform={destination}>
        <a
          className={`${styles.sectionRow} ${styles.destinationLink}`}
          href={externalLinks[destination]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${label} in a new tab`}
        >
          <span className={styles.sectionNumber}>{number}</span>
          <span className={styles.sectionTitle}>{label}</span>
          <span className={styles.linkCircle} aria-hidden="true">
            ↗
          </span>
        </a>
      </h2>
      <span className={styles.landingEdge} aria-hidden="true" />
    </section>
  );
}

export function ApplicationScene() {
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const [playing, setPlaying] = useState(false);
  const [spriteReady, setSpriteReady] = useState(false);
  const [landedDestination, setLandedDestination] =
    useState<LandingDestination | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lennyRef = useRef<HTMLButtonElement>(null);
  const spriteRef = useRef<HTMLSpanElement>(null);
  const jumpRequestRef = useRef(false);

  const onLand = useCallback((destination: LandingDestination | null) => {
    setLandedDestination(destination);
    if (destination === "resume" || destination === "portfolio")
      setOpenSection(destination);
  }, []);

  const onVisit = useCallback((destination: ExternalDestination) => {
    window.open(externalLinks[destination], "_blank", "noopener,noreferrer");
  }, []);

  const onExit = useCallback(() => {
    setPlaying(false);
    setSpriteReady(false);
    setLandedDestination(null);
  }, []);

  useLennyGame({
    active: playing,
    sceneRef,
    lennyRef,
    spriteRef,
    jumpRequestRef,
    onLand,
    onVisit,
    onExit,
  });

  function toggleSection(section: Section) {
    setOpenSection((current) => (current === section ? null : section));
  }

  return (
    <div
      className={styles.scene}
      ref={sceneRef}
      data-expanded={openSection !== null}
    >
      <div className={styles.sections}>
        <PreviewSection
          section="resume"
          number="01"
          label="Resume"
          open={openSection === "resume"}
          landed={landedDestination === "resume"}
          onToggle={toggleSection}
        />
        <PreviewSection
          section="portfolio"
          number="02"
          label="Portfolio"
          open={openSection === "portfolio"}
          landed={landedDestination === "portfolio"}
          onToggle={toggleSection}
        />

        <SocialLink
          destination="github"
          number="03"
          label="GitHub"
          landed={landedDestination === "github"}
        />
        <SocialLink
          destination="linkedin"
          number="04"
          label="LinkedIn"
          landed={landedDestination === "linkedin"}
        />
      </div>

      <Image
        src={`${assetRoot}/tree.png`}
        alt=""
        data-tree=""
        width={420}
        height={525}
        className={styles.tree}
      />

      <button
        ref={lennyRef}
        className={styles.lenny}
        type="button"
        aria-label={playing ? "Jump with Lenny" : "Play with Lenny"}
        aria-pressed={playing}
        data-active={playing}
        data-sprite-ready={spriteReady}
        onClick={() => {
          if (playing) jumpRequestRef.current = true;
          else {
            jumpRequestRef.current = true;
            setSpriteReady(false);
            setPlaying(true);
          }
        }}
      >
        <Image
          className={styles.lennyRest}
          src={`${assetRoot}/lenny.png`}
          alt=""
          width={150}
          height={227}
        />
        {playing && (
          <span className={styles.lennySprite} ref={spriteRef}>
            <Image
              src={`${assetRoot}/lenny-walk-sheet.webp`}
              alt=""
              width={984}
              height={1272}
              loading="eager"
              unoptimized
              draggable={false}
              onLoad={() => setSpriteReady(true)}
            />
          </span>
        )}
      </button>

      {playing && (
        <p className={styles.gameHint} role="status">
          <span>← → move · Space jump · Esc exit</span>
          {(landedDestination === "github" ||
            landedDestination === "linkedin") && (
            <span>
              · Enter opens{" "}
              {landedDestination === "github" ? "GitHub" : "LinkedIn"}
            </span>
          )}
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
