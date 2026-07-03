"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import Dargon from "../graphics/dargon";
import { navChromeTransition } from "./motion";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

interface NavContentProps {
  isHidden?: boolean;
  isMobileMenuOpen: boolean;
  navLinks: NavLink[];
  showGlow?: boolean;
  showSignOut?: boolean;
  onMobileMenuClose: () => void;
  onMobileMenuToggle: () => void;
  onSignOut?: () => void;
}

const scrolledLinkGlow: React.CSSProperties = {
  textShadow:
    "0 0 8px rgba(56, 142, 70, 1), 0 0 18px rgba(34, 139, 64, 0.9), 0 0 34px rgba(17, 104, 45, 0.78), 0 0 56px rgba(9, 72, 32, 0.58), 0 1px 8px rgba(5, 42, 19, 0.65)",
};

function NavContent({
  isHidden = false,
  isMobileMenuOpen,
  navLinks,
  showGlow = false,
  showSignOut = false,
  onMobileMenuClose,
  onMobileMenuToggle,
  onSignOut,
}: NavContentProps) {
  return (
    <div className="relative flex h-20 items-center px-4 md:justify-between md:px-12 lg:px-32">
      <button
        type="button"
        className="bg-[#fff7dc]/18 group relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-[#fff7dc]/70 shadow-[0_10px_28px_rgba(12,56,26,0.18)] backdrop-blur-md transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff7dc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#245f34] md:hidden"
        aria-controls="bloom-mobile-nav"
        aria-expanded={isMobileMenuOpen}
        aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
        tabIndex={isHidden ? -1 : undefined}
        onClick={onMobileMenuToggle}
      >
        <Image
          src="/BloomKnightsSigil.svg"
          alt=""
          width={100}
          height={100}
          draggable={false}
          className="h-14 w-14"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#fff7dc] bg-[#245f34] text-[#fff7dc] shadow-[0_5px_14px_rgba(12,56,26,0.28)] transition-colors duration-300 group-hover:bg-[#2f7442]"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <Menu className="h-4 w-4" strokeWidth={2.5} />
          )}
        </span>
      </button>

      <div className="hidden items-center md:flex">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-500 hover:scale-110 md:h-12 md:w-12">
          <Dargon />
        </div>
      </div>
      <div className="hidden items-center justify-center gap-8 md:flex">
        {navLinks.map((link) => (
          <a
            key={`${link.label}:${link.href}`}
            href={link.href}
            className="wc-nav-link rounded-md px-2 py-1 text-base transition-[color,text-shadow,transform] duration-500 lg:text-lg"
            style={showGlow ? scrolledLinkGlow : undefined}
            tabIndex={isHidden ? -1 : undefined}
            {...(link.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <span className="relative z-10">{link.label}</span>
          </a>
        ))}
        {showSignOut && (
          <button
            type="button"
            className="wc-nav-link rounded-md px-2 py-1 text-base transition-[color,text-shadow,transform] duration-500 lg:text-lg"
            style={showGlow ? scrolledLinkGlow : undefined}
            tabIndex={isHidden ? -1 : undefined}
            onClick={onSignOut}
          >
            Sign out
          </button>
        )}
      </div>
      <div className="hidden w-12 md:block" />

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="bloom-mobile-nav"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={navChromeTransition}
            className="absolute left-4 right-4 top-24 overflow-hidden rounded-lg border border-[#245f34]/15 bg-[#fff7dc]/95 text-[#245f34] shadow-[0_18px_48px_rgba(16,64,30,0.2)] backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col py-2">
              {navLinks.map((link) => (
                <a
                  key={`${link.label}:${link.href}`}
                  href={link.href}
                  className="font-righteous px-5 py-3 text-lg tracking-normal transition-colors duration-300 hover:bg-[#245f34]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#245f34]"
                  tabIndex={isHidden ? -1 : undefined}
                  onClick={onMobileMenuClose}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {link.label}
                </a>
              ))}
              {showSignOut && (
                <button
                  type="button"
                  className="font-righteous px-5 py-3 text-left text-lg tracking-normal transition-colors duration-300 hover:bg-[#245f34]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#245f34]"
                  tabIndex={isHidden ? -1 : undefined}
                  onClick={() => {
                    onMobileMenuClose();
                    onSignOut?.();
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NavContent;
