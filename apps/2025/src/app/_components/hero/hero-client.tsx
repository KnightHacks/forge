"use client";

import { motion } from "framer-motion";
import HeroSVG from "./hero-svg";
import KnightHacksSVG from "./knight-hacks-svg";
import RegisterButtonMotion from "./register-button-motion";

interface HeroClientProps {
  registerUrl: string;
}

export default function HeroClient({ registerUrl }: HeroClientProps) {
  return (
    <motion.div
      className="flex h-screen flex-col items-center justify-center relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-full flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
        style={{ zIndex: 1 }}
      >
        <KnightHacksSVG
          role="img"
          aria-label="Knight Hacks 2025 - Official Hackathon Logo"
          className="h-auto w-[70%] sm:w-[65%] md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        className="w-full flex items-center justify-center"
      >
        <HeroSVG
          role="img"
          aria-label="Join the fight! Knight Hacks hackathon happening October 24th through 26th, 2025"
          className="mb-4 h-auto w-[70%] sm:w-[65%] md:mb-8 md:w-[55%] lg:w-[45%] xl:w-[40%] 2xl:w-[30%]"
        />
      </motion.div>
      <RegisterButtonMotion url={registerUrl} />
    </motion.div>
  );
}
