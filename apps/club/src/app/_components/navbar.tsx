"use client";

import type { MotionStyle, MotionValue, Transition } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

import { CLUB_NAV_ITEMS, PUBLIC_LINKS } from "../_lib/site-config";

const ACTION_LINKS = [
  {
    label: "Sign Up With Blade",
    hrefKey: "blade",
    className: "club-nav-action-primary",
  },
  {
    label: "Join Discord",
    hrefKey: "discord",
    href: PUBLIC_LINKS.discord,
    className: "club-nav-action-secondary",
  },
] as const;

const MOBILE_MENU_ID = "club-mobile-menu";
const NAV_FADE_DISTANCE = 120;

type NavStyle = MotionStyle & {
  opacity: number | MotionValue<number>;
  "--club-nav-bg-alpha": number | MotionValue<number>;
  "--club-nav-bg-bottom-alpha": number | MotionValue<number>;
  "--club-nav-border-alpha": number | MotionValue<number>;
  "--club-nav-edge-alpha": number | MotionValue<number>;
  "--club-nav-shadow-alpha": number | MotionValue<number>;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onSelect,
}: {
  item: (typeof CLUB_NAV_ITEMS)[number];
  pathname: string;
  onSelect?: (href: string) => void;
}) {
  const isActive = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      className={cn("club-nav-link", isActive && "club-nav-link-active")}
      onClick={() => onSelect?.(item.href)}
    >
      {item.label}
    </Link>
  );
}

function ActionLinks({
  bladeUrl,
  className,
  stacked = false,
  onSelect,
}: {
  bladeUrl: string;
  className?: string;
  stacked?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-3",
        stacked && "flex-col items-stretch",
        className,
      )}
    >
      {ACTION_LINKS.map((action) => {
        const href = action.hrefKey === "blade" ? bladeUrl : action.href;

        return (
          <Button
            key={action.hrefKey}
            asChild
            size="lg"
            className={cn("club-nav-action", action.className)}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onSelect}
            >
              <span>{action.label}</span>
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          </Button>
        );
      })}
    </div>
  );
}

