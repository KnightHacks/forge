"use client";

import { motion } from "framer-motion";

import PartnerPosters from "./partnerPosters";
import PartnersTitle from "./partnersTitle";

const partners = () => {
  return (
    <div className="flex w-full justify-center">
      <motion.div
        id="partners"
        className="mb-16 h-auto w-[90%] sm:mb-20 md:mb-24 lg:mb-32 xl:mb-40"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.2 }}
      >
        <PartnersTitle />
        <PartnerPosters />
      </motion.div>
    </div>
  );
};

export default partners;
