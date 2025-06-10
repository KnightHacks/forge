"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { motion } from "framer-motion";

import { faqItems } from "./faq-data";

const FAQ = () => {
  return (
    <motion.div
      id="faqs"
      className="flex w-full flex-col items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <span className="tk-forma-djr-display mb-6 text-3xl font-bold sm:mb-8 sm:text-4xl md:mb-10 md:text-5xl">
        FAQ
      </span>
      <Accordion type="single" collapsible className="w-3/5">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index + 1}`}
            className="border-b"
          >
            <AccordionTrigger className="w-full rounded-lg px-4 py-2 text-left text-base font-semibold transition-all duration-500 hover:scale-[1.02] hover:bg-white/5 sm:px-5 sm:py-3 sm:text-lg md:px-6 md:py-4 md:text-xl">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="tk-peridot-devanagari overflow-hidden p-4 text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down sm:p-5 sm:text-base md:p-6 md:text-lg">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
};

export default FAQ;
