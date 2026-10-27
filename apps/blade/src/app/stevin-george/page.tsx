import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, DM_Sans } from "next/font/google";
import Image from "next/image";

import { ApplicationScene } from "./application-scene";
import styles from "./stevin-george.module.css";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--stevin-display-font",
  display: "swap",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--stevin-body-font",
  display: "swap",
});

const handwrittenFont = Caveat({
  subsets: ["latin"],
  variable: "--stevin-handwritten-font",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stevin George | Knight Hacks Dev Team",
  description: "Knight Hacks Developer Team Application",
  alternates: { canonical: "/stevin-george" },
};

export default function StevinGeorgePage() {
  return (
    <main
      className={`${styles.page} ${displayFont.variable} ${bodyFont.variable} ${handwrittenFont.variable}`}
    >
      <div className={styles.content}>
        <section className={styles.intro} aria-labelledby="stevin-name">
          <h1 id="stevin-name" className={styles.name}>
            <span>Stevin</span> <span>George</span>
            <span className={styles.nameDot} aria-hidden="true" />
          </h1>
          <span className={styles.introRule} aria-hidden="true" />
          <p className={styles.description}>
            Knight Hacks Developer Team Application
          </p>
        </section>

        <ApplicationScene />
      </div>

      <div className={styles.grass} aria-hidden="true">
        <Image
          src="/dev-team/stevin-george/grass.png"
          alt=""
          fill
          sizes="100vw"
          priority
        />
      </div>
    </main>
  );
}
