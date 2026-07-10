import Image from "next/image";
import Link from "next/link";

import { AssetCredit } from "../../assets";
import styles from "./Hero.module.css";

interface HeroApplyButtonProps {
  className?: string;
}

export function HeroApplyButton({ className }: HeroApplyButtonProps) {
  return (
    <Link
      href="/apply"
      className={[styles.heroApplyButton, className].filter(Boolean).join(" ")}
      aria-label="Apply to Knight Hacks IX"
    >
      <span>Apply</span>
    </Link>
  );
}

export function HeroTitle() {
  return (
    <div className={styles.titleLockup} data-hero-title>
      <div className={styles.titleLogoWrap} aria-hidden="true">
        <AssetCredit
          label="Logo by"
          credits={[{ name: "Knight Hacks Design Team" }]}
        >
          <Image
            src="/khlogo.svg"
            alt=""
            width={1858}
            height={666}
            priority
            className={styles.titleLogo}
            data-hero-title-logo
          />
        </AssetCredit>
      </div>
      <p className={styles.eventDetails}>
        <span>October 9–11, 2026</span>
        <span>University of Central Florida</span>
      </p>
      <HeroApplyButton className={styles.titleApplyButton} />
    </div>
  );
}
