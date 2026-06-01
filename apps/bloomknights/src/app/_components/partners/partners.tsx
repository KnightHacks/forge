"use client";

import type { Variants } from "framer-motion";
import type { CSSProperties } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { partnerLogos } from "./partnerLogos";

const bloomPositions = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
] as const;

type LeafStyle = CSSProperties & Record<`--${string}`, string>;

interface Leaf {
  className: string;
  style: LeafStyle;
}

const partnerLeaves: Leaf[] = [
  {
    className: "partner-leaf",
    style: {
      "--leaf-top": "12%",
      "--leaf-size": "1.2rem",
      "--leaf-scale": "1",
      "--leaf-duration": "17s",
      "--leaf-delay": "-8s",
      "--leaf-start-y": "0px",
      "--leaf-mid-y": "26px",
      "--leaf-end-y": "-18px",
      "--leaf-rotate-start": "-28deg",
      "--leaf-rotate-mid": "132deg",
      "--leaf-rotate-end": "294deg",
      "--leaf-opacity": "0.72",
    },
  },
  {
    className: "partner-leaf partner-leaf-gold",
    style: {
      "--leaf-top": "34%",
      "--leaf-size": "0.95rem",
      "--leaf-scale": "0.84",
      "--leaf-duration": "21s",
      "--leaf-delay": "-14s",
      "--leaf-start-y": "18px",
      "--leaf-mid-y": "-20px",
      "--leaf-end-y": "32px",
      "--leaf-rotate-start": "18deg",
      "--leaf-rotate-mid": "196deg",
      "--leaf-rotate-end": "348deg",
      "--leaf-opacity": "0.66",
    },
  },
  {
    className: "partner-leaf partner-leaf-pale",
    style: {
      "--leaf-top": "57%",
      "--leaf-size": "1.35rem",
      "--leaf-scale": "1.08",
      "--leaf-duration": "24s",
      "--leaf-delay": "-3s",
      "--leaf-start-y": "-16px",
      "--leaf-mid-y": "18px",
      "--leaf-end-y": "-30px",
      "--leaf-rotate-start": "-62deg",
      "--leaf-rotate-mid": "84deg",
      "--leaf-rotate-end": "252deg",
      "--leaf-opacity": "0.68",
    },
  },
  {
    className: "partner-leaf",
    style: {
      "--leaf-top": "76%",
      "--leaf-size": "0.82rem",
      "--leaf-scale": "0.74",
      "--leaf-duration": "19s",
      "--leaf-delay": "-17s",
      "--leaf-start-y": "12px",
      "--leaf-mid-y": "-26px",
      "--leaf-end-y": "14px",
      "--leaf-rotate-start": "42deg",
      "--leaf-rotate-mid": "228deg",
      "--leaf-rotate-end": "390deg",
      "--leaf-opacity": "0.62",
    },
  },
  {
    className: "partner-leaf partner-leaf-gold",
    style: {
      "--leaf-top": "24%",
      "--leaf-size": "1.05rem",
      "--leaf-scale": "0.92",
      "--leaf-duration": "26s",
      "--leaf-delay": "-22s",
      "--leaf-start-y": "-8px",
      "--leaf-mid-y": "34px",
      "--leaf-end-y": "-12px",
      "--leaf-rotate-start": "-12deg",
      "--leaf-rotate-mid": "164deg",
      "--leaf-rotate-end": "320deg",
      "--leaf-opacity": "0.6",
    },
  },
  {
    className: "partner-leaf partner-leaf-pale",
    style: {
      "--leaf-top": "68%",
      "--leaf-size": "1.15rem",
      "--leaf-scale": "0.9",
      "--leaf-duration": "22s",
      "--leaf-delay": "-11s",
      "--leaf-start-y": "24px",
      "--leaf-mid-y": "-12px",
      "--leaf-end-y": "28px",
      "--leaf-rotate-start": "64deg",
      "--leaf-rotate-mid": "212deg",
      "--leaf-rotate-end": "374deg",
      "--leaf-opacity": "0.62",
    },
  },
  {
    className: "partner-leaf",
    style: {
      "--leaf-top": "44%",
      "--leaf-size": "1.25rem",
      "--leaf-scale": "0.98",
      "--leaf-duration": "23s",
      "--leaf-delay": "-19s",
      "--leaf-start-y": "-22px",
      "--leaf-mid-y": "16px",
      "--leaf-end-y": "-24px",
      "--leaf-rotate-start": "-48deg",
      "--leaf-rotate-mid": "118deg",
      "--leaf-rotate-end": "286deg",
      "--leaf-opacity": "0.68",
    },
  },
  {
    className: "partner-leaf partner-leaf-gold",
    style: {
      "--leaf-top": "86%",
      "--leaf-size": "1rem",
      "--leaf-scale": "0.82",
      "--leaf-duration": "28s",
      "--leaf-delay": "-6s",
      "--leaf-start-y": "10px",
      "--leaf-mid-y": "-18px",
      "--leaf-end-y": "20px",
      "--leaf-rotate-start": "26deg",
      "--leaf-rotate-mid": "186deg",
      "--leaf-rotate-end": "356deg",
      "--leaf-opacity": "0.58",
    },
  },
  {
    className: "partner-leaf partner-leaf-pale",
    style: {
      "--leaf-top": "18%",
      "--leaf-size": "0.9rem",
      "--leaf-scale": "0.78",
      "--leaf-duration": "18s",
      "--leaf-delay": "-1s",
      "--leaf-start-y": "20px",
      "--leaf-mid-y": "-14px",
      "--leaf-end-y": "26px",
      "--leaf-rotate-start": "74deg",
      "--leaf-rotate-mid": "244deg",
      "--leaf-rotate-end": "414deg",
      "--leaf-opacity": "0.56",
    },
  },
];

