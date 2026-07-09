import Image from "next/image";

import styles from "./Navbar.module.css";

interface MLHBadgeProps {
  isHidden: boolean;
  isMenuOpen: boolean;
}

const MLH_BADGE_URL =
  "https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-white.svg";

export function MLHBadge({ isHidden, isMenuOpen }: MLHBadgeProps) {
  return (
    <a
      id="mlh-trust-badge"
      className={styles.mlhTrustBadge}
      data-hidden={isHidden}
      data-menu-open={isMenuOpen}
      href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Major League Hacking 2026 Hackathon Season - Opens in new tab"
    >
      <Image
        src={MLH_BADGE_URL}
        alt="Major League Hacking 2026 Hackathon Season"
        width={393}
        height={688}
        unoptimized
        sizes="(max-width: 900px) 16vw, 10vw"
        className={styles.mlhTrustBadgeImage}
        draggable={false}
      />
    </a>
  );
}
