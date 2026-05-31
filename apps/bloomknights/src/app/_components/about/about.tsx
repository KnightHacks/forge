"use client";

import type { Variants } from "framer-motion";
import Image from "next/image";
import { motion } from "framer-motion";

const aboutCopy = [
  "BloomKnights is a 12-hour student hackathon in Orlando, Florida, hosted by Knight Hacks at the University of Central Florida. On July 11, 2026, UCF students will spend the day building software projects, learning new skills, attending workshops, meeting mentors, and collaborating with other hackers.",
  "Whether you are new to hackathons or already shipping projects, BloomKnights is designed to be a fast, beginner-friendly way to create something real in one day. The event takes place on UCF campus at BA1, and participation is free for UCF students.",
  "BloomKnights connects the energy of a Florida hackathon with the support of Knight Hacks, UCF's software development and hackathon organization. Bring a laptop, a charger, and an idea you want to explore.",
];

const aboutImages = [
  {
    src: "https://assets.knighthacks.org/GemiKnight1.jpg",
    alt: "GemiKnight event scene",
  },
  {
    src: "https://assets.knighthacks.org/GemiKnight2.jpg",
    alt: "GemiKnight workshop scene",
  },
];

const revealEase = [0.22, 1, 0.36, 1] as const;

const sectionReveal: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
};

const focusPanelReveal: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.08,
    },
  },
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: revealEase,
    },
  },
};

const About = () => {
  return (
    <motion.div
      id="about"
      className="flex w-full scroll-mt-32 flex-col items-center justify-center px-6 md:px-12 lg:px-32"
      variants={sectionReveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.16, margin: "0px 0px 18% 0px" }}
    >
      <motion.div variants={revealItem}>
        <h2 className="spring-heading animate-float-bob mb-8 text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          ABOUT
        </h2>
      </motion.div>
      <motion.div
        className="bloom-focus-field bloom-focus-field-wide w-full px-0 py-6 sm:py-8 md:py-10"
        variants={focusPanelReveal}
      >
        <motion.div className="about-story-layout" variants={revealItem}>
          <div className="about-copy-stack">
            {aboutCopy.map((paragraph) => (
              <motion.p
                key={paragraph}
                className="font-dm-sans bloom-focus-copy text-center text-base font-semibold leading-relaxed sm:text-lg md:text-xl"
                variants={revealItem}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
          <motion.div
            className="about-gemiknight-gallery"
            variants={revealItem}
          >
            <span
              className="about-gallery-bloom about-gallery-bloom-top-right"
              aria-hidden="true"
            />
            <span
              className="about-gallery-bloom about-gallery-bloom-bottom-left"
              aria-hidden="true"
            />
            <span
              className="about-gallery-bloom about-gallery-bloom-bottom"
              aria-hidden="true"
            />
            {aboutImages.map((image, imageIndex) => (
              <motion.figure
                key={image.src}
                className={`about-gemiknight-frame ${
                  imageIndex === 0
                    ? "about-gemiknight-frame-primary"
                    : "about-gemiknight-frame-secondary"
                }`}
                variants={revealItem}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={6000}
                  height={4000}
                  sizes={
                    imageIndex === 0
                      ? "(min-width: 1181px) 464px, (min-width: 768px) 520px, 82vw"
                      : "(min-width: 1181px) 320px, (min-width: 768px) 360px, 62vw"
                  }
                  quality={72}
                  className="about-gemiknight-image"
                />
              </motion.figure>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default About;
