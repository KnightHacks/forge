import type { RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
    <section
      ref={journeyRef}
      className={styles.journey}
      aria-label="Saicharan Ramineni's Tech Knight introduction"
    >
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.grid} />
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.grade} />
        <div className={styles.frameMarks} />
      </div>

      <JourneyHeader />

      <div className={styles.identity}>
        <p>Knight Hacks · Developer application 2026—27</p>
        <h1>Saicharan Ramineni</h1>
        <span>Tech Knight</span>
      </div>

      <div className={styles.sequenceLabel} aria-hidden="true">
        <span />
        <p>Event horizon acquired</p>
      </div>
    </section>
  );
}

function JourneyHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Blade home">
        <Image src="/blade-logo.svg" alt="" width={1880} height={375} />
      </Link>
      <nav aria-label="Application navigation">
        <Button asChild variant="outline" className={styles.resumeButton}>
          <a href={RESUME_URL} target="_blank" rel="noreferrer">
            Résumé <ArrowUpRight aria-hidden="true" />
          </a>
        </Button>
      </nav>
    </header>
  );
}
