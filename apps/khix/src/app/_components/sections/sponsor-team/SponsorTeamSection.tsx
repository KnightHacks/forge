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
    tier: "silver-moon",
  },
  {
    name: "RFSmart",
    websiteUrl: "https://www.rfsmart.com/",
    logoSrc: "/assets/sponsor-logos/rfsmart.svg",
    tier: "bronze-ember",
  },
] satisfies SponsorShowcaseSponsor[];

const PARTNER_SLOTS = ["left-top", "right-top", "left-bottom", "right-bottom"];

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
              {PARTNER_SLOTS.map((slot) => (
                <span
                  key={slot}
                  className={styles.partnerStone}
                  role="listitem"
                />
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
