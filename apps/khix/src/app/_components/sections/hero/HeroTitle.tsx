import Image from "next/image";

import { AssetCredit } from "../../assets";
import styles from "./Hero.module.css";

export function HeroTitle() {
  return (
    <div className={styles.titleLockup} data-hero-title aria-hidden="true">
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
  );
}
