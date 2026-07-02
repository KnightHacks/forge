import type { Metadata } from "next";
import Link from "next/link";

import { AssetCredit } from "../_components/assets";
import { TeamCascade } from "../_components/team-cascade";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "KHIX Component Test",
  robots: {
    index: false,
    follow: false,
  },
};

const SAMPLE_CREDITS = [
  {
    name: "Design Team",
  },
  {
    name: "Knight Hacks",
    href: "https://knighthacks.org",
  },
];

const SWATCHES = [
  { name: "Moss", value: "#eef6cf" },
  { name: "Mint", value: "#c9f4d8" },
  { name: "Violet", value: "#8f5bf5" },
  { name: "Lagoon", value: "#67e4ff" },
  { name: "Ink", value: "#172033" },
];

export default function TestPage() {
  return (
    <main className={styles.testPage}>
      <section className={styles.scratchHeader} aria-labelledby="test-title">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>KHIX scratch</p>
          <h1 id="test-title">Component test page</h1>
        </div>
      </section>

      <section
        id="team-cascade"
        className={`${styles.section} ${styles.teamSection}`}
        aria-labelledby="team-cascade-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Public roster</p>
          <h2 id="team-cascade-title">Team cascade</h2>
        </div>

        <TeamCascade className={styles.teamCascadeBox} />
      </section>

      <section
        id="components"
        className={styles.section}
        aria-labelledby="components-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Component bench</p>
          <h2 id="components-title">Responsive slots</h2>
        </div>

        <div className={styles.componentGrid}>
          <article className={styles.previewPanel}>
            <div className={styles.panelHeader}>
              <span>Primary canvas</span>
              <span>Fluid</span>
            </div>
            <div className={styles.componentMount}>
              <div className={styles.placeholder}>
                <span className={styles.placeholderKicker}>Drop-in slot</span>
                <strong>Import a new component here</strong>
              </div>
            </div>
          </article>

          <article className={`${styles.previewPanel} ${styles.darkPanel}`}>
            <div className={styles.panelHeader}>
              <span>Dark canvas</span>
              <span>Contrast</span>
            </div>
            <div className={styles.componentMount}>
              <button className={styles.primaryButton}>Register</button>
              <button className={styles.secondaryButton}>Schedule</button>
            </div>
          </article>

          <article className={`${styles.previewPanel} ${styles.imagePanel}`}>
            <div className={styles.panelHeader}>
              <span>Scene canvas</span>
              <span>Overlay</span>
            </div>
            <div className={styles.componentMount}>
              <AssetCredit credits={SAMPLE_CREDITS}>Forest layer</AssetCredit>
            </div>
          </article>
        </div>
      </section>

      <section
        id="surfaces"
        className={`${styles.section} ${styles.surfaceSection}`}
        aria-labelledby="surfaces-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Visual system</p>
          <h2 id="surfaces-title">Surfaces and type</h2>
        </div>

        <div className={styles.surfaceGrid}>
          <article className={styles.typeSpec}>
            <p className={styles.displayText}>Knight Hacks IX</p>
            <p className={styles.bodyText}>
              Build against long text, compact spacing, and responsive line
              breaks before a component reaches the homepage.
            </p>
          </article>

          <article className={styles.swatchPanel}>
            {SWATCHES.map((swatch) => (
              <span key={swatch.name} className={styles.swatchItem}>
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: swatch.value }}
                />
                {swatch.name}
              </span>
            ))}
          </article>
        </div>
      </section>

      <section
        id="states"
        className={styles.section}
        aria-labelledby="states-title"
      >
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Interaction states</p>
          <h2 id="states-title">Controls</h2>
        </div>

        <div className={styles.stateGrid}>
          <button className={styles.primaryButton}>Default</button>
          <button className={styles.primaryButton} data-state="hover">
            Hover
          </button>
          <button className={styles.primaryButton} disabled>
            Disabled
          </button>
          <Link className={styles.textLink} href="/">
            Back to site
          </Link>
        </div>
      </section>
    </main>
  );
}
