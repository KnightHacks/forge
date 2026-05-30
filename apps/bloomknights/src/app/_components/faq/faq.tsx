"use client";

import type { Variants } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { motion } from "framer-motion";

import { faqSections } from "./faq-data";

const sectionReveal: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const focusPanelReveal: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.08,
    },
  },
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.78,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const questionReveal: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.62,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const sparkNames = ["one", "two", "three", "four", "five", "six"] as const;

const FAQ = () => {
  return (
    <motion.div
      id="faqs"
      className="flex w-full scroll-mt-32 flex-col items-center justify-center px-4"
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.14, margin: "0px 0px 18% 0px" }}
    >
      <motion.div variants={revealItem}>
        <h2 className="spring-heading animate-float-bob-slow mb-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          FAQ
        </h2>
      </motion.div>
      <motion.div
        className="bloom-focus-field bloom-focus-field-wide w-full max-w-[92%] px-1 py-5 sm:max-w-[86%] sm:px-2 sm:py-7 md:max-w-5xl md:px-6 md:py-9"
        variants={focusPanelReveal}
      >
        <div className="relative grid gap-x-10 gap-y-8 md:grid-cols-2">
          {faqSections.map((section, sectionIndex) => (
            <motion.section
              key={section.title}
              className={`faq-focus-section ${sectionIndex === 0 ? "" : "border-t border-white/35 pt-6"} ${sectionIndex === 1 ? "md:border-t-0 md:pt-0" : ""}`}
              variants={revealItem}
            >
              <motion.h3
                className="font-righteous bloom-section-kicker mb-2 px-2 text-base font-bold uppercase tracking-wide sm:text-lg md:text-xl"
                variants={questionReveal}
              >
                {section.title}
              </motion.h3>
              <Accordion type="single" collapsible className="w-full">
                {section.items.map((item, itemIndex) => (
                  <motion.div key={item.question} variants={questionReveal}>
                    <AccordionItem
                      value={`section-${sectionIndex + 1}-item-${itemIndex + 1}`}
                      className="faq-item relative overflow-hidden"
                    >
                      <span className="faq-open-sparks" aria-hidden="true">
                        {sparkNames.map((sparkName) => (
                          <span
                            key={sparkName}
                            className={`faq-spark faq-spark-${sparkName}`}
                          />
                        ))}
                      </span>
                      <AccordionTrigger className="font-righteous wc-ink-text w-full rounded-xl px-3 py-3 text-left text-sm font-bold uppercase tracking-wide transition-colors duration-300 hover:text-[#7a4a1e] sm:px-4 sm:py-4 sm:text-base md:text-lg">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="faq-content font-dm-sans wc-ink-soft text-xs sm:text-sm md:text-base">
                        <div className="faq-answer-body px-3 pb-4 pt-1 sm:px-4 sm:pb-5">
                          {item.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.section>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FAQ;
