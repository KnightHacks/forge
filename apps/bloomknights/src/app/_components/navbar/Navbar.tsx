"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";

import MLHBadge from "./MLHBadge";
import { navChromeTransition } from "./motion";
import NavContent from "./NavContent";

const hackersGuide = "https://knight-hacks.notion.site/bloomknights2026";
const discordLink = "https://discord.gg/2W2HCvkKAy";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#faqs", label: "FAQs" },
  { href: "#partners", label: "Partners" },
  { href: hackersGuide, label: "Hackers Guide", external: true },
  { href: discordLink, label: "Discord", external: true },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > 100,
  );
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const closeMobileMenuOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileMenuOpen(false);
    };

    desktopQuery.addEventListener("change", closeMobileMenuOnDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeMobileMenuOnDesktop);
    };
  }, []);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? current;
    const scrollDelta = current - previous;
    const isPastHeroChrome = current > 120;

    setIsScrolled(current > 100);

    if (isMobileMenuOpen) {
      setIsHidden(false);
      return;
    }

    if (Math.abs(scrollDelta) < 4) return;

    setIsHidden(scrollDelta > 0 && isPastHeroChrome);
  });

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: isHidden ? 0 : 1, y: isHidden ? -96 : 0 }}
        transition={navChromeTransition}
        className="fixed left-0 top-0 z-50 w-full bg-transparent"
        aria-hidden={isHidden}
        inert={isHidden ? true : undefined}
        style={{ pointerEvents: isHidden ? "none" : "auto" }}
      >
        <NavContent
          isHidden={isHidden}
          isMobileMenuOpen={isMobileMenuOpen}
          navLinks={NAV_LINKS}
          showGlow={isScrolled}
          onMobileMenuClose={() => setIsMobileMenuOpen(false)}
          onMobileMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        />
      </motion.nav>

      <MLHBadge isHidden={isHidden || isMobileMenuOpen} />
    </>
  );
};

export default Navbar;
