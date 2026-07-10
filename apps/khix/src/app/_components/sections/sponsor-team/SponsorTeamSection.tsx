import type { CSSProperties } from "react";
import Image from "next/image";

import type { SponsorShowcaseSponsor } from "../../sponsor-showcase";
import { SponsorShowcase } from "../../sponsor-showcase";
import { TeamCascade } from "../../team-cascade";
import styles from "./SponsorTeamSection.module.css";

const HOMEPAGE_SPONSORS = [
  {
    name: "OneEthos",
    websiteUrl: "https://www.oneethos.com/",
    logoSrc: "/assets/sponsor-logos/oneethos.svg",
    logoScale: 1,
    tier: "golden-dawn",
  },
  {
    name: "AMD",
    websiteUrl: "https://www.amd.com/",
    logoSrc: "/assets/sponsor-logos/amd.svg",
    tier: "silver-moon",
  },
  {
    name: "Databricks",
    websiteUrl: "https://www.databricks.com/",
    logoSrc: "/assets/sponsor-logos/databricks.svg",
    logoScale: 1.12,
    tier: "silver-moon",
  },
  {
    name: "Morgan & Morgan",
    websiteUrl: "https://www.forthepeople.com/",
    logoSrc: "/assets/sponsor-logos/morgan-and-morgan.svg",
    logoScale: 0.94,
    tier: "silver-moon",
  },
  {
    name: "BNY",
    websiteUrl: "https://www.bny.com/",
    logoSrc: "/assets/sponsor-logos/bny.svg",
    tier: "silver-moon",
  },
  {
    name: "NextEra",
    websiteUrl: "https://www.nexteraenergy.com/",
    logoSrc: "/assets/sponsor-logos/nextera.svg",
    logoScale: 1.82,
    mobileLogoScale: 1.35,
    tier: "silver-moon",
  },
  {
    name: "Shinies Props",
    websiteUrl: "https://www.instagram.com/shiniesprops/",
    logoSrc: "/assets/sponsor-logos/shinies.svg",
    tier: "silver-moon",
  },
  {
    name: "Impress Ink",
    websiteUrl: "https://impressink.com/",
    logoSrc: "/assets/sponsor-logos/impressink.png",
    tier: "bronze-ember",
  },
  {
    name: "Codex",
    websiteUrl: "https://openai.com/codex/",
    logoSrc: "/assets/sponsor-logos/codex.svg",
    logoScale: 1.3,
    tier: "bronze-ember",
  },
  {
    name: "RFSmart",
    websiteUrl: "https://www.rfsmart.com/",
    logoSrc: "/assets/sponsor-logos/rfsmart.svg",
    tier: "bronze-ember",
  },
] satisfies SponsorShowcaseSponsor[];

const PARTNERS = [
  {
    name: "UCF College of Engineering and Computer Science",
    logoSrc: "/assets/partners/cecs.svg",
    websiteUrl: "https://www.cecs.ucf.edu/",
  },
  {
    name: "Game Development Knights",
    logoSrc: "/assets/partners/gdk.svg",
    websiteUrl: "https://www.instagram.com/gamedevknights/",
  },
  {
    name: "Girls Who Code",
    logoSrc: "/assets/partners/gwc.svg",
    websiteUrl: "https://www.instagram.com/girlswhocodeucf/",
  },
  {
    name: "Major League Hacking",
    logoSrc: "/assets/partners/mlh.svg",
    websiteUrl: "https://mlh.io/",
  },
  {
    name: "Society of Asian Scientists and Engineers",
    logoSrc: "/assets/partners/sase.svg",
    websiteUrl: "https://www.instagram.com/saseucf/",
  },
  {
    name: "IEEE at UCF",
    logoSrc: "/assets/partners/ieee.svg",
    websiteUrl: "https://www.instagram.com/ieeeucf/",
  },
] as const;

type PartnerCardStyle = CSSProperties & {
  "--float-delay": string;
};

function getPartnerCardStyle(index: number): PartnerCardStyle {
  return {
    "--float-delay": `${-(index % 6) * 0.42}s`,
  };
}

export function SponsorTeamSection() {
  return (
    <div className={styles.waterfallShowcase}>
      <div className={styles.scene} aria-hidden="true" />
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
              {PARTNERS.map((partner, index) => (
                <a
                  key={partner.name}
                  className={styles.partnerStone}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="listitem"
                  aria-label={partner.name}
                  style={getPartnerCardStyle(index)}
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
