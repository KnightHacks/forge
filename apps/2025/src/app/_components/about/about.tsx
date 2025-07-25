"use client";

import { motion } from "framer-motion";

import AboutComicSVG from "./about-comic-svg";
import AboutText from "./about-text";

export default function About() {
  return (
    <motion.div
      id="about"
      className="z-10 flex w-full justify-center px-4 pt-6 sm:px-6 md:px-8 md:pt-8 lg:px-12 lg:pt-12"
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="relative w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%]">
        <AboutText />
        <div className="my-8 flex justify-center sm:my-12 md:my-16 lg:my-20 xl:my-24">
          <AboutComicSVG
            aria-label="Hackers Must Choose - Defeat Darkness, or Take Over the World!"
            className="h-auto sm:w-[93%] md:w-[91%] lg:w-[89%] xl:w-[87%] 2xl:w-[80%]"
          />
        </div>
      </div>
    </motion.div>
  );
}
