import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Footer } from "../footer";
import { Navbar } from "../navbar";
import {
  KHIX_SITE_NAV_LINKS,
  KHIX_SOCIAL_LINKS,
} from "../navbar/site-navigation";
import Hero from "../sections/hero";
import styles from "./KhixPublicNotFound.module.css";

export function KhixPublicNotFound() {
  return (
    <>
      <Navbar
        homeHref="/"
        links={KHIX_SITE_NAV_LINKS}
        socialLinks={KHIX_SOCIAL_LINKS}
      />
      <main className={styles.notFoundPage}>
        <div className={styles.heroScene} aria-hidden="true">
          <Hero />
          <span className={styles.sceneMist} />
        </div>
        <section className={styles.content} aria-labelledby="khix-404-title">
          <div className={styles.copy}>
            <h1 id="khix-404-title" className={styles.title}>
              Page not found
            </h1>
            <p className={styles.body}>You've ventured out of the forest.</p>
            <Link
              className={styles.returnLink}
              href="/"
              aria-label="Return to the enchanted forest"
            >
              <ArrowLeft className={styles.returnIcon} aria-hidden="true" />
              <span className={styles.returnText}>
                Return to the enchanted forest
              </span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