export default function Navbar({ bladeUrl }: { bladeUrl: string }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isClickDisabled, setIsClickDisabled] = useState(false);
  const previousScrollY = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const rawNavFadeProgress = useMotionValue(0);
  const navFadeProgress = useSpring(
    rawNavFadeProgress,
    prefersReducedMotion
      ? { stiffness: 1200, damping: 120, mass: 0.1 }
      : { stiffness: 520, damping: 42, mass: 0.18 },
  );
  const navBgAlpha = useTransform(navFadeProgress, [0, 1], [0.34, 0]);
  const navBgBottomAlpha = useTransform(navFadeProgress, [0, 1], [0.18, 0]);
  const navBorderAlpha = useTransform(navFadeProgress, [0, 1], [0.1, 0]);
  const navEdgeAlpha = useTransform(navFadeProgress, [0, 1], [0.14, 0]);
  const navShadowAlpha = useTransform(navFadeProgress, [0, 1], [0.18, 0]);
  const navOpacity = useTransform(navFadeProgress, [0, 1], [1, 0]);
  const navStyle: NavStyle = isMobileOpen
    ? {
        opacity: 1,
        "--club-nav-bg-alpha": 0.76,
        "--club-nav-bg-bottom-alpha": 0.68,
        "--club-nav-border-alpha": 0.14,
        "--club-nav-edge-alpha": 0.18,
        "--club-nav-shadow-alpha": 0.34,
      }
    : {
        opacity: navOpacity,
        "--club-nav-bg-alpha": navBgAlpha,
        "--club-nav-bg-bottom-alpha": navBgBottomAlpha,
        "--club-nav-border-alpha": navBorderAlpha,
        "--club-nav-edge-alpha": navEdgeAlpha,
        "--club-nav-shadow-alpha": navShadowAlpha,
      };
  const MenuIcon = isMobileOpen ? X : Menu;
  const mobileMenuTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.26, ease: "easeOut" };
  const mobileMenuItemTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: "easeOut" };

  useEffect(() => {
    let animationFrameId: number | null = null;

    function updateNavFade() {
      animationFrameId = null;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - previousScrollY.current;
      previousScrollY.current = currentScrollY;

      if (currentScrollY <= 4 || scrollDelta < -1) {
        rawNavFadeProgress.set(0);
        return;
      }

      if (scrollDelta > 1) {
        rawNavFadeProgress.set(
          Math.min(
            1,
            rawNavFadeProgress.get() + scrollDelta / NAV_FADE_DISTANCE,
          ),
        );
      }
    }

    function scheduleNavFade() {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(updateNavFade);
    }

    previousScrollY.current = window.scrollY;
    scheduleNavFade();
    window.addEventListener("scroll", scheduleNavFade, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleNavFade);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [rawNavFadeProgress]);

  useMotionValueEvent(navOpacity, "change", (opacity) => {
    const shouldDisableClicks = opacity <= 0.5;

    setIsClickDisabled((current) =>
      current === shouldDisableClicks ? current : shouldDisableClicks,
    );
  });

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsMobileOpen(false);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [pathname]);

  const isNavHidden = isClickDisabled && !isMobileOpen;

  return (
    <motion.header
      style={navStyle}
      className={cn(
        "club-nav-shell fixed inset-x-0 top-0 z-50",
        isMobileOpen && "club-nav-shell-open",
        isNavHidden && "pointer-events-none",
      )}
      aria-hidden={isNavHidden}
      inert={isNavHidden ? true : undefined}
    >
      <nav className="relative mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:px-8 xl:px-10">
        <Link
          href="/"
          prefetch={false}
          className="flex shrink-0 items-center justify-self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--club-gold)] lg:-ml-1 xl:-ml-2"
          aria-label="Knight Hacks home"
        >
          <Image
            src="/sigilKH.svg"
            alt="Knight Hacks"
            width={44}
            height={44}
            className="size-10 md:size-11"
            priority
          />
        </Link>

        <div className="hidden items-center justify-center gap-5 lg:flex xl:gap-8">
          {CLUB_NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <ActionLinks
          bladeUrl={bladeUrl}
          className="hidden justify-self-end lg:-mr-1 lg:flex xl:-mr-2"
        />

        <button
          type="button"
          className="flex size-11 items-center justify-center justify-self-end border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--club-gold)] lg:hidden"
          aria-expanded={isMobileOpen}
          aria-controls={MOBILE_MENU_ID}
          aria-label={
            isMobileOpen ? "Close navigation menu" : "Open navigation menu"
          }
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isMobileOpen ? "close" : "open"}
              aria-hidden="true"
              className="flex"
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, rotate: -18, scale: 0.86 }
              }
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, rotate: 18, scale: 0.86 }
              }
              transition={mobileMenuItemTransition}
            >
              <MenuIcon className="size-5" />
            </motion.span>
          </AnimatePresence>
        </button>

        <AnimatePresence initial={false}>
          {isMobileOpen ? (
            <motion.div
              id={MOBILE_MENU_ID}
              key="mobile-menu"
              className="club-mobile-menu-panel absolute left-0 top-full z-50 flex w-full origin-top flex-col gap-2 overflow-hidden p-5 lg:hidden"
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -10, clipPath: "inset(0 0 100% 0)" }
              }
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, clipPath: "inset(0 0 100% 0)" }
              }
              transition={mobileMenuTransition}
            >
              <motion.div
                className="flex flex-col gap-2"
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: prefersReducedMotion
                    ? {}
                    : {
                        transition: {
                          delayChildren: 0.04,
                          staggerChildren: 0.035,
                        },
                      },
                }}
              >
                {CLUB_NAV_ITEMS.map((item) => (
                  <motion.div
                    key={item.href}
                    variants={{
                      closed: prefersReducedMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: -6 },
                      open: { opacity: 1, y: 0 },
                    }}
                    transition={mobileMenuItemTransition}
                  >
                    <NavLink
                      item={item}
                      pathname={pathname}
                      onSelect={() => setIsMobileOpen(false)}
                    />
                  </motion.div>
                ))}
                <motion.div
                  variants={{
                    closed: prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: -6 },
                    open: { opacity: 1, y: 0 },
                  }}
                  transition={mobileMenuItemTransition}
                >
                  <ActionLinks
                    bladeUrl={bladeUrl}
                    stacked
                    className="mt-2"
                    onSelect={() => setIsMobileOpen(false)}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
