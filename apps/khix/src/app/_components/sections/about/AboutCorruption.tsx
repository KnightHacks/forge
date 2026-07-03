"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import styles from "./AboutCorruption.module.css";

export function AboutCorruption() {
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start 86%", "end 18%"],
  });
  const easedProgress = useSpring(scrollYProgress, {
    stiffness: 82,
    damping: 24,
    mass: 0.42,
  });
  const gloomOpacity = useTransform(
    easedProgress,
    [0, 0.28, 0.72],
    shouldReduceMotion ? [1, 1, 1] : [0, 0.34, 1],
  );
  const gloomY = useTransform(
    easedProgress,
    [0, 1],
    shouldReduceMotion ? ["0svh", "0svh"] : ["0svh", "0svh"],
  );
  const gloomScale = useTransform(
    easedProgress,
    [0, 1],
    shouldReduceMotion ? [1, 1] : [1, 1],
  );

  return (
    <div ref={rootRef} className={styles.corruption} aria-hidden="true">
      <span className={styles.front} data-about-front />
      <motion.span
        className={styles.gloom}
        data-about-gloom
        style={{
          opacity: gloomOpacity,
          scale: gloomScale,
          y: gloomY,
        }}
      />
    </div>
  );
}
