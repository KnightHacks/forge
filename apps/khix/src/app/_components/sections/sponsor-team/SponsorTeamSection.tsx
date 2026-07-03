import type { SponsorShowcaseSponsor } from "../../sponsor-showcase";
import { SponsorShowcase } from "../../sponsor-showcase";
import { TeamCascade } from "../../team-cascade";
import styles from "./SponsorTeamSection.module.css";

const HOMEPAGE_SPONSORS = [
  {
    name: "NVIDIA",
    websiteUrl: "https://www.nvidia.com",
    logoSrc: "/assets/sponsor-logos/nvidia.svg",
    tier: "forest-sovereign",
  },
  {
    name: "Google",
    websiteUrl: "https://google.com",
    logoSrc: "/assets/sponsor-logos/google.svg",
    tier: "platinum-crown",
  },
  {
    name: "AMD",
    websiteUrl: "https://www.amd.com",
    logoSrc: "/assets/sponsor-logos/amd.svg",
    tier: "golden-dawn",
  },
  {
    name: "Roblox",
    websiteUrl: "https://www.roblox.com",
    logoSrc: "/assets/sponsor-logos/roblox.svg",
    tier: "silver-moon",
  },
  {
    name: "ServiceNow",
    websiteUrl: "https://www.servicenow.com",
    logoSrc: "/assets/sponsor-logos/servicenow.svg",
    tier: "silver-moon",
  },
  {
    name: "Synopsys",
    websiteUrl: "https://www.synopsys.com",
    logoSrc: "/assets/sponsor-logos/synopsys.svg",
    tier: "silver-moon",
  },
  {
    name: "BNY",
    websiteUrl: "https://www.bny.com",
    logoSrc: "/assets/sponsor-logos/bny.svg",
    tier: "bronze-ember",
  },
  {
    name: "Statsig",
    websiteUrl: "https://www.statsig.com",
    logoSrc: "/assets/sponsor-logos/statsig.svg",
    tier: "bronze-ember",
  },
  {
    name: "Lockheed Martin",
    websiteUrl: "https://www.lockheedmartin.com",
    logoSrc: "/assets/sponsor-logos/lockheed-martin.svg",
    tier: "bronze-ember",
  },
  {
    name: "Auritas",
    websiteUrl: "https://www.auritas.com",
    logoSrc: "/assets/sponsor-logos/auritas.svg",
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
