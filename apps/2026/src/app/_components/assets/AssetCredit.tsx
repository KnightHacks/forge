import type { ReactNode } from "react";
import { Fragment } from "react";

import styles from "./AssetCredit.module.css";

export interface AssetCreditEntry {
  name: string;
  href?: string;
  newTab?: boolean;
}

interface AssetCreditProps {
  credits: readonly AssetCreditEntry[];
  children: ReactNode;
  className?: string;
  label?: string;
}

export function AssetCredit({
  credits,
  children,
  className,
  label = "Made by",
}: AssetCreditProps) {
  const rootClassName = className
    ? `${styles.assetCredit} ${className}`
    : styles.assetCredit;
  const visibleCredits = credits.filter((credit) => credit.name.trim());

  if (visibleCredits.length === 0) {
    return <span className={rootClassName}>{children}</span>;
  }

  return (
    <span className={rootClassName}>
      {children}
      <span className={styles.creditText}>
        <span className={styles.creditLabel}>{label}</span>{" "}
        {visibleCredits.map((credit, index) => (
          <Fragment key={`${credit.name}-${credit.href ?? index}`}>
            {index > 0 ? (
              <span className={styles.creditSeparator}>/</span>
            ) : null}
            {credit.href ? (
              <a
                className={styles.creditLink}
                href={credit.href}
                {...(credit.newTab === false
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {credit.name}
              </a>
            ) : (
              <span className={styles.creditName}>{credit.name}</span>
            )}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
