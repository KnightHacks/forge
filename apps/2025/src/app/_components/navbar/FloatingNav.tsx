"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import React, { useEffect, useState } from "react";

interface NavLink {
  href: string;
  label: string;
}

interface FloatingNavProps {
  navLinks: NavLink[];
}

function FloatingNav({ navLinks }: FloatingNavProps) {
  const [activeSection, setActiveSection] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map((link) => link.href.substring(1));
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navLinks]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest(".mobile-nav-container")) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    // Smooth scroll to section with better error handling
    setTimeout(() => {
      const element = document.querySelector(href);
      if (element) {
        const offset = 80; // Account for fixed navbar
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      } else {
        console.warn(`Section ${href} not found`);
      }
    }, 100); // Small delay to ensure menu closes first
  };

  const handleDesktopNavClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    href: string,
  ) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    } else {
      console.warn(`Section ${href} not found`);
    }
  };

  // Color scheme for alternating active states
  const getNavColors = (index: number): { bg: string; hover: string } => {
    const colorOptions = [
      { bg: "#d83434", hover: "#b12b2b" }, // Red
      { bg: "#FBB03B", hover: "#e09c33" }, // Yellow
      { bg: "#1570AD", hover: "#125a8a" }, // Blue
    ];
    const colorIndex = index % 3;
    return colorOptions[colorIndex as 0 | 1 | 2];
  };

  return (
    <>
      {/* Desktop Floating Navbar */}
      <AnimatePresence>
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 left-1/2 z-[9999] hidden w-auto -translate-x-1/2 md:block"
        >
          <div className="group relative">
            {/* Main navbar container with TextBox styling - Made wider */}
            <div className="relative w-5xl max-w-6xl rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
              <div className="flex items-center gap-4 p-4">
                {/* Logo */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex h-12 w-12 items-center justify-center rounded-none bg-white outline-1 -outline-offset-1 outline-black"
                >
                  <Image
                    src="/KH2025Small.svg"
                    alt="Knight Hacks 2025 Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                </motion.div>

                {/* Desktop Navigation Links */}
                <div className="flex flex-1 items-center justify-center gap-3">
                  {navLinks.map((link, index) => {
                    const isActive = activeSection === link.href.substring(1);
                    const navColors = getNavColors(index);
                    return (
                      <motion.button
                        key={link.href}
                        onClick={(e) => handleDesktopNavClick(e, link.href)}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`tk-ccmeanwhile relative flex min-h-[50px] cursor-pointer items-center justify-center rounded-none px-6 py-3 text-lg font-bold outline-1 -outline-offset-1 outline-black transition-all duration-200 ${
                          isActive
                            ? "text-white shadow-lg"
                            : "text-slate-800 hover:text-white"
                        }`}
                        style={{
                          minWidth: "120px",
                          backgroundColor: isActive
                            ? navColors.bg
                            : "transparent",
                          ...(isActive
                            ? {}
                            : ({
                                "--hover-bg": navColors.bg,
                              } as React.CSSProperties)),
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.target as HTMLElement).style.backgroundColor =
                              navColors.bg;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.target as HTMLElement).style.backgroundColor =
                              "transparent";
                          }
                        }}
                      >
                        {link.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Black drop shadow */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
          </div>
        </motion.nav>
      </AnimatePresence>

      {/* Mobile Floating Button - Always Visible */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mobile-nav-container fixed top-4 left-4 z-[9999] touch-manipulation md:hidden"
      >
        <div className="group relative">
          {/* Mobile button with TextBox styling */}
          <motion.button
            onClick={handleMobileMenuToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-12 w-12 cursor-pointer touch-manipulation items-center justify-center rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <div className="pointer-events-none flex flex-col gap-1.5">
              <motion.div
                animate={
                  isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }
                }
                className="h-0.5 w-6 rounded-none bg-slate-800"
              />
              <motion.div
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="h-0.5 w-6 rounded-none bg-slate-800"
              />
              <motion.div
                animate={
                  isMobileMenuOpen
                    ? { rotate: -45, y: -8 }
                    : { rotate: 0, y: 0 }
                }
                className="h-0.5 w-6 rounded-none bg-slate-800"
              />
            </div>
          </motion.button>

          {/* Black drop shadow for mobile button */}
          <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mobile-nav-container absolute top-full left-0 z-[9999] mt-2 touch-manipulation"
              style={{
                WebkitTapHighlightColor: "transparent",
                maxHeight: "calc(100vh - 100px)",
                overflowY: "auto",
              }}
            >
              <div className="group relative">
                {/* Mobile menu with TextBox styling */}
                <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
                  <div className="min-w-[200px] space-y-2 p-3">
                    {navLinks.map((link, index) => {
                      const isActive = activeSection === link.href.substring(1);
                      const navColors = getNavColors(index);
                      return (
                        <motion.button
                          key={link.href}
                          onClick={() => handleMobileNavClick(link.href)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`tk-ccmeanwhile flex min-h-[48px] w-full cursor-pointer items-center rounded-none px-4 py-3 text-left text-base font-bold outline-1 -outline-offset-1 outline-black transition-all duration-200 ${
                            isActive
                              ? "text-white shadow-md"
                              : "text-slate-800 hover:text-white"
                          }`}
                          style={{
                            backgroundColor: isActive
                              ? navColors.bg
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.target as HTMLElement).style.backgroundColor =
                                navColors.bg;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.target as HTMLElement).style.backgroundColor =
                                "transparent";
                            }
                          }}
                        >
                          <span className="pointer-events-none">
                            {link.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Black drop shadow for mobile menu */}
                <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

export default FloatingNav;
