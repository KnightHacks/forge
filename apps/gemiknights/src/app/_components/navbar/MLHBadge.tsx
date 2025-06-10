"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface MLHBadgeProps {
  showFloating: boolean;
}

function MLHBadge({ showFloating }: MLHBadgeProps) {
  return (
    <AnimatePresence>
      {!showFloating && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="fixed right-4 top-0 z-[10000]"
          style={{ maxWidth: "100px", minWidth: "60px", width: "10vw" }}
        >
          <a
            id="mlh-trust-badge"
            className="block"
            href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="https://s3.amazonaws.com/logged-assets/trust-badge/2026/mlh-trust-badge-2026-white.svg"
              alt="Major League Hacking 2026 Hackathon Season"
              width={100}
              height={100}
              className="w-full"
            />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MLHBadge;
