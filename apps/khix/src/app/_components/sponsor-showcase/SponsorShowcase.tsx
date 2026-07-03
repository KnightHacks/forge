import type { CSSProperties } from "react";
import Image from "next/image";

import styles from "./SponsorShowcase.module.css";

export const SPONSOR_TIER_ORDER = [
  "bronze-ember",
  "silver-moon",
  "golden-dawn",
  "platinum-crown",
  "forest-sovereign",
] as const;

export type SponsorTier = (typeof SPONSOR_TIER_ORDER)[number];

export interface SponsorShowcaseSponsor {
  name: string;
  websiteUrl: string;
  logoSrc: string;
  tier: SponsorTier;
}

export interface SponsorShowcaseProps {
  sponsors: readonly SponsorShowcaseSponsor[];
  className?: string;
}

type SponsorSize = "small" | "medium" | "large" | "x-large";
type SponsorGroupName = "slab" | "medium-stone" | "small-stone";

interface SponsorTierConfig {
  color: string;
  size: SponsorSize;
}

type SponsorCardStyle = CSSProperties & {
  "--float-delay": string;
  "--sponsor-logo-src": string;
  "--tier-color-rgb": string;
};

const SPONSOR_TIER_DISPLAY_ORDER = [
  "forest-sovereign",
  "platinum-crown",
  "golden-dawn",
  "silver-moon",
  "bronze-ember",
] as const satisfies readonly SponsorTier[];

// TODO: Edit these hex colors based on Bowen's response.
const SPONSOR_TIER_CONFIG = {
  "bronze-ember": {
    color: "#C8753D",
    size: "small",
  },
  "silver-moon": {
    color: "#D6DEE8",
    size: "small",
  },
  "golden-dawn": {
    color: "#FFC857",
    size: "medium",
  },
  "platinum-crown": {
    color: "#E7F0F6",
    size: "large",
  },
  "forest-sovereign": {
    color: "#CE2CFF",
    size: "x-large",
  },
} as const satisfies Record<SponsorTier, SponsorTierConfig>;

function getHexRgb(hexColor: string) {
  const normalizedHex = hexColor.replace("#", "");
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
}

function getCssUrl(source: string) {
  const escapedSource = source.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

  return `url("${escapedSource}")`;
}

function getOrderedSponsors(sponsors: readonly SponsorShowcaseSponsor[]) {
  return SPONSOR_TIER_DISPLAY_ORDER.flatMap((tier) =>
    sponsors.filter((sponsor) => sponsor.tier === tier),
  );
}

function getSponsorCardKey(
  groupName: SponsorGroupName,
  sponsor: SponsorShowcaseSponsor,
  index: number,
) {
  return `${groupName}-${index}-${sponsor.tier}-${sponsor.name}-${sponsor.websiteUrl}`;
}

function SponsorRockCard({
  index,
  sponsor,
}: {
  index: number;
  sponsor: SponsorShowcaseSponsor;
}) {
  const tierConfig = SPONSOR_TIER_CONFIG[sponsor.tier];
  const style: SponsorCardStyle = {
    "--float-delay": `${-(index % 6) * 0.42}s`,
    "--sponsor-logo-src": getCssUrl(sponsor.logoSrc),
    "--tier-color-rgb": getHexRgb(tierConfig.color),
  };

  return (
    <a
      className={styles.sponsorLink}
      data-size={tierConfig.size}
      href={sponsor.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={sponsor.name}
      style={style}
    >
      <span className={styles.sponsorVisual} aria-hidden="true">
        <span className={styles.rockFrame} aria-hidden="true">
          <span className={styles.sponsorLogo}>
            <Image
              src={sponsor.logoSrc}
              alt=""
              fill
              className={styles.sponsorLogoImage}
              sizes="(max-width: 760px) 9rem, 16rem"
              unoptimized
            />
          </span>
        </span>
      </span>
    </a>
  );
}

export function SponsorShowcase({ className, sponsors }: SponsorShowcaseProps) {
  const orderedSponsors = getOrderedSponsors(sponsors);
  const slabSponsors = orderedSponsors.filter(
    (sponsor) =>
      SPONSOR_TIER_CONFIG[sponsor.tier].size === "large" ||
      SPONSOR_TIER_CONFIG[sponsor.tier].size === "x-large",
  );
  const mediumStoneSponsors = orderedSponsors.filter(
    (sponsor) => SPONSOR_TIER_CONFIG[sponsor.tier].size === "medium",
  );
  const smallStoneSponsors = orderedSponsors.filter(
    (sponsor) => SPONSOR_TIER_CONFIG[sponsor.tier].size === "small",
  );
  const sponsorShowcaseClassName = className
    ? `${styles.sponsorShowcase} ${className}`
    : styles.sponsorShowcase;

  if (orderedSponsors.length === 0) {
    return null;
  }

  return (
    <section
      className={sponsorShowcaseClassName}
      aria-labelledby="khix-sponsors-title"
    >
      <h2 id="khix-sponsors-title" className={styles.sponsorTitle}>
        Sponsors
      </h2>

      <div className={styles.sponsorField}>
        {slabSponsors.length > 0 ? (
          <div className={styles.slabStack}>
            {slabSponsors.map((sponsor, index) => (
              <SponsorRockCard
                key={getSponsorCardKey("slab", sponsor, index)}
                sponsor={sponsor}
                index={index}
              />
            ))}
          </div>
        ) : null}

        {mediumStoneSponsors.length > 0 ? (
          <div className={styles.mediumStoneGrid}>
            {mediumStoneSponsors.map((sponsor, index) => (
              <SponsorRockCard
                key={getSponsorCardKey("medium-stone", sponsor, index)}
                sponsor={sponsor}
                index={slabSponsors.length + index}
              />
            ))}
          </div>
        ) : null}

        {smallStoneSponsors.length > 0 ? (
          <div className={styles.smallStoneGrid}>
            {smallStoneSponsors.map((sponsor, index) => (
              <SponsorRockCard
                key={getSponsorCardKey("small-stone", sponsor, index)}
                sponsor={sponsor}
                index={slabSponsors.length + mediumStoneSponsors.length + index}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
