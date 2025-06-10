"use client";

import { motion } from "framer-motion";

const aboutWords =
  "Gemiknights is a 12-hour hackathon focused on building with AI. Participants will get access to Google's Gemini to help bring their ideas to life, whether that means coding tools, training models, or experimenting with new ways to create. It's fast and focused, and it's all about turning bold ideas into working projects, no matter your experience level. It will take place on UCF campus, at BA1 107. In order to participate, you must be a UCF student.";

const About = () => {
  return (
    <motion.div
      id="about"
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <span className="tk-forma-djr-display mb-6 text-center text-3xl font-bold sm:mb-8 sm:text-4xl md:mb-10 md:text-5xl">
        About
      </span>
      <span className="tk-peridot-devanagari mt-2 max-w-[90%] px-4 text-center text-lg font-semibold sm:mt-3 sm:max-w-[80%] sm:px-6 sm:text-xl md:mt-4 md:max-w-5xl md:px-8 md:text-2xl">
        {aboutWords}
      </span>
    </motion.div>
  );
};

export default About;
