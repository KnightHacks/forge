import { PRINTING } from "@forge/consts";

import styles from "./hacker-printing.module.css";

export function PrintingGuidelines() {
  return (
    <aside aria-label="Print guidelines" className={styles.guidelines}>
      <p>
        <strong>One-hour sessions.</strong> Prints are limited to{" "}
        {PRINTING.KHIX_SESSION_LIMIT_MINUTES} minutes so everyone has a chance
        to print. Oversized requests may be cancelled. Actual print times vary
        by model.
      </p>
      <div>
        <p>
          <strong>Available filaments</strong>
        </p>
        <ul className={styles.filaments}>
          {PRINTING.KHIX_FILAMENTS.map((filament) => (
            <li key={filament}>{filament}</li>
          ))}
        </ul>
        <p className={styles.hint}>
          Include your preferred filament in your print description.
        </p>
      </div>
    </aside>
  );
}
