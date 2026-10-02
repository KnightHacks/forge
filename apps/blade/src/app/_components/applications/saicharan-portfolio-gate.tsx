"use client";

import { useCallback, useEffect, useState } from "react";
import { FastForward } from "lucide-react";

import styles from "./saicharan-portfolio.module.css";
import { TechKnightJourney } from "./tech-knight-journey";

export function SaicharanPortfolioGate() {
  const [cinemaComplete, setCinemaComplete] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [revealRequested, setRevealRequested] = useState(false);
  const revealPortfolio = revealRequested && portfolioReady;

  useEffect(() => {
    const timeout = window.setTimeout(() => setPortfolioReady(true), 3000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!revealPortfolio) return;
    const timeout = window.setTimeout(() => setCinemaComplete(true), 2700);
    return () => window.clearTimeout(timeout);
  }, [revealPortfolio]);

  const requestReveal = useCallback(() => setRevealRequested(true), []);
  const useReducedMotion = useCallback(() => setReducedMotion(true), []);

  return (
    <main
      className={styles.page}
      data-reveal={revealPortfolio}
      data-complete={cinemaComplete}
    >
      <section
        className={styles.framePage}
        aria-label="Saicharan Ramineni's personal website"
        aria-hidden={!revealPortfolio}
      >
        <iframe
          src="/saicharan-ramineni/site"
          title="Saicharan Ramineni's personal website"
          className={styles.siteFrame}
          referrerPolicy="no-referrer"
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          tabIndex={revealPortfolio ? 0 : -1}
          onLoad={() => setPortfolioReady(true)}
        />
      </section>

      {!cinemaComplete && (
        <div className={styles.cinemaLayer}>
          <TechKnightJourney
            portfolioReady={portfolioReady}
            onFailure={requestReveal}
            onReducedMotion={useReducedMotion}
            onReveal={requestReveal}
          />
        </div>
      )}

      <div className={styles.portalRim} aria-hidden="true" />

      {!revealPortfolio && (
        <button
          type="button"
          className={styles.skipButton}
          onClick={requestReveal}
          disabled={revealRequested && !portfolioReady}
        >
          {revealRequested && !portfolioReady
            ? "Preparing portfolio"
            : reducedMotion
              ? "Enter portfolio"
              : "Skip intro"}
          <FastForward aria-hidden="true" />
        </button>
      )}

      <p className={styles.loadingStatus} aria-live="polite">
        {portfolioReady ? "Portfolio ready" : "Loading portfolio"}
      </p>
    </main>
  );
}
