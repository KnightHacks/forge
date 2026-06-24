import type { NavbarLink, NavbarSocialLink } from "./_components/navbar";
import { Navbar } from "./_components/navbar";
import Hero from "./_components/sections/hero";
import styles from "./page.module.css";

const NAV_LINKS = [{ label: "Home", href: "#home" }] satisfies NavbarLink[];

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
        <section
          id="about"
          className={styles.afterHero}
          aria-label="About Knight Hacks IX"
        />
      </main>
    </>
  );
}
