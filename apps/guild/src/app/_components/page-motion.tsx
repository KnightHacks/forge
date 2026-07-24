"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";

export function PageIntroMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        className={className}
        initial={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.header>
    </MotionConfig>
  );
}

export function PageSurfaceMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, scale: 0.99, translateY: 12 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{
          damping: 27,
          delay: 0.05,
          mass: 0.75,
          stiffness: 245,
          type: "spring",
        }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
