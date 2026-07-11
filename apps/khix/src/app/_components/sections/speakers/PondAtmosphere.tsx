import styles from "./PondAtmosphere.module.css";

const FIREFLY_IDS = Array.from({ length: 24 }, (_, index) => String(index + 1));
const WISP_IDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
] as const;

interface PondAtmosphereProps {
  className?: string;
}

export function PondAtmosphere({ className }: PondAtmosphereProps) {
  const rootClassName = className
    ? `${styles.pondAtmosphere} ${className}`
    : styles.pondAtmosphere;

  return (
    <span className={rootClassName} aria-hidden="true">
      <span className={styles.fireflies}>
        {FIREFLY_IDS.map((fireflyId) => (
          <span
            key={fireflyId}
            className={styles.firefly}
            data-firefly={fireflyId}
          />
        ))}
      </span>
      {WISP_IDS.map((wispId) => (
        <span key={wispId} className={styles.wisp} data-wisp={wispId} />
      ))}
    </span>
  );
}
