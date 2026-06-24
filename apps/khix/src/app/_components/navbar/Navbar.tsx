"use client";

import { useEffect, useState } from "react";

import styles from "./Navbar.module.css";

export interface NavbarLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavbarSocialLink {
  label: string;
  href: string;
  shortLabel: string;
}

interface NavbarProps {
  links: readonly NavbarLink[];
  socialLinks?: readonly NavbarSocialLink[];
  homeHref?: string;
}

const HIDE_SCROLL_Y = 80;
const SCROLL_DELTA = 6;

export function Navbar({
  links,
  socialLinks = [],
  homeHref = "#home",
}: NavbarProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY <= HIDE_SCROLL_Y) {
        setIsHidden(false);
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      if (Math.abs(scrollDelta) >= SCROLL_DELTA) {
        setIsHidden(scrollDelta > 0);
        lastScrollY = currentScrollY;
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={styles.navbar}
      data-hidden={isHidden}
      aria-hidden={isHidden}
      inert={isHidden ? true : undefined}
    >
      <div className={styles.inner}>
        <a
          className={styles.brand}
          href={homeHref}
          aria-label="Knight Hacks IX home"
        >
          <span className={styles.logoSlot} aria-hidden="true" />
        </a>

        <nav className={styles.links} aria-label="Primary navigation">
          {links.map((link) => (
            <a
              key={link.href}
              className={styles.link}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {socialLinks.length > 0 ? (
          <nav className={styles.socialLinks} aria-label="Social links">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                className={styles.socialLink}
                href={link.href}
                aria-label={link.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.shortLabel}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
