import type { NavbarLink, NavbarSocialLink } from "./_components/navbar";
import { Footer } from "./_components/footer";
import { Navbar } from "./_components/navbar";
import FAQ from "./_components/sections/faq/faq";
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
      <main className={styles.page}>
        <Hero />
        <section
          id="about"
          className={styles.about}
          aria-labelledby="about-title"
        >
          <h2 id="about-title" className={styles.aboutTitle}>
            About
          </h2>
        </section>
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
