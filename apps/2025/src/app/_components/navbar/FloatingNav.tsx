"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
}

interface FloatingNavProps {
  navLinks: NavLink[];
  show: boolean;
}

function FloatingNav({ navLinks, show }: FloatingNavProps) {
  const [activeSection, setActiveSection] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map(link => link.href.substring(1));
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [navLinks]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    // Smooth scroll to section
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Desktop Floating Navbar */}
      <AnimatePresence>
        {show && (
          <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-4 left-1/2 z-50 hidden w-auto -translate-x-1/2 md:block"
          >
            <div className="relative">
              {/* Backdrop blur and glass effect */}
              <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl" />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/20 via-orange-500/20 to-red-500/20" />
              
              {/* Content */}
              <div className="relative flex items-center gap-2 p-3">
                {/* Logo */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <Image
                    src="/KH2025Small.svg"
                    alt="Knight Hacks 2025 Logo"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </motion.div>

                {/* Desktop Navigation Links */}
                <div className="flex items-center gap-2">
                  {navLinks.map((link, index) => {
                    const isActive = activeSection === link.href.substring(1);
                    return (
                      <motion.a
                        key={link.href}
                        href={link.href}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative rounded-xl px-6 py-3 text-base font-medium text-white transition-all duration-200 ${
                          isActive 
                            ? "bg-white/20 text-amber-300 shadow-lg" 
                            : "hover:bg-white/10 hover:text-amber-200"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/30 to-orange-500/30 border border-amber-300/50"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <span className="relative z-10">{link.label}</span>
                      </motion.a>
                    );
                  })}
                </div>
              </div>

              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/10 via-orange-500/10 to-red-500/10 blur-xl" />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile Floating Button - Always Visible */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        <div className="relative">
          {/* Backdrop blur and glass effect */}
          <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl" />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/20 via-orange-500/20 to-red-500/20" />
          
          {/* Mobile Button Content */}
          <motion.button
            onClick={handleMobileMenuToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl"
          >
            <div className="flex flex-col gap-1.5">
              <motion.div
                animate={isMobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                className="w-6 h-0.5 bg-white rounded-full"
              />
              <motion.div
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-6 h-0.5 bg-white rounded-full"
              />
              <motion.div
                animate={isMobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                className="w-6 h-0.5 bg-white rounded-full"
              />
            </div>
          </motion.button>

          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/10 via-orange-500/10 to-red-500/10 blur-xl" />
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 mt-2"
            >
              <div className="relative">
                {/* Backdrop blur and glass effect for mobile menu */}
                <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/20 via-orange-500/20 to-red-500/20" />
                
                {/* Mobile menu content */}
                <div className="relative p-3 space-y-2 min-w-[200px]">
                  {navLinks.map((link, index) => {
                    const isActive = activeSection === link.href.substring(1);
                    return (
                      <motion.button
                        key={link.href}
                        onClick={() => handleMobileNavClick(link.href)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full text-left rounded-xl px-4 py-3 text-base font-medium text-white transition-all duration-200 ${
                          isActive 
                            ? "bg-white/20 text-amber-300 shadow-lg" 
                            : "hover:bg-white/10 hover:text-amber-200"
                        }`}
                      >
                        {link.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

export default FloatingNav;
