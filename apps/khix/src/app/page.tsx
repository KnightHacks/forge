import type { NavbarLink, NavbarSocialLink } from "./_components/navbar";
import { Navbar } from "./_components/navbar";
import { AboutCorruption, AboutSection } from "./_components/sections/about";
import { SectionGrass } from "./_components/sections/grass";
import Hero from "./_components/sections/hero";
import styles from "./page.module.css";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Tracks", href: "#tracks" },
  { label: "Speakers", href: "#speakers" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "Team", href: "#team" },
  { label: "FAQ", href: "#faq" },
] satisfies NavbarLink[];

const SOCIAL_LINKS = [
  {
    label: "Knight Hacks on Instagram",
    href: "https://www.instagram.com/knighthacks/",
    shortLabel: "ig",
  },
] satisfies NavbarSocialLink[];

export default function Page() {
  return (
    <>
      <Navbar links={NAV_LINKS} socialLinks={SOCIAL_LINKS} />
      <main>
        <Hero />
        <div className={styles.sectionStack}>
          <AboutCorruption />
          <SectionGrass />
          <AboutSection />
          <section
            id="tracks"
            className={styles.openSection}
            aria-labelledby="tracks-title"
          >
            <h2 id="tracks-title" className={styles.openSectionTitle}>
              Tracks
            </h2>
          </section>
          <section
            id="speakers"
            className={styles.openSection}
            aria-labelledby="speakers-title"
          >
            <h2 id="speakers-title" className={styles.openSectionTitle}>
              Speakers
            </h2>
          </section>
          <section
            id="sponsors"
            className={styles.openSection}
            aria-labelledby="sponsors-title"
          >
            <h2 id="sponsors-title" className={styles.openSectionTitle}>
              Sponsors
            </h2>
          </section>
          <section
            id="team"
            className={styles.openSection}
            aria-labelledby="team-title"
          >
            <h2 id="team-title" className={styles.openSectionTitle}>
              Team
            </h2>
          </section>
          <section
            id="faq"
            className={styles.openSection}
            aria-labelledby="faq-title"
          >
            <h2 id="faq-title" className={styles.openSectionTitle}>
              FAQ
            </h2>
          </section>
        </div>
      </main>
    </>
  );
}
