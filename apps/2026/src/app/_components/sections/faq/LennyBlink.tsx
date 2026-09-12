import { AmbientVideo } from "../../AmbientVideo";
import { getTransparentVideoSources } from "../../ambientVideoSources";
import { AssetCredit } from "../../assets";
import styles from "./LennyBlink.module.css";

interface LennyBlinkProps {
  className?: string;
}

/** Renders Lenny's transparent blink animation with a static fallback poster. */
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
      <span
        className={styles.frameStack}
        role="img"
        aria-label="Lenny the Knight Hacks dragon blinking"
      >
        <AmbientVideo
          className={styles.frame}
          poster="/media/homepage/lenny-blink-poster.webp"
          sources={getTransparentVideoSources("/media/homepage/lenny-blink")}
        />
      </span>
    </AssetCredit>
  );
}
