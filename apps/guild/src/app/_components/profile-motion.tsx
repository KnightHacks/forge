"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, MotionConfig } from "framer-motion";

export function ProfileMotion({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.article
        className={className}
        initial={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
        style={style}
      >
        {children}
      </motion.article>
    </MotionConfig>
  );
}
