import Image from "next/image";

import type { SponsorShowcaseSponsor } from "../../sponsor-showcase";
import { AssetCredit } from "../../assets";
import { SponsorShowcase } from "../../sponsor-showcase";
import { TeamCascade } from "../../team-cascade";
import styles from "./SponsorTeamSection.module.css";
import { WaterfallAtmosphere } from "./WaterfallAtmosphere";

const HOMEPAGE_SPONSORS = [
  {
    name: "OneEthos",
    websiteUrl: "https://www.oneethos.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-oneethos.svg",
    logoScale: 1,
    mobileLogoScale: 1.2,
    tier: "golden-dawn",
  },
  {
    name: "AMD",
    websiteUrl: "https://www.amd.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-amd.svg",
    tier: "silver-moon",
  },
  {
    name: "BNY",
    websiteUrl: "https://www.bny.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-bny.svg",
    tier: "silver-moon",
  },
  {
    name: "Databricks",
    websiteUrl: "https://www.databricks.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-databricks.svg",
    logoScale: 1.65,
    mobileLogoScale: 1.65,
    tier: "silver-moon",
  },
  {
    name: "Morgan & Morgan",
    websiteUrl: "https://www.forthepeople.com/",
    logoSrc:
      "https://assets.knighthacks.org/khix/sponsor-morgan-and-morgan.svg",
    logoScale: 0.94,
    mobileLogoScale: 1.15,
    preserveLogoContrast: true,
    tier: "silver-moon",
  },
  {
    name: "NextEra",
    websiteUrl: "https://www.nexteraenergy.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-nextera.svg",
    logoScale: 1.82,
    mobileLogoScale: 1.75,
    tier: "silver-moon",
  },
  {
    name: "Shinies Props",
    websiteUrl: "https://www.shinies.co/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-shinies.svg",
    logoScale: 1.24,
    mobileLogoScale: 1.2,
    tier: "silver-moon",
  },
  {
    name: "Codex",
    websiteUrl: "https://openai.com/codex/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-codex.svg",
    logoScale: 2,
    mobileLogoScale: 1.7,
    tier: "bronze-ember",
  },
  {
    name: "Impress Ink",
    websiteUrl: "https://impressink.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-impressink.png",
    logoScale: 1.25,
    mobileLogoScale: 1,
    tier: "bronze-ember",
  },
  {
    name: "RFSmart",
    websiteUrl: "https://www.rfsmart.com/",
    logoSrc: "https://assets.knighthacks.org/khix/sponsor-rfsmart.svg",
    logoScale: 1.25,
    mobileLogoScale: 1.2,
    tier: "bronze-ember",
  },
] satisfies SponsorShowcaseSponsor[];

const PARTNERS = [
  {
    name: "UCF College of Engineering and Computer Science",
    logoSrc: "https://assets.knighthacks.org/khix/partner-cecs.svg",
    websiteUrl: "https://www.cecs.ucf.edu/",
  },
  {
    name: "Game Development Knights",
    logoSrc: "https://assets.knighthacks.org/khix/partner-gdk.svg",
    preserveLogoContrast: true,
    websiteUrl: "https://www.instagram.com/gamedevknights/",
  },
  {
    name: "Girls Who Code",
    logoSrc: "https://assets.knighthacks.org/khix/partner-gwc.svg",
    websiteUrl: "https://www.instagram.com/girlswhocodeucf/",
  },
  {
    name: "IEEE at UCF",
    logoSrc: "https://assets.knighthacks.org/khix/partner-ieee.svg",
    websiteUrl: "https://www.instagram.com/ieeeucf/",
  },
  {
    name: "Major League Hacking",
    logoSrc: "https://assets.knighthacks.org/khix/partner-mlh.svg",
    websiteUrl: "https://mlh.io/",
  },
  {
    name: "Society of Asian Scientists and Engineers",
    logoSrc: "https://assets.knighthacks.org/khix/partner-sase.svg",
    websiteUrl: "https://www.instagram.com/saseucf/",
  },
] as const;

export function SponsorTeamSection() {
  return (
    <div className={styles.waterfallShowcase}>
      <AssetCredit
        className={styles.waterfallTransition}
        label="Separator art by"
        credits={[
          {
            name: "Adrian Osorio",
            href: "https://www.linkedin.com/in/adrianosoriob/",
          },
        ]}
      >
        <div className={styles.sponsorRockSeparator} />
      </AssetCredit>
      <div className={styles.scene} aria-hidden="true">
        <span className={`${styles.sceneAsset} ${styles.rocksTop}`} />
        <span className={`${styles.sceneAsset} ${styles.rocksBottom}`} />
        <span className={`${styles.sceneAsset} ${styles.waterfallOne}`} />
        <span className={`${styles.sceneAsset} ${styles.waterfallTwo}`} />
        <span className={`${styles.sceneAsset} ${styles.waterfallThree}`} />
      </div>
      <WaterfallAtmosphere />
      <div className={styles.bridge} aria-hidden="true" />

      <div className={styles.content}>
        <section
          id="sponsors"
          className={styles.sponsorPanel}
          aria-labelledby="sponsors-title"
        >
          <SponsorShowcase
            sponsors={HOMEPAGE_SPONSORS}
            title="Sponsors"
            titleId="sponsors-title"
            className={styles.sponsorShowcase}
          />

          <div className={styles.partnerGroup}>
            <h2 id="partners-title" className={styles.sectionTitle}>
              Partners
            </h2>
            <div
              className={styles.partnerGrid}
              aria-labelledby="partners-title"
              role="list"
            >
              {PARTNERS.map((partner) => (
                <a
                  key={partner.name}
                  className={styles.partnerStone}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="listitem"
                  aria-label={partner.name}
                  data-preserve-logo-contrast={
                    "preserveLogoContrast" in partner ? "true" : undefined
                  }
                >
                  <span className={styles.partnerVisual} aria-hidden="true">
                    <span className={styles.partnerRock} aria-hidden="true" />
                    <span className={styles.partnerLogo}>
                      <Image
                        src={partner.logoSrc}
                        alt=""
                        fill
                        className={styles.partnerLogoImage}
                        sizes="(max-width: 420px) 35vw, 16rem"
                        unoptimized
                      />
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section
          id="team"
          className={styles.teamPanel}
          aria-labelledby="team-title"
        >
          <h2 id="team-title" className={styles.sectionTitle}>
            Team
          </h2>
          <TeamCascade className={styles.teamCascade} />
        </section>
      </div>
    </div>
  );
}
