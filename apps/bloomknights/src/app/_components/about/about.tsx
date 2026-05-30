"use client";

import { motion } from "framer-motion";

const aboutWords =
  "BloomKnights is a 12-hour hackathon hosted by Knight Hacks at the University of Central Florida. Whether you're writing your first line of code or shipping your tenth project, BloomKnights is your day to build something bold. Dive in, experiment freely, and turn a raw idea into a working project — all in one day. The event takes place on UCF campus at BA1. Participation is open to all UCF students, no experience required.";

const About = () => {
  return (
    <motion.div
      id="about"
      className="flex scroll-mt-32 flex-col items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <span className="spring-heading animate-float-bob mb-6 text-center text-4xl sm:mb-8 sm:text-5xl md:mb-10 md:text-6xl lg:text-7xl">
        ABOUT
      </span>
      <span className="font-nunito mt-2 max-w-[90%] px-4 text-center text-base font-semibold text-white/90 sm:mt-3 sm:max-w-[80%] sm:px-6 sm:text-lg md:mt-4 md:max-w-5xl md:px-8 md:text-xl lg:text-2xl">
        {aboutWords}
      </span>
    </motion.div>
  );
};

export default About;
