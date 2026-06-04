"use client";

import React from "react";
import { motion } from "framer-motion";

import { navChromeTransition } from "./motion";

interface MLHBadgeProps {
  isHidden: boolean;
}

function MLHBadge({ isHidden }: MLHBadgeProps) {
  return (
    <motion.a
      id="mlh-trust-badge"
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: isHidden ? 0 : 1, y: isHidden ? "-110%" : 0 }}
      transition={navChromeTransition}
      className="fixed right-4 top-0 z-[10000] block w-[60px] max-w-[100px] sm:right-8 sm:w-[10%] md:right-[50px]"
      href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2027-season&utm_content=white"
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={isHidden}
      tabIndex={isHidden ? -1 : undefined}
      style={{ pointerEvents: isHidden ? "none" : "auto" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- MLH serves this required badge as a remote SVG. */}
      <img
        src="https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-white.svg"
        alt="Major League Hacking 2027 Hackathon Season"
        loading="eager"
        fetchPriority="high"
        style={{ width: "100%" }}
      />
    </motion.a>
  );
}

export default MLHBadge;
