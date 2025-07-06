"use client";

import { useState, useEffect } from "react";
import FloatingNav from "./FloatingNav";
import MLHBadge from "./MLHBadge";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#tracks", label: "Tracks" },
  { href: "#sponsors", label: "Sponsors" },
  { href: "#faqs", label: `FAQ's` },
];

const Navbar = () => {
  const [showFloating, setShowFloating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      // Show navbar when scrolling, hide when at top
      const shouldShow = window.scrollY > 50;
      setShowFloating(shouldShow);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <FloatingNav navLinks={NAV_LINKS} show={showFloating} />
      <MLHBadge showFloating={showFloating} />
    </>
  );
};

export default Navbar;
