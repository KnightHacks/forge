import { Footer } from "./_components/footer";
import { Navbar } from "./_components/navbar";
import {
  KHIX_HOME_NAV_LINKS,
  KHIX_SOCIAL_LINKS,
} from "./_components/navbar/site-navigation";
import { AboutCorruption, AboutSection } from "./_components/sections/about";
import FAQ from "./_components/sections/faq/faq";
import { SectionGrass } from "./_components/sections/grass";
import Hero from "./_components/sections/hero";
import { SponsorTeamSection } from "./_components/sections/sponsor-team";
import styles from "./page.module.css";

export default function Page() {
  return (
    <>
      <Navbar links={KHIX_HOME_NAV_LINKS} socialLinks={KHIX_SOCIAL_LINKS} />
      <main className={styles.page}>
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
          <SponsorTeamSection />
          <FAQ />
        </div>
      </main>
      <Footer />
    </>
  );
}
