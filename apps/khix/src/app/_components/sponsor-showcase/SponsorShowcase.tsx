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
  glowBoost?: number;
  glowEndColor: string;
  glowStartColor: string;
  size: SponsorSize;
}

type SponsorCardStyle = CSSProperties & {
  "--float-delay": string;
  "--tier-glow-end-rgb": string;
  "--tier-glow-hover-end-alpha": string;
  "--tier-glow-hover-start-alpha": string;
  "--tier-glow-pulse-strong-end-alpha": string;
  "--tier-glow-pulse-strong-start-alpha": string;
  "--tier-glow-pulse-soft-end-alpha": string;
  "--tier-glow-pulse-soft-start-alpha": string;
  "--tier-glow-radius-scale": string;
  "--tier-glow-start-rgb": string;
};

const SPONSOR_TIER_DISPLAY_ORDER = [
  "forest-sovereign",
  "platinum-crown",
  "golden-dawn",
  "silver-moon",
  "bronze-ember",
] as const satisfies readonly SponsorTier[];

const SPONSOR_TIER_CONFIG = {
  "bronze-ember": {
    glowBoost: 1.26,
    glowEndColor: "#CD7F32D9",
    glowStartColor: "#5F2A00B2",
    size: "small",
  },
  "silver-moon": {
    glowBoost: 1.48,
    glowEndColor: "#F7FDFFFF",
    glowStartColor: "#BECBD1D9",
    size: "small",
  },
  "golden-dawn": {
    glowBoost: 1.26,
    glowEndColor: "#FFE45CD9",
    glowStartColor: "#C88A00C7",
    size: "medium",
  },
  "platinum-crown": {
    glowBoost: 1.34,
    glowEndColor: "#D7DCFFFF",
    glowStartColor: "#5748D9E6",
    size: "large",
  },
  "forest-sovereign": {
    glowEndColor: "#CE2CFF",
    glowStartColor: "#4E007B",
    size: "x-large",
  },
} as const satisfies Record<SponsorTier, SponsorTierConfig>;

const SPONSOR_GLOW_ALPHA = {
  hoverEnd: 0.62,
  hoverStart: 0.9,
  pulseSoftEnd: 0.4,
  pulseSoftStart: 0.74,
  pulseStrongEnd: 0.66,
  pulseStrongStart: 0.98,
} as const;

function getHexColorParts(hexColor: string) {
  const normalizedHex = hexColor.replace("#", "");
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
  const alpha =
    normalizedHex.length === 8
      ? Number.parseInt(normalizedHex.slice(6, 8), 16) / 255
      : 1;

  return {
    alpha: alpha.toFixed(3),
    rgb: `${red} ${green} ${blue}`,
  };
}

function getBoostedAlpha(
  colorAlpha: string,
  baseAlpha: number,
  glowBoost: number,
) {
  const alpha = Number.parseFloat(colorAlpha);

  return Math.min(alpha * baseAlpha * glowBoost, 1).toFixed(3);
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
  const glowStartColor = getHexColorParts(tierConfig.glowStartColor);
  const glowEndColor = getHexColorParts(tierConfig.glowEndColor);
  const glowBoost = "glowBoost" in tierConfig ? tierConfig.glowBoost : 1;
  const glowRadiusScale = 1 + (glowBoost - 1) * 0.5;
  const style: SponsorCardStyle = {
    "--float-delay": `${-(index % 6) * 0.42}s`,
    "--tier-glow-end-rgb": glowEndColor.rgb,
    "--tier-glow-hover-end-alpha": getBoostedAlpha(
      glowEndColor.alpha,
      SPONSOR_GLOW_ALPHA.hoverEnd,
      glowBoost,
    ),
    "--tier-glow-hover-start-alpha": getBoostedAlpha(
      glowStartColor.alpha,
      SPONSOR_GLOW_ALPHA.hoverStart,
      glowBoost,
    ),
    "--tier-glow-pulse-strong-end-alpha": getBoostedAlpha(
      glowEndColor.alpha,
      SPONSOR_GLOW_ALPHA.pulseStrongEnd,
      glowBoost,
    ),
    "--tier-glow-pulse-strong-start-alpha": getBoostedAlpha(
      glowStartColor.alpha,
      SPONSOR_GLOW_ALPHA.pulseStrongStart,
      glowBoost,
    ),
    "--tier-glow-pulse-soft-end-alpha": getBoostedAlpha(
      glowEndColor.alpha,
      SPONSOR_GLOW_ALPHA.pulseSoftEnd,
      glowBoost,
    ),
    "--tier-glow-pulse-soft-start-alpha": getBoostedAlpha(
      glowStartColor.alpha,
      SPONSOR_GLOW_ALPHA.pulseSoftStart,
      glowBoost,
    ),
    "--tier-glow-radius-scale": glowRadiusScale.toFixed(3),
    "--tier-glow-start-rgb": glowStartColor.rgb,
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
