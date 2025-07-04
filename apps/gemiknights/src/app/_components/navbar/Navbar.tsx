"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import FloatingNav from "./FloatingNav";
import MainNav from "./MainNav";
import MLHBadge from "./MLHBadge";

const hackersGuide = "https://knight-hacks.notion.site/gemiknights2025";
const discordLink = "https://discord.gg/2W2HCvkKAy";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#faqs", label: `FAQ` },
  { href: "#partners", label: "Partners" },
  { href: hackersGuide, label: "Hackers Guide", external: true },
  { href: discordLink, label: "Discord", external: true },
];

const Navbar = () => {
  const [showFloating, setShowFloating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setShowFloating(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <MainNav navLinks={NAV_LINKS} />
      </motion.div>

      <FloatingNav navLinks={NAV_LINKS} show={showFloating} />
      <MLHBadge showFloating={showFloating} />
    </>
  );
};

export default Navbar;