const revealEase = [0.22, 1, 0.36, 1] as const;

const sectionReveal: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.76,
      ease: revealEase,
    },
  },
};

const Partners = () => {
  return (
    <motion.div
      id="partners"
      className="relative isolate flex w-full scroll-mt-24 flex-col items-center justify-center gap-2 overflow-visible px-4 sm:scroll-mt-32 sm:gap-3 sm:px-6 md:min-h-[82vh] md:gap-4 md:px-8"
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="partner-leaf-field" aria-hidden="true">
        {partnerLeaves.map((leaf, index) => (
          <span key={index} className={leaf.className} style={leaf.style} />
        ))}
      </div>

      <motion.div className="relative z-10" variants={revealItem}>
        <h2 className="spring-heading animate-float-bob-slow mb-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          PARTNERS
        </h2>
      </motion.div>

      <div className="xs:max-w-[90%] xs:grid-cols-2 relative z-10 grid w-full max-w-[95%] grid-cols-1 gap-x-8 gap-y-8 py-8 sm:max-w-[85%] sm:gap-x-10 sm:gap-y-10 md:max-w-[80%] md:grid-cols-2 md:py-10 lg:max-w-6xl lg:grid-cols-4">
        {partnerLogos.map((LogoPair) => (
          <motion.div
            key={LogoPair.name}
            variants={revealItem}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href={LogoPair.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${LogoPair.name} partner website`}
              className="partner-link group block rounded-2xl"
            >
              <div className="partner-card relative flex min-h-24 w-full items-center justify-center overflow-visible px-4 py-6 sm:min-h-28 sm:px-6 md:px-8 lg:px-10">
                <div className="partner-bloom-border" aria-hidden="true">
                  {bloomPositions.map((position) => (
                    <span
                      key={position}
                      className={`partner-bloom partner-bloom-${position}`}
                    />
                  ))}
                </div>
                <div className="partner-logo-focus" aria-hidden="true" />
                <div className="xs:h-16 relative z-10 h-12 w-full sm:h-20 md:h-24 lg:h-28">
                  <LogoPair.white
                    aria-hidden="true"
                    focusable="false"
                    className="partner-logo-mark pointer-events-none absolute inset-0 h-full w-full opacity-100 transition-opacity duration-200 group-hover:opacity-0"
                    width="100%"
                    height="100%"
                  />
                  <LogoPair.color
                    aria-hidden="true"
                    focusable="false"
                    className="partner-logo-mark partner-logo-mark-color pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    width="100%"
                    height="100%"
                  />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Partners;
