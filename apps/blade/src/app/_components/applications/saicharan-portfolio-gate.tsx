"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import styles from "./saicharan-portfolio.module.css";
import { TechKnightJourney } from "./tech-knight-journey";

export function SaicharanPortfolioGate() {
  const [showPersonalSite, setShowPersonalSite] = useState(false);

  useEffect(() => {
    const syncWithHistory = () => {
      setShowPersonalSite(window.location.hash === "#portfolio");
    };
    syncWithHistory();
    window.addEventListener("popstate", syncWithHistory);
    return () => window.removeEventListener("popstate", syncWithHistory);
  }, []);

  const enterPortfolio = () => {
    window.history.pushState({ portfolio: true }, "", "#portfolio");
    setShowPersonalSite(true);
    window.scrollTo({ left: 0, top: 0 });
  };

  if (showPersonalSite) {
    return (
      <main className={styles.framePage}>
        <iframe
          src="/saicharan-ramineni/site"
          title="Saicharan Ramineni's personal website"
          className={styles.siteFrame}
          referrerPolicy="no-referrer"
          sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <TechKnightJourney />
      <section id="application" className={styles.handoff}>
        <p>Knight Hacks · Dev application 2026—27</p>
        <h2>The rest is better experienced than explained.</h2>
        <button type="button" onClick={enterPortfolio}>
          Enter saicharanramineni.com <ArrowRight aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
