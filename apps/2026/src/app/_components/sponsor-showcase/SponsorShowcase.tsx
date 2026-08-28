"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
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
  logoScale?: number;
  mobileLogoScale?: number;
  preserveLogoContrast?: boolean;
  tier: SponsorTier;
}

export interface SponsorShowcaseProps {
  sponsors: readonly SponsorShowcaseSponsor[];
  className?: string;
  title?: string;
  titleId?: string;
}

type SponsorSize = "x-small" | "small" | "medium" | "large" | "x-large";
type SponsorGroupName = "slab" | "medium-stone" | "small-stone";

interface SponsorTierConfig {
  size: SponsorSize;
}

type SponsorCardStyle = CSSProperties & {
  "--sponsor-logo-hover-scale": string;
  "--sponsor-logo-mobile-hover-scale": string;
  "--sponsor-logo-mobile-scale": string;
  "--sponsor-logo-scale": string;
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
    size: "x-small",
  },
  "silver-moon": {
    size: "small",
  },
  "golden-dawn": {
    size: "medium",
  },
  "platinum-crown": {
    size: "large",
  },
  "forest-sovereign": {
    size: "x-large",
  },
} as const satisfies Record<SponsorTier, SponsorTierConfig>;

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

function SponsorRockCard({ sponsor }: { sponsor: SponsorShowcaseSponsor }) {
  const tierConfig = SPONSOR_TIER_CONFIG[sponsor.tier];
  const logoScale = sponsor.logoScale ?? 1;
  const mobileLogoScale = sponsor.mobileLogoScale ?? logoScale;
  const style: SponsorCardStyle = {
    "--sponsor-logo-hover-scale": (logoScale * 1.035).toFixed(3),
    "--sponsor-logo-mobile-hover-scale": (mobileLogoScale * 1.035).toFixed(3),
    "--sponsor-logo-mobile-scale": mobileLogoScale.toString(),
    "--sponsor-logo-scale": logoScale.toString(),
  };

  return (
    <a
      className={styles.sponsorLink}
      data-size={tierConfig.size}
      data-tier={sponsor.tier}
      data-preserve-logo-contrast={
        sponsor.preserveLogoContrast ? "true" : undefined
      }
      href={sponsor.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={sponsor.name}
      title={sponsor.name}
      draggable={false}
      style={style}
    >
      <span className={styles.sponsorVisual} aria-hidden="true">
        <span className={styles.rockFrame} aria-hidden="true" />
        <span className={styles.sponsorLogo}>
          <Image
            src={sponsor.logoSrc}
            alt=""
            fill
            className={styles.sponsorLogoImage}
            sizes="(max-width: 760px) 9rem, 16rem"
            unoptimized
            draggable={false}
          />
        </span>
      </span>
    </a>
  );
}

export function SponsorShowcase({
  className,
  sponsors,
  title = "Sponsors",
  titleId = "khix-sponsors-title",
}: SponsorShowcaseProps) {
  const showcaseRef = useRef<HTMLElement>(null);
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
  const extraSmallStoneSponsors = orderedSponsors.filter(
    (sponsor) => SPONSOR_TIER_CONFIG[sponsor.tier].size === "x-small",
  );
  const sponsorShowcaseClassName = className
    ? `${styles.sponsorShowcase} ${className}`
    : styles.sponsorShowcase;

  useEffect(() => {
    const showcase = showcaseRef.current;

    if (!showcase) {
      return;
    }

    const setActive = (isActive: boolean) => {
      showcase.dataset.active = isActive ? "true" : "false";
    };

    if (!("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry?.isIntersecting ?? false);
      },
      { rootMargin: "20% 0px", threshold: 0.01 },
    );

    observer.observe(showcase);

    return () => observer.disconnect();
  }, []);

  if (orderedSponsors.length === 0) {
    return null;
  }

  return (
    <section
      ref={showcaseRef}
      className={sponsorShowcaseClassName}
      data-active="false"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className={styles.sponsorTitle}>
        <span className={styles.sponsorTitleRock} aria-hidden="true">
          <span className={styles.rockFrame} aria-hidden="true" />
        </span>
        <span className={styles.sponsorTitleText}>{title}</span>
      </h2>

      <div className={styles.sponsorField}>
        {slabSponsors.length > 0 ? (
          <div className={styles.slabStack}>
            {slabSponsors.map((sponsor, index) => (
              <SponsorRockCard
                key={getSponsorCardKey("slab", sponsor, index)}
                sponsor={sponsor}
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
              />
            ))}
          </div>
        ) : null}

        {extraSmallStoneSponsors.length > 0 ? (
          <div className={styles.smallStoneGrid}>
            {extraSmallStoneSponsors.map((sponsor, index) => (
              <SponsorRockCard
                key={getSponsorCardKey("small-stone", sponsor, index)}
                sponsor={sponsor}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
