"use client";

import { useState } from "react";
import Image from "next/image";

import styles from "./stevin-george.module.css";

const assetRoot = "/dev-team/stevin-george";

type Section = "resume" | "portfolio";

const links = [
  { label: "Full portfolio", href: "https://stevin.dev" },
  { label: "GitHub", href: "https://github.com/StevScripts" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/georgestevin/" },
];

export function ApplicationScene() {
  const [openSection, setOpenSection] = useState<Section | null>(null);

  function toggleSection(section: Section) {
    setOpenSection((current) => (current === section ? null : section));
  }

  return (
    <div className={styles.scene}>
      <div className={styles.sections}>
        <section
          className={styles.section}
          aria-labelledby="resume-heading"
          data-open={openSection === "resume"}
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
                      I built the multiplayer app&apos;s foundation and helped
                      connect a real plant sensor to a shared virtual garden.
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
                <nav
                  className={styles.profileLinks}
                  aria-label="Portfolio links"
                >
                  {links.map(({ label, href }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </nav>
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
        priority
      />

      <div className={styles.lenny} aria-hidden="true">
        <Image
          src={`${assetRoot}/lenny.png`}
          alt=""
          width={102}
          height={155}
          priority
        />
      </div>

      <div
        className={styles.clickNote}
        aria-hidden="true"
        data-hidden={openSection === "portfolio"}
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
