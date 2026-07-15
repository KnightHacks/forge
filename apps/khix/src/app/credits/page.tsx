import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Linkedin } from "lucide-react";

import { Footer } from "../_components/footer";
import { Navbar } from "../_components/navbar";
import {
  KHIX_SITE_NAV_LINKS,
  KHIX_SOCIAL_LINKS,
} from "../_components/navbar/site-navigation";
import { SITE_URL } from "../seo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Credits | Knight Hacks IX",
  description:
    "Meet the artists and designers who brought the world of Knight Hacks IX to life.",
  alternates: {
    canonical: "/credits",
  },
  openGraph: {
    title: "Credits | Knight Hacks IX",
    description:
      "Meet the artists and designers who brought the world of Knight Hacks IX to life.",
    url: `${SITE_URL}/credits`,
  },
};

interface Contributor {
  name: string;
  linkedin: string;
}

interface CreditGroup {
  discipline: string;
  contributors: readonly Contributor[];
}

const CREDIT_GROUPS: readonly CreditGroup[] = [
  {
    discipline: "About",
    contributors: [
      {
        name: "Adrian Osorio",
        linkedin: "https://www.linkedin.com/in/adrianosoriob/",
      },
    ],
  },
  {
    discipline: "Branches and Leaves",
    contributors: [
      {
        name: "Dalia Zamora",
        linkedin: "https://www.linkedin.com/in/dalia-l-zamora/",
      },
    ],
  },
  {
    discipline: "Creatures",
    contributors: [
      {
        name: "Elena Houser",
        linkedin: "https://www.linkedin.com/in/elena-houser-68824b379/",
      },
    ],
  },
  {
    discipline: "Crystals",
    contributors: [
      {
        name: "Thomas Ha",
        linkedin: "https://www.linkedin.com/in/thomas-ha-2b575a30b/",
      },
    ],
  },
  {
    discipline: "Hero",
    contributors: [
      {
        name: "Bowen Groff",
        linkedin: "https://www.linkedin.com/in/bowengroff/",
      },
    ],
  },
  {
    discipline: "Lenny",
    contributors: [
      {
        name: "Gabriela Zambrano",
        linkedin: "https://www.linkedin.com/in/gabriela-zambrano-7074363b4/",
      },
    ],
  },
  {
    discipline: "Logo",
    contributors: [
      {
        name: "Amira Bhuiyan",
        linkedin: "https://www.linkedin.com/in/amirabhuiyan/",
      },
    ],
  },
  {
    discipline: "UI Prototyping / Figma",
    contributors: [
      {
        name: "Chrystel Geno",
        linkedin: "https://www.linkedin.com/in/chrystelgeno/",
      },
      {
        name: "Kaitlyn Awai",
        linkedin: "https://www.linkedin.com/in/kaitlyn-awai-6503b8286/",
      },
      {
        name: "Nora Hashem",
        linkedin: "https://www.linkedin.com/in/nora-h-4b2464269/",
      },
      {
        name: "Shade Rahman",
        linkedin: "https://www.linkedin.com/in/shaderahman/",
      },
      {
        name: "Thashin Bhuiyan",
        linkedin: "https://www.linkedin.com/in/thashin04/",
      },
    ],
  },
  {
    discipline: "Waterfall",
    contributors: [
      {
        name: "Kauan Lima",
        linkedin: "https://www.linkedin.com/in/thekauanlima/",
      },
    ],
  },
];

export default function CreditsPage() {
  return (
    <>
      <Navbar
        links={KHIX_SITE_NAV_LINKS}
        socialLinks={KHIX_SOCIAL_LINKS}
        homeHref="/"
      />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="credits-title">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <Image
              src="https://assets.knighthacks.org/khix/khlogo.svg"
              alt="Knight Hacks IX"
              width={1858}
              height={666}
              className={styles.wordmark}
              priority
            />
            <p className={styles.eyebrow}>Made by many hands</p>
            <h1 id="credits-title">Credits</h1>
            <p className={styles.intro}>
              Meet the artists and designers who shaped the world of Knight
              Hacks IX.
            </p>
          </div>

          <div className={styles.lennyScene} aria-hidden="true">
            <span className={styles.lennyGlow} />
            <picture className={styles.lenny}>
              <source
                media="(prefers-reduced-motion: reduce)"
                srcSet="https://assets.knighthacks.org/khix/faq-lennyblink-Frame%201.webp"
              />
              <Image
                src="https://assets.knighthacks.org/khix/faq-lennyblink-lennyblink.webp"
                alt=""
                width={2667}
                height={3318}
                className={styles.lennyImage}
                priority
                unoptimized
              />
            </picture>
          </div>

          <a className={styles.scrollCue} href="#credit-roll">
            <span>Meet the makers</span>
            <span className={styles.scrollLine} aria-hidden="true" />
          </a>
        </section>

        <section
          id="credit-roll"
          className={styles.creditRoll}
          aria-labelledby="credit-roll-title"
        >
          <div className={styles.sectionHeading}>
            <p>09 parts of the world</p>
            <h2 id="credit-roll-title">The hands behind the magic.</h2>
          </div>

          <ol className={styles.creditList}>
            {CREDIT_GROUPS.map((group, index) => (
              <li className={styles.creditRow} key={group.discipline}>
                <span className={styles.index} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{group.discipline}</h3>
                <ul className={styles.contributors}>
                  {group.contributors.map((contributor) => (
                    <li key={contributor.name}>
                      <a
                        href={contributor.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${contributor.name} on LinkedIn (opens in a new tab)`}
                      >
                        <span>{contributor.name}</span>
                        <Linkedin aria-hidden="true" strokeWidth={1.8} />
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className={styles.closingNote}>
            <p>Thank you for making our little world feel alive.</p>
            <Link href="/">Return to the forest</Link>
          </div>
        </section>
        <div className={styles.forestFloor} aria-hidden="true" />
      </main>
      <Footer />
    </>
  );
}
