"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MLHBadgeProps {
  showFloating: boolean;
}

function MLHBadge({ showFloating }: MLHBadgeProps) {
  return (
    <AnimatePresence>
      {!showFloating && (
        <motion.a
          id="mlh-trust-badge"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            maxWidth: "100px",
            minWidth: "60px",
            position: "fixed",
            right: "50px",
            top: 0,
            width: "10%",
            zIndex: 10000,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- MLH serves this required badge as a remote SVG. */}
          <img
            src="https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-white.svg"
            alt="Major League Hacking 2026 Hackathon Season"
            loading="eager"
            fetchPriority="high"
            style={{ width: "100%" }}
          />
        </motion.a>
      )}
    </AnimatePresence>
  );
}

export default MLHBadge;
