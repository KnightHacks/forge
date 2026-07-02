import Image from "next/image";

import { LennyBlink } from "../sections/faq/LennyBlink";
import styles from "./Footer.module.css";

const footerLinks = [
  {
    href: "https://knight-hacks.notion.site/code-of-conduct",
    label: "Knight Hacks Code of Conduct",
  },
  {
    href: "https://mlh.io/code-of-conduct",
    label: "MLH Code of Conduct",
  },
  {
    href: "https://knight-hacks.notion.site/knight-hacks-viii",
    label: "Hackers Guide",
  },
  {
    href: "https://blade.knighthacks.org/sponsor",
    label: "Sponsor Us",
  },
] as const;

export function Footer() {
  return (
    <div className={styles.footerWrap}>
      <div className={styles.lennyPlacement}>
        <LennyBlink />
      </div>

      <footer className={styles.footer}>
        <nav className={styles.links} aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.bottomRow}>
          <div className={styles.copyright}>
            <p>Copyright © 2019 - 2026 Knighthacks. All rights reserved.</p>
            <p>
              Made with <span aria-label="love">♥</span> by the Knight Hacks
              team.
            </p>
          </div>
          <Image
            src="/khlogo.svg"
            alt="Knight Hacks IX"
            width={1858}
            height={666}
            className={styles.logo}
          />
        </div>
      </footer>
    </div>
  );
}
