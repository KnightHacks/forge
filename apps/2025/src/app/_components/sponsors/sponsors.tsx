"use client";

import { motion } from "framer-motion";

import SponsorPosters from "./sponsorPosters";
import SponsorsTitle from "./sponsorsTitle";

const sponsors = () => {
  return (
    <div className="flex w-full justify-center">
      <motion.div
        id="sponsors"
        className="mt-32 mb-8 h-auto w-[90%] sm:mt-40 sm:mb-12 md:mt-48 md:mb-16 lg:mt-64 lg:mb-20 xl:mt-80 xl:mb-24"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <SponsorsTitle />
        <SponsorPosters />
      </motion.div>
    </div>
  );
};

export default sponsors;
