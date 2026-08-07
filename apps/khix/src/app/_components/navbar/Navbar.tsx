"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Instagram, LayoutDashboard, LogIn, LogOut, Menu } from "lucide-react";

import { useHackerSdkClient, useHackerSession } from "@forge/hacker-sdk/react";
import { toast } from "@forge/ui/toast";

import { usePortalConfig, usePortalSignOut } from "~/lib/hacker-portal";
import { MLHBadge } from "./MLHBadge";
import styles from "./Navbar.module.css";

export interface NavbarLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavbarSocialLink {
  label: string;
  href: string;
  icon: "discord" | "instagram";
}

interface NavbarProps {
  links: readonly NavbarLink[];
  socialLinks?: readonly NavbarSocialLink[];
  homeHref?: string;
}

const HIDE_SCROLL_Y = 80;
const HIDE_MLH_SCROLL_Y = 50;
const SCROLL_DELTA = 6;
const CLOSE_TRANSITION_FALLBACK_MS = 620;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_NAV_QUERY = "(max-width: 900px)";

export function Navbar({
  links,
  socialLinks = [],
  homeHref = "#home",
}: NavbarProps) {
  const config = usePortalConfig();
  const { client } = useHackerSdkClient();
  const session = useHackerSession();
  const logout = usePortalSignOut();
  const [isHidden, setIsHidden] = useState(false);
  const [isMlhHidden, setIsMlhHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const isMenuVisible = isMenuOpen || isMenuClosing;
  const menuState = isMenuOpen ? "open" : isMenuClosing ? "closing" : "closed";

  const openMenu = useCallback(() => {
    setIsMenuClosing(false);
    setIsMenuOpen(true);
    setIsHidden(false);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsMenuClosing(!window.matchMedia(REDUCED_MOTION_QUERY).matches);
    setIsHidden(false);
  }, []);

  useEffect(() => {
    const mobileNav = window.matchMedia(MOBILE_NAV_QUERY);
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      setIsMlhHidden(currentScrollY > HIDE_MLH_SCROLL_Y);

      if (mobileNav.matches) {
        setIsHidden(false);
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

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
      if (ticking || isMenuVisible) return;

      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    const handleMobileNavChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsHidden(false);
      }

      lastScrollY = window.scrollY;
    };

    mobileNav.addEventListener("change", handleMobileNavChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mobileNav.removeEventListener("change", handleMobileNavChange);
    };
  }, [isMenuVisible]);

  useEffect(() => {
    if (!isMenuVisible) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const handleDesktopQueryChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMenuOpen(false);
        setIsMenuClosing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleDesktopQueryChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopQueryChange);
    };
  }, [closeMenu, isMenuVisible]);

  useEffect(() => {
    if (!isMenuClosing) return;

    const fallbackId = window.setTimeout(() => {
      setIsMenuClosing(false);
    }, CLOSE_TRANSITION_FALLBACK_MS);

    return () => window.clearTimeout(fallbackId);
  }, [isMenuClosing]);

  const handleNavigation = () => {
    if (isMenuOpen) {
      closeMenu();
      return;
    }

    setIsMenuClosing(false);
    setIsHidden(false);
  };
  const isNavHidden = isHidden && !isMenuVisible;
  const accountName = session.data?.displayName ?? "Signed in";

  const handleLogout = () => {
    void logout.signOut(config.routes.home).catch(() => {
      toast.error("Could not log out. Please try again.");
    });
  };

  return (
    <>
      <header
        className={styles.navbar}
        data-hidden={isNavHidden}
        data-menu-open={isMenuOpen}
        aria-hidden={isNavHidden}
        inert={isNavHidden ? true : undefined}
      >
        <div className={styles.inner}>
          <a
            className={styles.brand}
            href={homeHref}
            aria-label="Knight Hacks IX home"
            onClick={handleNavigation}
          >
            <Image
              src="https://assets.knighthacks.org/khix/khlogosinglewhite.svg"
              alt=""
              width={42}
              height={49}
              className={styles.logo}
              priority
            />
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

          <div className={styles.navActions}>
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
                    <SocialIcon icon={link.icon} />
                  </a>
                ))}
              </nav>
            ) : null}
            <div className={styles.accountActions}>
              {session.isPending || session.isError ? (
                <span
                  aria-label={
                    session.isError ? "Account unavailable" : "Loading account"
                  }
                  className={`${styles.accountLink} ${styles.accountPending}`}
                >
                  {session.isPending ? (
                    <span
                      aria-hidden="true"
                      className={styles.accountPendingDot}
                    />
                  ) : null}
                  <span className={styles.accountLabel}>
                    {session.isError ? "Unavailable" : "Account"}
                  </span>
                </span>
              ) : session.data.authenticated ? (
                <>
                  <Link
                    className={styles.accountLink}
                    href={config.routes.dashboard}
                    title={`Signed in as ${accountName}`}
                  >
                    <LayoutDashboard aria-hidden="true" />
                    <span className={styles.accountName}>{accountName}</span>
                    <span className={styles.accountLabel}>Dashboard</span>
                  </Link>
                  <button
                    aria-label={
                      logout.isPending
                        ? "Logging out"
                        : `Log out ${accountName}`
                    }
                    className={styles.accountLogout}
                    disabled={logout.isPending}
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogOut aria-hidden="true" />
                  </button>
                </>
              ) : (
                <a
                  className={styles.accountLink}
                  href={client.signInPath(config.routes.apply)}
                >
                  <LogIn aria-hidden="true" />
                  <span className={styles.accountLabel}>Sign in</span>
                </a>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="khix-mobile-navigation"
            onClick={() => {
              if (isMenuOpen) {
                closeMenu();
                return;
              }

              openMenu();
            }}
          >
            <span className={styles.menuIconWrap} aria-hidden="true">
              <Menu className={styles.menuIcon} data-menu-icon="open" />
              <Image
                src="https://assets.knighthacks.org/khix/khlogosinglewhite.svg"
                alt=""
                width={38}
                height={44}
                className={styles.menuIcon}
                data-menu-icon="logo"
              />
            </span>
          </button>
        </div>

        <div
          className={styles.mobileLayer}
          data-open={isMenuVisible}
          data-state={menuState}
          aria-hidden={!isMenuOpen}
          inert={!isMenuOpen ? true : undefined}
        >
          <div
            className={styles.mobileSurface}
            aria-hidden="true"
            onTransitionEnd={(event) => {
              if (
                event.currentTarget !== event.target ||
                event.propertyName !== "transform" ||
                isMenuOpen ||
                !isMenuClosing
              ) {
                return;
              }

              setIsMenuClosing(false);
            }}
          />
          <button
            type="button"
            className={styles.mobileBackdrop}
            aria-label="Close navigation menu"
            tabIndex={isMenuOpen ? 0 : -1}
            onClick={closeMenu}
          />
          <nav
            id="khix-mobile-navigation"
            className={styles.mobileMenu}
            aria-label="Mobile navigation"
          >
            <div className={styles.mobileLinks}>
              <a
                className={styles.mobileLink}
                href={homeHref}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={handleNavigation}
              >
                Home
              </a>
              {links.map((link) => (
                <a
                  key={link.href}
                  className={styles.mobileLink}
                  href={link.href}
                  tabIndex={isMenuOpen ? 0 : -1}
                  onClick={handleNavigation}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
              {session.isPending || session.isError ? (
                <span
                  aria-label={
                    session.isError ? "Account unavailable" : "Loading account"
                  }
                  className={`${styles.mobileLink} ${styles.mobileAccountPending}`}
                >
                  {session.isError ? "Account unavailable" : "Account"}
                </span>
              ) : session.data.authenticated ? (
                <>
                  <Link
                    className={styles.mobileLink}
                    href={config.routes.dashboard}
                    tabIndex={isMenuOpen ? 0 : -1}
                    onClick={handleNavigation}
                  >
                    Dashboard · {accountName}
                  </Link>
                  <button
                    className={styles.mobileLink}
                    disabled={logout.isPending}
                    onClick={handleLogout}
                    tabIndex={isMenuOpen ? 0 : -1}
                    type="button"
                  >
                    {logout.isPending ? "Logging out…" : "Log out"}
                  </button>
                </>
              ) : (
                <a
                  className={styles.mobileLink}
                  href={client.signInPath(config.routes.apply)}
                  tabIndex={isMenuOpen ? 0 : -1}
                >
                  Sign in
                </a>
              )}
            </div>
            {socialLinks.length > 0 ? (
              <div
                className={styles.mobileSocialLinks}
                role="group"
                aria-label="Social links"
              >
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    className={styles.mobileSocialLink}
                    href={link.href}
                    aria-label={link.label}
                    tabIndex={isMenuOpen ? 0 : -1}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleNavigation}
                  >
                    <SocialIcon icon={link.icon} />
                  </a>
                ))}
              </div>
            ) : null}
          </nav>
        </div>
      </header>
      <MLHBadge isHidden={isMlhHidden} isMenuOpen={isMenuVisible} />
    </>
  );
}

