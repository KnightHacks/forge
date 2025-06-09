"use client";

import { useState, useEffect } from "react";
import MainNav from "./MainNav";
import FloatingNav from "./FloatingNav";
import MLHBadge from "./MLHBadge";

const hackersGuide = "https://knight-hacks.notion.site/gemiknights2025";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#faqs", label: `FAQ` },
  { href: "#partners", label: "Partners" },
  { href: hackersGuide, label: "Hackers Guide", external: true },
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
      <MainNav navLinks={NAV_LINKS} />
      <FloatingNav navLinks={NAV_LINKS} show={showFloating} />
      <MLHBadge showFloating={showFloating} />
    </>
  );
};

export default Navbar;
