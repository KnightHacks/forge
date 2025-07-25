"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

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
  const [isAtTop, setIsAtTop] = useState(true);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      // Check if we're at the top of the page
      const atTop = scrollPosition < 100;
      setIsAtTop(atTop);

      // Only handle navbar visibility if not currently navigating via link clicks
      if (!isNavigating) {
        // Determine scroll direction and navbar visibility
        if (scrollPosition < 100) {
          // Always show navbar when near top
          setIsNavVisible(true);
        } else {
          // Hide when scrolling down, show when scrolling up
          if (scrollPosition > lastScrollY.current && scrollPosition > 200) {
            // Scrolling down - hide navbar
            setIsNavVisible(false);
            setIsMobileMenuOpen(false); // Close mobile menu when hiding
          } else if (scrollPosition < lastScrollY.current) {
            // Scrolling up - show navbar
            setIsNavVisible(true);
          }
        }

        lastScrollY.current = scrollPosition;
      }

      if (atTop) {
        setActiveSection("");
        return;
      }

      const sections = navLinks.map((link) => link.href.substring(1));
      const scrollWithOffset = scrollPosition + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollWithOffset >= offsetTop &&
            scrollWithOffset < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navLinks, isNavigating]);

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
    setIsNavigating(true); // Disable navbar tweening

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
      }
    }, 100); // Small delay to ensure menu closes first

    // Re-enable navbar tweening after smooth scroll completes (increased timeout)
    setTimeout(() => {
      setIsNavigating(false);
    }, 1500);
  };

  const handleDesktopNavClick = (href: string) => {
    setIsNavigating(true); // Disable navbar tweening

    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }

    // Re-enable navbar tweening after smooth scroll completes (increased timeout)
    setTimeout(() => {
      setIsNavigating(false);
    }, 3000);
  };

  const handleLogoClick = () => {
    setIsNavigating(true); // Disable navbar tweening

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Re-enable navbar tweening after smooth scroll completes (increased timeout)
    setTimeout(() => {
      setIsNavigating(false);
    }, 3000);
  };

  // Color scheme for alternating active states
  // About - Yellow, Tracks - Red, Sponsors - Blue, Partners - Yellow, FAQ - Red
  const getNavColors = (index: number): { bg: string; hover: string } => {
    const colorOptions = [
      { bg: "#FBB03B", hover: "#e09c33" }, // Yellow - About
      { bg: "#d83434", hover: "#b12b2b" }, // Red - Tracks
      { bg: "#1570AD", hover: "#125a8a" }, // Blue - Sponsors
      { bg: "#FBB03B", hover: "#e09c33" }, // Yellow - Partners
      { bg: "#d83434", hover: "#b12b2b" }, // Red - FAQ
    ];
    const colorIndex = index % 5;
    // Ensure we never return undefined by defaulting to the first color if out of bounds
    return colorOptions[colorIndex] ?? { bg: "#FBB03B", hover: "#e09c33" };
  };

  return (
    <>
      {/* Skip Navigation Link for Screen Readers */}
      <a
        href="#main-content"
        className="sr-only fixed top-0 left-0 z-[10000] rounded-none bg-[#d83434] px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        Skip to main content
      </a>

      {/* Desktop Floating Navbar */}
      <AnimatePresence>
        {isNavVisible && (
          <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-4 left-1/2 z-[9999] hidden w-auto -translate-x-1/2 md:block"
            role="navigation"
            aria-label="Main navigation"
          >
            <div className="group relative">
              {/* Main navbar container with TextBox styling - Made wider */}
              <div className="relative w-4xl max-w-6xl rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 xl:w-5xl">
                <div className="flex items-center gap-4 p-4">
                  {/* Logo - Clickable but no highlight */}
                  <motion.button
                    onClick={handleLogoClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-none outline-1 -outline-offset-1 outline-black focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434]"
                    aria-label="Go to top of page"
                  >
                    <Image
                      src="/KH2025Small.svg"
                      alt="Knight Hacks 2025 Logo"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                      draggable={false}
                    />
                  </motion.button>

                  {/* Desktop Navigation Links */}
                  <div
                    className="flex flex-1 items-center justify-center gap-3"
                    role="list"
                  >
                    {navLinks.map((link, index) => {
                      const isActive =
                        !isAtTop && activeSection === link.href.substring(1);
                      const navColors = getNavColors(index);
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          tabIndex={0}
                          onClick={e => {
                            e.preventDefault();
                            handleDesktopNavClick(link.href);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleDesktopNavClick(link.href);
                            }
                          }}
                          className={`tk-ccmeanwhile relative flex min-h-[50px] cursor-pointer items-center justify-center rounded-none px-6 py-3 text-base font-bold outline-1 -outline-offset-1 outline-black transition-all duration-200 focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434] xl:text-lg ${
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
                          onMouseEnter={e => {
                            if (!isActive) {
                              (e.target as HTMLElement).style.backgroundColor =
                                navColors.bg;
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isActive) {
                              (e.target as HTMLElement).style.backgroundColor =
                                "transparent";
                            }
                          }}
                          role="listitem"
                          aria-current={isActive ? "page" : undefined}
                        >
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Black drop shadow */}
              <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile Floating Button - Always Visible */}
      <AnimatePresence>
        {isNavVisible && (
          <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mobile-nav-container fixed top-4 left-4 z-[9999] touch-manipulation md:hidden"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="group relative">
              {/* Mobile button with TextBox styling */}
              <motion.button
                ref={mobileButtonRef}
                onClick={handleMobileMenuToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative flex h-12 w-12 cursor-pointer touch-manipulation items-center justify-center rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434]"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={
                  isMobileMenuOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation-menu"
              >
                <div className="pointer-events-none flex flex-col gap-1.5">
                  <motion.div
                    animate={
                      isMobileMenuOpen
                        ? { rotate: 45, y: 8 }
                        : { rotate: 0, y: 0 }
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
                  ref={mobileMenuRef}
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
                  id="mobile-navigation-menu"
                  role="menu"
                  aria-labelledby="mobile-menu-button"
                >
                  <div className="group relative">
                    {/* Mobile menu with TextBox styling */}
                    <div className="relative rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1">
                      <div className="min-w-[200px] space-y-2 p-3">
                        {navLinks.map((link, index) => {
                          const isActive =
                            !isAtTop &&
                            activeSection === link.href.substring(1);
                          const navColors = getNavColors(index);
                          return (
                            <a
                              key={link.href}
                              ref={index === 0 ? firstNavLinkRef : undefined}
                              href={link.href}
                              tabIndex={0}
                              onClick={e => {
                                e.preventDefault();
                                handleMobileNavClick(link.href);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleMobileNavClick(link.href);
                                }
                              }}
                              className={`tk-ccmeanwhile flex min-h-[48px] w-full cursor-pointer items-center rounded-none px-4 py-3 text-left text-base font-bold outline-1 -outline-offset-1 outline-black transition-all duration-200 focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434] ${
                                isActive
                                  ? "text-white shadow-md"
                                  : "text-slate-800 hover:text-white"
                              }`}
                              style={{
                                backgroundColor: isActive
                                  ? navColors.bg
                                  : "transparent",
                              }}
                              onMouseEnter={e => {
                                if (!isActive) {
                                  (
                                    e.target as HTMLElement
                                  ).style.backgroundColor = navColors.bg;
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isActive) {
                                  (
                                    e.target as HTMLElement
                                  ).style.backgroundColor = "transparent";
                                }
                              }}
                              role="menuitem"
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span className="pointer-events-none">
                                {link.label}
                              </span>
                            </a>
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
        )}
      </AnimatePresence>
    </>
  );
}

export default FloatingNav;
