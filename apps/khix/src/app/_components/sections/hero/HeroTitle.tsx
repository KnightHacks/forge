import Image from "next/image";

import styles from "./Hero.module.css";

export function HeroTitle() {
  return (
    <div className={styles.titleLockup} data-hero-title aria-hidden="true">
      <Image
        src="/khlogo.svg"
        alt=""
        width={1858}
        height={666}
        priority
        className={styles.titleLogo}
        data-hero-title-logo
      />
    </div>
  );
}
