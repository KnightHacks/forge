"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { cn } from "@forge/ui";
import { Button } from "@forge/ui/button";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Hackathons", href: "/hackathons" },
  { label: "Teams", href: "/teams" },
  { label: "Sponsors", href: "/sponsors" },
] as const;

const ACTION_LINKS = [
  {
    label: "Sign Up With Blade",
    hrefKey: "blade",
    className: "club-nav-action-primary",
  },
  {
    label: "Join Discord",
    hrefKey: "discord",
    className: "club-nav-action-secondary",
  },
] as const;

const MOBILE_MENU_ID = "club-mobile-menu";

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onSelect,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  onSelect?: (href: string) => void;
}) {
  const isActive = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
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
        const href =
          action.hrefKey === "blade"
            ? bladeUrl
            : "https://discord.gg/knighthacks";

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
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const MenuIcon = isMobileOpen ? X : Menu;

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsMobileOpen(false);
      setIsHidden(false);
      lastScrollYRef.current = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [pathname]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    let animationFrameId: number | null = null;

    function updateNavbarVisibility() {
      animationFrameId = null;

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(scrollDelta) < 6) {
        return;
      }

      setIsHidden(scrollDelta > 0 && currentScrollY > 96);
      lastScrollYRef.current = currentScrollY;
    }

    function handleScroll() {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateNavbarVisibility);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#120616]/80 backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none",
        isHidden && !isMobileOpen && "pointer-events-none -translate-y-full",
      )}
    >
      <nav className="relative mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6 lg:px-8 xl:px-10">
        <Link
          href="/"
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
          {NAV_ITEMS.map((item) => (
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
          <MenuIcon aria-hidden="true" className="size-5" />
        </button>

        {isMobileOpen ? (
          <div
            id={MOBILE_MENU_ID}
            className="absolute left-0 top-full z-50 flex w-full flex-col gap-2 border-t border-white/10 bg-[#120616] p-5 shadow-[0_22px_55px_rgba(3,0,6,0.42)] lg:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onSelect={() => setIsMobileOpen(false)}
              />
            ))}
            <ActionLinks
              bladeUrl={bladeUrl}
              stacked
              className="mt-2"
              onSelect={() => setIsMobileOpen(false)}
            />
          </div>
        ) : null}
      </nav>
    </header>
  );
}
