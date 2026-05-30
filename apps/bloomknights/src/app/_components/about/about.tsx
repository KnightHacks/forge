"use client";

import { motion } from "framer-motion";

const aboutWords =
  "BloomKnights is a 12-hour hackathon hosted by Knight Hacks at the University of Central Florida. Whether you're writing your first line of code or shipping your tenth project, BloomKnights is your day to build something bold. Dive in, experiment freely, and turn a raw idea into a working project — all in one day. The event takes place on UCF campus at BA1. Participation is open to all UCF students, no experience required.";

const About = () => {
  return (
    <motion.div
      id="about"
      className="flex w-full scroll-mt-32 flex-col items-center justify-center px-4"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <span className="spring-heading animate-float-bob mb-8 text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
        ABOUT
      </span>
      <div className="wc-panel w-full max-w-[90%] px-6 py-8 sm:max-w-[80%] sm:px-10 sm:py-10 md:max-w-4xl md:px-14 md:py-12">
        <p className="font-dm-sans wc-ink-text text-center text-base font-medium leading-relaxed sm:text-lg md:text-xl lg:text-2xl">
          {aboutWords}
        </p>
      </div>
    </motion.div>
  );
};

export default About;
