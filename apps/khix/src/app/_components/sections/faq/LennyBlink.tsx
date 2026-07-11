import Image from "next/image";

import { AssetCredit } from "../../assets";
import styles from "./LennyBlink.module.css";

interface LennyBlinkProps {
  className?: string;
}

export function LennyBlink({ className }: LennyBlinkProps) {
  const rootClassName = className
    ? `${styles.lenny} ${className}`
    : styles.lenny;

  return (
    <AssetCredit
      className={rootClassName}
      label="Animation by"
      credits={[{ name: "Knight Hacks Design Team" }]}
    >
      <picture className={styles.frameStack}>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet="/assets/faq-lennyblink-Frame%201.webp"
        />
        <Image
          src="/assets/faq-lennyblink-lennyblink.webp"
          alt="Lenny the Knight Hacks dragon blinking"
          width={2667}
          height={3318}
          className={styles.frame}
          data-active="true"
          priority
          unoptimized
        />
      </picture>
    </AssetCredit>
  );
}
