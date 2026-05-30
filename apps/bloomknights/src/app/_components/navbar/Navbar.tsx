"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import MLHBadge from "./MLHBadge";
import NavContent from "./NavContent";

const hackersGuide = "https://knight-hacks.notion.site/bloomknights2025";
const discordLink = "https://discord.gg/2W2HCvkKAy";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#faqs", label: "FAQs" },
  { href: "#partners", label: "Partners" },
  { href: hackersGuide, label: "Hackers Guide", external: true },
  { href: discordLink, label: "Discord", external: true },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed left-0 top-0 z-50 w-full bg-transparent"
      >
        <NavContent navLinks={NAV_LINKS} showGlow={isScrolled} />
      </motion.nav>

      <MLHBadge showFloating={isScrolled} />
    </>
  );
};

export default Navbar;
