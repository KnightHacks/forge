import type { RefObject } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";

import { Button } from "@forge/ui/button";

import styles from "./tech-knight-journey.module.css";

const RESUME_URL =
  "https://saicharanramineni.com/resume/Saicharan_Ramineni_Resume.pdf?v=e8067b1004f2";

export function JourneyMarkup({
  journeyRef,
  canvasRef,
}: {
  journeyRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <section ref={journeyRef} id="top" className={styles.journey}>
      <div className={styles.sticky}>
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.wordmark}>
            <p>THE 2026—27 DEV APPLICATION OF</p>
            <h1>
              <span>SAICHARAN</span>
              <span>RAMINENI</span>
            </h1>
          </div>
          <canvas ref={canvasRef} className={styles.canvas} />
          <div className={styles.grade} />
        </div>

        <JourneyHeader />
        <a href="#application" className={styles.continueLink}>
          Continue <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function JourneyHeader() {
  return (
    <header className={styles.header}>
      <a href="#top" className={styles.brand}>
        <Image src="/blade-logo.svg" alt="Blade" width={1880} height={375} />
      </a>
      <nav aria-label="Application navigation">
        <a href="#application">Application</a>
        <Button asChild variant="outline" className={styles.resumeButton}>
          <a href={RESUME_URL} target="_blank" rel="noreferrer">
            Résumé <ArrowUpRight aria-hidden="true" />
          </a>
        </Button>
      </nav>
    </header>
  );
}
