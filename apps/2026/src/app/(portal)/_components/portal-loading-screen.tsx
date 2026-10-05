import Image from "next/image";

import styles from "./portal-loading-screen.module.css";

export function PortalLoadingScreen({ revealing = false }) {
  return (
    <div
      className={`${styles.screen} ${revealing ? styles.revealing : ""}`}
      role={revealing ? undefined : "status"}
      aria-label={revealing ? undefined : "Loading Knight Hacks"}
      aria-hidden={revealing ? true : undefined}
    >
      <Image
        src="/khix-logo-white.svg"
        alt=""
        width={2104}
        height={893}
        className={styles.logo}
        priority
      />
    </div>
  );
}
