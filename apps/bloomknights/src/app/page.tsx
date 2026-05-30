"use client";

import { motion } from "framer-motion";

import About from "./_components/about/about";
import DiscordCTAButton from "./_components/discord/discord";
import FAQ from "./_components/faq/faq";
import Logo from "./_components/graphics/logo";
import Partners from "./_components/partners/partners";
import Register from "./_components/register/registerButton";

export default function HomePage() {
  return (
    <div className="font-fredoka-one flex w-full flex-col items-center justify-center text-4xl">
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 pt-24">
        <motion.div
          className="animate-fade-up"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
        >
          <Logo />
        </motion.div>
        <div
          className="animate-fade-up"
          style={{ animationDelay: "0.25s", opacity: 0 }}
        >
          <Register />
        </div>
      </div>

      <div className="flex w-full flex-col">
        <div className="flex min-h-screen items-center justify-center py-24">
          <About />
        </div>
        <div className="flex min-h-screen items-center justify-center py-24">
          <FAQ />
        </div>
        <div className="flex w-full items-center justify-center gap-4 py-16">
          <Partners />
        </div>
        <div className="flex min-h-[50vh] items-center justify-center">
          <DiscordCTAButton />
        </div>
      </div>
    </div>
  );
}
