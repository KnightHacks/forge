"use client";

import type { ReactElement } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactElement;
}

const MotionDiv = ({ children }: Props) => {
  return (
    <motion.div
      className="h-full w-full"
      initial={{
        opacity: 0,
        x: -50,
        y: 20,
        scale: 1,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: { duration: 1, delay: 2 },
      }}
      viewport={{ once: true }}
    >
      {children}
    </motion.div>
  );
};

export default MotionDiv;
