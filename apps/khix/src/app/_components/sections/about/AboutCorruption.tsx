import styles from "./AboutCorruption.module.css";

export function AboutCorruption() {
  return (
    <div className={styles.corruption} aria-hidden="true">
      <span className={styles.front} data-about-front />
    </div>
  );
}
