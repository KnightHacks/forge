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
      className="flex w-full scroll-mt-32 flex-col items-center justify-center px-4"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.3 }}
    >
      <span className="spring-heading animate-float-bob-slow mb-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
        FAQ
      </span>
      <div className="wc-panel w-full max-w-[90%] px-4 py-4 sm:max-w-[80%] sm:px-6 sm:py-6 md:max-w-3xl md:px-8 md:py-8">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index + 1}`}
              className="faq-item"
            >
              <AccordionTrigger className="font-righteous wc-ink-text w-full rounded-xl px-4 py-3 text-left text-sm font-bold uppercase tracking-wide transition-all duration-500 hover:scale-[1.01] hover:text-[#7a4a1e] sm:px-5 sm:py-4 sm:text-base md:px-6 md:text-lg lg:text-xl">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="font-dm-sans wc-ink-soft overflow-hidden text-xs data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down sm:text-sm md:text-base lg:text-lg">
                <div className="px-4 pb-4 pt-1 sm:px-6 sm:pb-5 md:px-6 md:pb-6">
                  {item.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </motion.div>
  );
};

export default FAQ;