function SocialIcon({ icon }: { icon: NavbarSocialLink["icon"] }) {
  if (icon === "instagram") {
    return <Instagram aria-hidden="true" strokeWidth={2.2} />;
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.52l-.24.48c-.1.2-.2.42-.28.64a18.1 18.1 0 0 0-5.74 0 8.4 8.4 0 0 0-.52-1.12 19.72 19.72 0 0 0-4.93 1.52C.56 9.02-.32 13.55.1 18.02a19.9 19.9 0 0 0 6.05 3.07c.49-.67.93-1.37 1.3-2.1a12.9 12.9 0 0 1-2.05-.98l.5-.39a14.1 14.1 0 0 0 12.2 0l.5.39c-.66.39-1.35.72-2.06.98.38.73.81 1.43 1.3 2.1a19.84 19.84 0 0 0 6.06-3.07c.5-5.18-.86-9.67-3.58-13.65ZM8.03 15.29c-1.18 0-2.15-1.08-2.15-2.41s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.33-.95 2.41-2.15 2.41Zm7.94 0c-1.18 0-2.15-1.08-2.15-2.41s.95-2.42 2.15-2.42 2.17 1.09 2.15 2.42c0 1.33-.95 2.41-2.15 2.41Z"
      />
    </svg>
  );
}
