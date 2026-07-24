"use client";

import type { ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";

export function CollectionMotion({
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
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { delayChildren: 0.06, staggerChildren: 0.045 },
          },
        }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function CollectionMotionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, scale: 0.985, translateY: 14 },
        visible: {
          opacity: 1,
          scale: 1,
          translateY: 0,
          transition: {
            damping: 26,
            mass: 0.7,
            stiffness: 250,
            type: "spring",
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
