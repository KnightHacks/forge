import { Footer } from "./_components/footer";
import { Navbar } from "./_components/navbar";
import {
  KHIX_HOME_NAV_LINKS,
  KHIX_SOCIAL_LINKS,
} from "./_components/navbar/site-navigation";
import { AboutCorruption, AboutSection } from "./_components/sections/about";
import FAQ from "./_components/sections/faq/faq";
import Hero from "./_components/sections/hero";
import {
  KHIX_SPEAKERS,
  PondAtmosphere,
  SpeakerShowcase,
} from "./_components/sections/speakers";
import { SponsorTeamSection } from "./_components/sections/sponsor-team";
import { TracksSection } from "./_components/sections/tracks";
import styles from "./page.module.css";

export default function Page() {
  return (
    <>
      <Navbar links={KHIX_HOME_NAV_LINKS} socialLinks={KHIX_SOCIAL_LINKS} />
      <main className={styles.page}>
        <Hero />
        <div className={styles.sectionStack}>
          <div className={styles.foregroundRegion}>
            <AboutCorruption />
            <AboutSection />
            <TracksSection />
            <div id="speakers" className={styles.speakersSection}>
              <PondAtmosphere className={styles.pondAtmosphere} />
              <SpeakerShowcase
                speakers={KHIX_SPEAKERS}
                titleId="speakers-title"
              />
            </div>
          </div>
          <SponsorTeamSection />
          <div className={styles.waterfallFaqSeparator} aria-hidden="true" />
          <FAQ />
        </div>
      </main>
      <Footer />
    </>
  );
}
