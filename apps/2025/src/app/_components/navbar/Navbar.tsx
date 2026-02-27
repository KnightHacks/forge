"use client";

import { useEffect, useState } from "react";
import FloatingNav from "./FloatingNav";
import MLHBadge from "./MLHBadge";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#tracks", label: "Tracks" },
  { href: "#sponsors", label: "Sponsors" },
  { href: "#partners", label: "Partners" },
  { href: "#faqs", label: `FAQ's` },
];

const Navbar = () => {
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show navbar when scrolling, hide when at top
      const shouldShow = window.scrollY > 50;
      setShowFloating(shouldShow);
    };

    // set initial value without a dedicated mounted state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <FloatingNav navLinks={NAV_LINKS} />
      <MLHBadge showFloating={showFloating} />
    </>
  );
};

export default Navbar;
